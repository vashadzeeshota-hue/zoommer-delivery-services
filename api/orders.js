import { getSql } from "../server/db.js";
import {
  buildDeliveryPromise,
  DELIVERY_SERVICES,
  normalizeDeliveryService,
} from "../server/delivery-service.js";
import { errorResponse, getRequestId, json } from "../server/http.js";
import { getActor, hasPermission } from "../server/rbac.js";

function mapOrder(row) {
  return {
    id: row.external_order_id,
    databaseId: row.id,
    customer: row.recipient_name,
    phone: row.recipient_phone,
    city: row.city,
    address: row.address,
    service: normalizeDeliveryService(
      row.assigned_service || row.requested_service,
    ),
    serviceVariant: row.service_variant,
    providerCode: row.selected_carrier_code,
    deliveryDateFrom: row.delivery_date_from,
    deliveryDateTo: row.delivery_date_to,
    scheduledDate: row.scheduled_date,
    windowStart: row.scheduled_window_start?.slice(0, 5) || null,
    windowEnd: row.scheduled_window_end?.slice(0, 5) || null,
    receivedAt: row.created_at,
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

const orderSelection = `
  id,
  external_order_id,
  recipient_name,
  recipient_phone,
  city,
  address,
  requested_service,
  assigned_service,
  service_variant,
  selected_carrier_code,
  delivery_date_from::text as delivery_date_from,
  delivery_date_to::text as delivery_date_to,
  scheduled_date::text as scheduled_date,
  scheduled_window_start,
  scheduled_window_end,
  status,
  weight_kg,
  dimensions_text,
  payment_method,
  cod_amount,
  partner_team,
  created_at
`;

export default {
  async fetch(request) {
    const requestId = getRequestId(request);

    try {
      const sql = getSql();

      if (request.method === "GET") {
        const rows = await sql.query(`
          select ${orderSelection}
          from delivery_orders
          order by created_at desc
          limit 100
        `);
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
        const providerCode = String(body.providerCode || "").trim();

        if (!orderId || !DELIVERY_SERVICES.has(service)) {
          return errorResponse(
            "INVALID_ASSIGNMENT",
            "Order and a valid delivery service are required",
            400,
            requestId,
          );
        }

        const sourceRows = await sql`
          select id, created_at
          from delivery_orders
          where external_order_id = ${orderId}
          limit 1
        `;

        if (!sourceRows.length) {
          return errorResponse(
            "ORDER_NOT_FOUND",
            "Order was not found",
            404,
            requestId,
          );
        }

        let deliveryPromise;
        try {
          deliveryPromise = buildDeliveryPromise({
            service,
            providerCode,
            receivedAt: sourceRows[0].created_at,
            scheduledDate: String(body.scheduledDate || ""),
            windowStart: String(body.windowStart || ""),
            windowEnd: String(body.windowEnd || ""),
          });
        } catch (error) {
          const messages = {
            INVALID_STANDARD_PROVIDER:
              "Standard delivery requires Georgian Post or TNT Express",
            INVALID_SCHEDULE_WINDOW:
              "Scheduled delivery requires a valid date and time window",
          };
          return errorResponse(
            error.message,
            messages[error.message] || "Invalid delivery configuration",
            400,
            requestId,
          );
        }

        const partnerTeam = deliveryPromise.providerName;
        const idempotencyKey =
          request.headers.get("idempotency-key") ||
          [
            orderId,
            service,
            deliveryPromise.providerCode,
            deliveryPromise.deliveryDateFrom,
            deliveryPromise.windowStart || "none",
            deliveryPromise.windowEnd || "none",
          ].join(":");

        const rows = await sql`
          with target_order as (
            update delivery_orders
            set
              assigned_service = ${service},
              service_variant = ${deliveryPromise.variant},
              selected_carrier_code = ${deliveryPromise.providerCode},
              delivery_date_from = ${deliveryPromise.deliveryDateFrom},
              delivery_date_to = ${deliveryPromise.deliveryDateTo},
              scheduled_date = ${deliveryPromise.scheduledDate},
              scheduled_window_start = ${deliveryPromise.windowStart},
              scheduled_window_end = ${deliveryPromise.windowEnd},
              cutoff_evaluated_at = now(),
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
              ${deliveryPromise.providerCode},
              ${service},
              'registration_pending',
              ${idempotencyKey},
              ${JSON.stringify({
                partnerTeam,
                deliveryPromise,
              })}::jsonb
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
              ${`${deliveryPromise.label} — ${partnerTeam}`},
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
                'carrierCode', ${deliveryPromise.providerCode},
                'serviceCode', ${service},
                'deliveryPromise', ${JSON.stringify(deliveryPromise)}::jsonb
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

        return json(
          {
            ok: true,
            deliveryPromise,
            shipment: {
              id: rows[0].id,
              status: rows[0].status,
              carrierCode: deliveryPromise.providerCode,
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
