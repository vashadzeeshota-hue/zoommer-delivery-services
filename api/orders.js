import { neon } from "@neondatabase/serverless";

const allowedServices = new Set(["postal", "express", "internal"]);

function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function getSql() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }
  return neon(process.env.DATABASE_URL);
}

function mapOrder(row) {
  return {
    id: row.external_order_id,
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
    try {
      const sql = getSql();

      if (request.method === "GET") {
        const rows = await sql`
          select
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
        return json({ orders: rows.map(mapOrder) });
      }

      if (request.method === "PATCH") {
        const body = await request.json();
        const orderId = String(body.orderId || "").trim();
        const service = String(body.service || "").trim();
        const partnerTeam = String(body.partnerTeam || "").trim();

        if (!orderId || !allowedServices.has(service) || !partnerTeam) {
          return json({ error: "Invalid assignment payload" }, 400);
        }

        const rows = await sql`
          update delivery_orders
          set
            assigned_service = ${service},
            partner_team = ${partnerTeam},
            status = 'assigned',
            updated_at = now()
          where external_order_id = ${orderId}
          returning id
        `;

        if (!rows.length) {
          return json({ error: "Order not found" }, 404);
        }

        await sql`
          insert into order_events (order_id, event_type, message, actor_name)
          values (
            ${rows[0].id},
            'assigned',
            ${`Assigned to ${partnerTeam} using ${service}`},
            'Delivery operator'
          )
        `;

        return json({ ok: true });
      }

      return json({ error: "Method not allowed" }, 405);
    } catch (error) {
      console.error("orders_api_error", error);
      return json({ error: "Service temporarily unavailable" }, 503);
    }
  },
};
