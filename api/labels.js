import { getSql } from "../server/db.js";
import { errorResponse, getRequestId, json } from "../server/http.js";
import { getActor, hasPermission } from "../server/rbac.js";

const printChannels = new Set(["a5", "zebra"]);

export default {
  async fetch(request) {
    const requestId = getRequestId(request);
    if (request.method !== "PATCH") {
      return errorResponse("METHOD_NOT_ALLOWED", "Method not allowed", 405, requestId);
    }

    const actor = getActor(request);
    if (!hasPermission(actor, "labels:print")) {
      return errorResponse(
        "AUTH_REQUIRED",
        "Printing status requires an authenticated operator",
        401,
        requestId,
      );
    }

    try {
      const body = await request.json();
      const orderId = String(body.orderId || "").trim();
      const channel = String(body.channel || "a5").trim();
      if (!orderId || !printChannels.has(channel)) {
        return errorResponse(
          "INVALID_PRINT_EVENT",
          "Order and a valid print channel are required",
          400,
          requestId,
        );
      }

      const sql = getSql();
      const rows = await sql`
        with target_order as (
          select id, external_order_id
          from delivery_orders
          where external_order_id = ${orderId}
          limit 1
        ),
        updated_order as (
          update delivery_orders
          set
            metadata = jsonb_set(
              coalesce(metadata, '{}'::jsonb),
              '{printing}',
              jsonb_build_object(
                'status', 'printed',
                'printedAt', now(),
                'channel', ${channel},
                'printedBy', ${actor.name}
              ),
              true
            ),
            updated_at = now()
          where id = (select id from target_order)
          returning id, external_order_id, metadata
        ),
        updated_shipments as (
          update shipments
          set
            label_status = 'printed',
            metadata = jsonb_set(
              coalesce(metadata, '{}'::jsonb),
              '{printing}',
              jsonb_build_object(
                'status', 'printed',
                'printedAt', now(),
                'channel', ${channel},
                'printedBy', ${actor.name}
              ),
              true
            ),
            updated_at = now()
          where order_id = (select id from target_order)
          returning id
        ),
        print_event as (
          insert into order_events (order_id, event_type, message, actor_name)
          select id, 'label_printed', ${`Label printed via ${channel}`}, ${actor.name}
          from target_order
          returning id
        )
        select
          external_order_id,
          metadata->'printing' as printing,
          (select count(*) from updated_shipments) as shipment_count
        from updated_order
      `;

      if (!rows.length) {
        return errorResponse("ORDER_NOT_FOUND", "Order was not found", 404, requestId);
      }

      return json(
        {
          ok: true,
          orderId: rows[0].external_order_id,
          labelStatus: "printed",
          printedAt: rows[0].printing?.printedAt || new Date().toISOString(),
          channel,
          updatedShipments: Number(rows[0].shipment_count || 0),
        },
        200,
        { "X-Request-Id": requestId },
      );
    } catch (error) {
      console.error("label_status_update_failed", { requestId, message: error.message });
      return errorResponse(
        "SERVICE_UNAVAILABLE",
        "Printing status could not be saved",
        503,
        requestId,
      );
    }
  },
};
