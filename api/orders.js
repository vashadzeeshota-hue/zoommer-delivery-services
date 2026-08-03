import { getSql } from "../server/db.js";
import { createHash, randomUUID } from "node:crypto";
import {
  buildDeliveryPromise,
  DELIVERY_SERVICES,
  normalizeDeliveryService,
} from "../server/delivery-service.js";
import { errorResponse, getRequestId, json } from "../server/http.js";
import { getActor, hasPermission } from "../server/rbac.js";
import { isSameOriginRequest } from "../server/auth.js";

const packageSizeLabels = {
  small: "პატარა",
  medium: "საშუალო",
  large: "დიდი",
};
const packageSizes = new Set(Object.keys(packageSizeLabels));
const editableOrderStatuses = new Set(["new", "assigned", "transit", "completed", "exception"]);

function nextTbilisiDate() {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tbilisi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date()).map((part) => [part.type, part.value]));
  const date = new Date(`${parts.year}-${parts.month}-${parts.day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

function packageSizeFor(row) {
  if (packageSizeLabels[row.dimensions_text]) return row.dimensions_text;
  const weight = Number(row.weight_kg);
  if (weight <= 1) return "small";
  if (weight <= 3) return "medium";
  return "large";
}

function mapOrder(row) {
  const packageSize = packageSizeFor(row);
  const location = row.metadata?.location || {};
  const printing = row.metadata?.printing || {};
  const latitude = Number(location.lat);
  const longitude = Number(location.lng);
  return {
    id: row.external_order_id,
    databaseId: row.id,
    customer: row.recipient_name,
    phone: row.recipient_phone,
    city: row.city,
    address: row.address,
    postalCode: location.postalCode || null,
    latitude: Number.isFinite(latitude) ? latitude : null,
    longitude: Number.isFinite(longitude) ? longitude : null,
    labelStatus: printing.status || "pending",
    labelPrintedAt: printing.printedAt || null,
    source: row.source,
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
    sizeCode: packageSize,
    size: packageSizeLabels[packageSize],
    payment: "მიწოდება გადახდილია",
    orderPrice: `${Number(row.total_price || 0).toFixed(2)} ₾`,
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
  source,
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
  total_price,
  partner_team,
  metadata,
  created_at
`;

export default {
  async fetch(request) {
    const requestId = getRequestId(request);

    try {
      const sql = getSql();

      if (request.method === "GET") {
        const actor = await getActor(request);
        if (!hasPermission(actor, "orders:read")) {
          return errorResponse("AUTH_REQUIRED", "Authentication required", 401, requestId);
        }
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

      if (request.method === "POST") {
        if (!isSameOriginRequest(request)) {
          return errorResponse("INVALID_ORIGIN", "Request origin is not allowed", 403, requestId);
        }
        const actor = await getActor(request);
        if (!hasPermission(actor, "orders:create")) {
          return errorResponse(
            "AUTH_REQUIRED",
            "Creating an order requires an authenticated employee",
            401,
            requestId,
          );
        }

        const body = await request.json();
        const recipientName = String(body.recipientName || "").trim();
        const recipientPhone = String(body.recipientPhone || "").trim();
        const city = String(body.city || "").trim();
        const address = String(body.address || "").trim();
        const postalCode = String(body.postalCode || "").trim().slice(0, 24);
        const latitude = body.latitude == null ? null : Number(body.latitude);
        const longitude = body.longitude == null ? null : Number(body.longitude);
        const hasLocation = latitude != null || longitude != null;
        const weightKg = Number(body.weightKg);
        const packageSize = String(body.packageSize || body.dimensionsText || "").trim();
        const orderPrice = Number(body.orderPrice);
        const service = String(body.service || "").trim();
        const providerCode = String(body.providerCode || "").trim();

        if (
          recipientName.length < 2 ||
          recipientPhone.length < 5 ||
          city.length < 2 ||
          address.length < 3 ||
          (hasLocation && (
            !Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
            !Number.isFinite(longitude) || longitude < -180 || longitude > 180
          )) ||
          !Number.isFinite(weightKg) ||
          weightKg <= 0 ||
          weightKg > 1000 ||
          !packageSizes.has(packageSize) ||
          !Number.isFinite(orderPrice) ||
          orderPrice < 0 ||
          !DELIVERY_SERVICES.has(service)
        ) {
          return errorResponse(
            "INVALID_ORDER",
            "Recipient, address, package, payment and service fields are invalid",
            400,
            requestId,
          );
        }

        let deliveryPromise;
        try {
          deliveryPromise = buildDeliveryPromise({
            service,
            providerCode,
            receivedAt: new Date(),
            scheduledDate: String(body.scheduledDate || ""),
            windowStart: String(body.windowStart || ""),
            windowEnd: String(body.windowEnd || ""),
          });
        } catch (error) {
          return errorResponse(
            error.message,
            "Delivery service configuration is invalid",
            400,
            requestId,
          );
        }

        const idempotencyKey =
          request.headers.get("idempotency-key") || randomUUID();
        const dateParts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
          timeZone: "Asia/Tbilisi",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        })
          .formatToParts(new Date())
          .map((part) => [part.type, part.value]));
        const datePart = `${dateParts.year}${dateParts.month}${dateParts.day}`;
        const hashPart = createHash("sha256")
          .update(idempotencyKey)
          .digest("hex")
          .slice(0, 8)
          .toUpperCase();
        const externalOrderId = `MAN-${datePart}-${hashPart}`;
        const metadata = JSON.stringify({
          createdManually: true,
          createdBy: actor.name,
          idempotencyKey,
          packageSize,
          location: hasLocation ? { lat: latitude, lng: longitude, postalCode } : null,
        });

        const rows = await sql`
          with saved_order as (
            insert into delivery_orders (
              external_order_id,
              source,
              recipient_name,
              recipient_phone,
              city,
              address,
              requested_service,
              service_variant,
              selected_carrier_code,
              delivery_date_from,
              delivery_date_to,
              scheduled_date,
              scheduled_window_start,
              scheduled_window_end,
              cutoff_evaluated_at,
              status,
              weight_kg,
              dimensions_text,
              payment_method,
              cod_amount,
              total_price,
              metadata
            ) values (
              ${externalOrderId},
              'manual',
              ${recipientName},
              ${recipientPhone},
              ${city},
              ${address},
              ${service},
              ${deliveryPromise.variant},
              ${deliveryPromise.providerCode},
              ${deliveryPromise.deliveryDateFrom},
              ${deliveryPromise.deliveryDateTo},
              ${deliveryPromise.scheduledDate},
              ${deliveryPromise.windowStart},
              ${deliveryPromise.windowEnd},
              now(),
              'new',
              ${weightKg},
              ${packageSize},
              'prepaid',
              0,
              ${orderPrice},
              ${metadata}::jsonb
            )
            on conflict (external_order_id) do update set
              updated_at = delivery_orders.updated_at
            returning *
          ),
          order_event_record as (
            insert into order_events (order_id, event_type, message, actor_name)
            select
              id,
              'manual_order_created',
              'Order created manually by an employee',
              ${actor.name}
            from saved_order
            where not exists (
              select 1
              from order_events
              where order_id = saved_order.id
                and event_type = 'manual_order_created'
            )
          )
          select
            id,
            external_order_id,
            source,
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
            total_price,
            partner_team,
            metadata,
            created_at
          from saved_order
        `;

        return json(
          { ok: true, order: mapOrder(rows[0]) },
          201,
          { "X-Request-Id": requestId },
        );
      }

      if (request.method === "PATCH") {
        if (!isSameOriginRequest(request)) {
          return errorResponse("INVALID_ORIGIN", "Request origin is not allowed", 403, requestId);
        }
        const actor = await getActor(request);
        if (!hasPermission(actor, "shipments:register")) {
          return errorResponse(
            "AUTH_REQUIRED",
            "Registration requires an authenticated operator",
            401,
            requestId,
          );
        }

        const body = await request.json();

        if (body.action === "update_fields") {
          if (!hasPermission(actor, "orders:edit")) {
            return errorResponse(
              "FORBIDDEN",
              "Editing an order requires operator permissions",
              403,
              requestId,
            );
          }

          const orderId = String(body.orderId || "").trim();
          const city = String(body.city || "").trim().slice(0, 120);
          const address = String(body.address || "").trim().slice(0, 320);
          const service = String(body.service || "").trim();
          const status = String(body.status || "").trim();

          if (
            !orderId ||
            city.length < 2 ||
            address.length < 3 ||
            !DELIVERY_SERVICES.has(service) ||
            !editableOrderStatuses.has(status)
          ) {
            return errorResponse(
              "INVALID_ORDER_UPDATE",
              "Destination, delivery service and status are required",
              400,
              requestId,
            );
          }

          const sourceRows = await sql`
            select
              id,
              created_at,
              selected_carrier_code,
              scheduled_date::text as scheduled_date,
              scheduled_window_start,
              scheduled_window_end
            from delivery_orders
            where external_order_id = ${orderId}
            limit 1
          `;

          if (!sourceRows.length) {
            return errorResponse("ORDER_NOT_FOUND", "Order was not found", 404, requestId);
          }

          const source = sourceRows[0];
          const standardProvider = ["georgian_post", "fedex_tnt"].includes(body.providerCode)
            ? body.providerCode
            : ["georgian_post", "fedex_tnt"].includes(source.selected_carrier_code)
              ? source.selected_carrier_code
              : "georgian_post";
          const scheduledDate = String(body.scheduledDate || source.scheduled_date || "");
          const validScheduledDate = scheduledDate >= nextTbilisiDate() ? scheduledDate : nextTbilisiDate();
          const windowStart = String(body.windowStart || source.scheduled_window_start || "12:00").slice(0, 5);
          const windowEnd = String(body.windowEnd || source.scheduled_window_end || "15:00").slice(0, 5);
          const deliveryPromise = buildDeliveryPromise({
            service,
            providerCode: service === "standard" ? standardProvider : service === "fast" ? "quickshipper" : "internal",
            receivedAt: source.created_at,
            scheduledDate: service === "scheduled" ? validScheduledDate : "",
            windowStart: service === "scheduled" ? windowStart : "",
            windowEnd: service === "scheduled" ? windowEnd : "",
          });

          const rows = await sql`
            with updated_order as (
              update delivery_orders
              set
                city = ${city},
                address = ${address},
                requested_service = ${service},
                assigned_service = ${service},
                service_variant = ${deliveryPromise.variant},
                selected_carrier_code = ${deliveryPromise.providerCode},
                delivery_date_from = ${deliveryPromise.deliveryDateFrom},
                delivery_date_to = ${deliveryPromise.deliveryDateTo},
                scheduled_date = ${deliveryPromise.scheduledDate},
                scheduled_window_start = ${deliveryPromise.windowStart},
                scheduled_window_end = ${deliveryPromise.windowEnd},
                cutoff_evaluated_at = now(),
                partner_team = ${deliveryPromise.providerName},
                status = ${status},
                updated_at = now()
              where external_order_id = ${orderId}
              returning *
            ),
            order_event_record as (
              insert into order_events (order_id, event_type, message, actor_name)
              select
                id,
                'order_fields_updated',
                ${`${city} • ${deliveryPromise.label} • ${status}`},
                ${actor.name}
              from updated_order
            )
            select * from updated_order
          `;

          return json(
            { ok: true, order: mapOrder(rows[0]) },
            200,
            { "X-Request-Id": requestId },
          );
        }

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
