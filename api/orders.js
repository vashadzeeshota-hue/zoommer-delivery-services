import { getSql } from "../server/db.js";
import { errorResponse, getRequestId, json } from "../server/http.js";
import { getActor, hasPermission } from "../server/rbac.js";

const allowedServices = new Set(["postal", "express", "internal"]);
const carrierByService = {
  postal: "georgian_post",
  express: "quickshipper",
  internal: "internal",
};

function mapOrder(row) {
  return {
    id: row.external_order_id,
    databaseId: row.id,
    customer: row.recipient_name,
    phone: row.recipient_phone,
    city: row.city,
    address: row.address,
    service: row.assigned_service || row.requested_service || "postal",
    status: row.status,
    time: new Date(row.created_at).toLocaleTimeString("ka-GE", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Tbilisi",
    }),
    weight: `${Number(row.weight_kg).toFixed(2)} კგ`,
    size: row.dimensions_text,
    payment: row.payment_method === "cod" ? "COD" : "წინასწარ",
    cod: `${Number(row.cod_amount).toFixed(2)} ₾`,
    partnerTeam: row.partner_team,
  };
}

export default {
  async fetch(request) {
    const requestId = getRequestId(request);

    try {
      const sql = getSql();

      if (request.method === "GET") {
        const rows = await sql`
          select
            id,
            external_order_id,
            recipient_name,
            recipient_phone,
            city,
            address,
            requested_service,
            assigned_service,
            status,
            weight_kg,
            dimensions_text,
            payment_method,
            cod_amount,
            partner_team,
            created_at
          from delivery_orders
          order by created_at desc
          limit 100
        `;
        return json(
          { orders: rows.map(mapOrder) },
          200,
          { "X-Request-Id": requestId },
        );
      }

      if (request.method === "PATCH") {
        const actor = getActor(request);
        if (!hasPermission(actor, "shipments:register")) {
          return errorResponse(
            "AUTH_REQUIRED",
            "Registration requires an authenticated operator",
            401,
            requestId,
          );
        }

        const body = await request.json();
        const orderId = String(body.orderId || "").trim();
        const service = String(body.service || "").trim();
        const partnerTeam = String(body.partnerTeam || "").trim();

        if (!orderId || !allowedServices.has(service) || !partnerTeam) {
          return errorResponse(
            "INVALID_ASSIGNMENT",
            "Order, service and partner team are required",
            400,
            requestId,
          );
        }

        const carrierCode = carrierByService[service];
        const idempotencyKey =
          request.headers.get("idempotency-key") || `${orderId}:${service}`;

        const rows = await sql`
          with target_order as (
            update delivery_orders
            set
              assigned_service = ${service},
              partner_team = ${partnerTeam},
              status = 'assigned',
              updated_at = now()
            where external_order_id = ${orderId}
            returning id, external_order_id
          ),
          shipment_record as (
            insert into shipments (
              order_id,
              carrier_code,
              service_code,
              status,
              idempotency_key,
              metadata
            )
            select
              id,
              ${carrierCode},
              ${service},
              'registration_pending',
              ${idempotencyKey},
              jsonb_build_object('partnerTeam', ${partnerTeam})
            from target_order
            on conflict (idempotency_key) do update set
              metadata = excluded.metadata,
              updated_at = now()
            returning id, order_id, status
          ),
          order_event_record as (
            insert into order_events (order_id, event_type, message, actor_name)
            select
              id,
              'registration_queued',
              ${`Registration queued for ${partnerTeam} using ${service}`},
              ${actor.name}
            from target_order
          ),
          outbox_record as (
            insert into outbox_events (
              aggregate_type,
              aggregate_id,
              event_type,
              payload
            )
            select
              'shipment',
              id,
              'carrier.shipment.create_requested',
              jsonb_build_object(
                'shipmentId', id,
                'orderId', order_id,
                'carrierCode', ${carrierCode},
                'serviceCode', ${service}
              )
            from shipment_record
            where not exists (
              select 1
              from outbox_events
              where aggregate_id = shipment_record.id
                and event_type = 'carrier.shipment.create_requested'
                and status in ('pending', 'processing', 'retry_scheduled', 'succeeded')
            )
          )
          select id, status
          from shipment_record
        `;

        if (!rows.length) {
          return errorResponse(
            "ORDER_NOT_FOUND",
            "Order was not found",
            404,
            requestId,
          );
        }

        return json(
          {
            ok: true,
            shipment: {
              id: rows[0].id,
              status: rows[0].status,
              carrierCode,
            },
          },
          202,
          { "X-Request-Id": requestId },
        );
      }

      return errorResponse(
        "METHOD_NOT_ALLOWED",
        "Method not allowed",
        405,
        requestId,
      );
    } catch (error) {
      console.error("orders_api_error", { requestId, message: error.message });
      return errorResponse(
        "SERVICE_UNAVAILABLE",
        "Service temporarily unavailable",
        503,
        requestId,
      );
    }
  },
};

