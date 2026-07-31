import { getSql } from "../../server/db.js";
import { errorResponse, getRequestId, json } from "../../server/http.js";
import { listImplementedAdapters } from "../../server/carriers/registry.js";
import { normalizeDeliveryService } from "../../server/delivery-service.js";

const packageSizeLabels = {
  small: "პატარა",
  medium: "საშუალო",
  large: "დიდი",
};

function packageSizeFor(row) {
  if (packageSizeLabels[row.dimensions_text]) return row.dimensions_text;
  const weight = Number(row.weight_kg);
  if (weight <= 1) return "small";
  if (weight <= 3) return "medium";
  return "large";
}

function toNumber(value) {
  return Number(value || 0);
}

function mapOrder(row) {
  const packageSize = packageSizeFor(row);
  return {
    id: row.external_order_id,
    customer: row.recipient_name,
    phone: row.recipient_phone,
    city: row.city,
    address: row.address,
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

export default {
  async fetch(request) {
    const requestId = getRequestId(request);

    if (request.method !== "GET") {
      return errorResponse(
        "METHOD_NOT_ALLOWED",
        "Method not allowed",
        405,
        requestId,
      );
    }

    try {
      const sql = getSql();
      const [
        orders,
        summaryRows,
        carriers,
        couriers,
        shipments,
        outboxRows,
      ] = await Promise.all([
        sql`
          select
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
            created_at
          from delivery_orders
          order by created_at desc
          limit 100
        `,
        sql`
          select
            count(*) filter (where status = 'new') as new_count,
            count(*) filter (where status = 'assigned') as assigned_count,
            count(*) filter (where status = 'transit') as transit_count,
            count(*) filter (where status = 'completed') as completed_count,
            count(*) filter (where status = 'exception') as exception_count
          from delivery_orders
        `,
        sql`
          select code, name, category, status, capabilities, last_sync_at
          from carriers
          order by
            case code
              when 'georgian_post' then 1
              when 'fedex_tnt' then 2
              when 'quickshipper' then 3
              else 4
            end
        `,
        sql`
          select
            id,
            employee_code,
            full_name,
            phone,
            city,
            vehicle_type,
            status,
            current_lat,
            current_lng,
            active_assignments,
            delivered_today,
            last_location_at
          from couriers
          order by city, full_name
        `,
        sql`
          select
            s.id,
            o.external_order_id as order_id,
            s.carrier_code,
            c.name as carrier_name,
            s.service_code,
            s.tracking_code,
            s.status,
            s.label_status,
            s.created_at,
            s.updated_at
          from shipments s
          join delivery_orders o on o.id = s.order_id
          join carriers c on c.code = s.carrier_code
          order by s.created_at desc
          limit 50
        `,
        sql`
          select
            count(*) filter (where status in ('pending', 'retry_scheduled')) as pending_count,
            count(*) filter (where status = 'dead_letter') as failed_count,
            count(*) filter (where status = 'succeeded') as succeeded_count
          from outbox_events
        `,
      ]);

      const summary = summaryRows[0] || {};
      const outbox = outboxRows[0] || {};

      return json(
        {
          generatedAt: new Date().toISOString(),
          mode: process.env.ALLOW_DEMO_AUTH === "true" ? "demo-write" : "read-only",
          implementedAdapters: listImplementedAdapters(),
          summary: {
            new: toNumber(summary.new_count),
            assigned: toNumber(summary.assigned_count),
            transit: toNumber(summary.transit_count),
            completed: toNumber(summary.completed_count),
            exception: toNumber(summary.exception_count),
          },
          orders: orders.map(mapOrder),
          carriers: carriers.map((carrier) => ({
            ...carrier,
            lastSyncAt: carrier.last_sync_at,
          })),
          couriers: couriers.map((courier) => ({
            id: courier.id,
            employeeCode: courier.employee_code,
            name: courier.full_name,
            phone: courier.phone,
            city: courier.city,
            vehicle: courier.vehicle_type,
            status: courier.status,
            lat: courier.current_lat ? Number(courier.current_lat) : null,
            lng: courier.current_lng ? Number(courier.current_lng) : null,
            activeAssignments: courier.active_assignments,
            deliveredToday: courier.delivered_today,
            lastLocationAt: courier.last_location_at,
          })),
          shipments: shipments.map((shipment) => ({
            id: shipment.id,
            orderId: shipment.order_id,
            carrierCode: shipment.carrier_code,
            carrierName: shipment.carrier_name,
            service: shipment.service_code,
            trackingCode: shipment.tracking_code,
            status: shipment.status,
            labelStatus: shipment.label_status,
            createdAt: shipment.created_at,
            updatedAt: shipment.updated_at,
          })),
          outbox: {
            pending: toNumber(outbox.pending_count),
            failed: toNumber(outbox.failed_count),
            succeeded: toNumber(outbox.succeeded_count),
          },
        },
        200,
        { "X-Request-Id": requestId },
      );
    } catch (error) {
      console.error("dashboard_api_error", { requestId, message: error.message });
      return errorResponse(
        "SERVICE_UNAVAILABLE",
        "Dashboard data is temporarily unavailable",
        503,
        requestId,
      );
    }
  },
};
