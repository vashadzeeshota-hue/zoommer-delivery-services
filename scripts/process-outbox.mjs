import { neon } from "@neondatabase/serverless";
import { getCarrierAdapter } from "../server/carriers/registry.js";
import { CarrierIntegrationError } from "../server/carriers/contract.js";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const sql = neon(databaseUrl);
const workerId = `worker-${process.pid}`;
const batchSize = Number(process.env.OUTBOX_BATCH_SIZE || 20);

const jobs = await sql`
  with candidates as (
    select id
    from outbox_events
    where status in ('pending', 'retry_scheduled')
      and available_at <= now()
    order by available_at, created_at
    for update skip locked
    limit ${batchSize}
  )
  update outbox_events event
  set
    status = 'processing',
    locked_at = now(),
    locked_by = ${workerId},
    attempt_count = event.attempt_count + 1
  from candidates
  where event.id = candidates.id
  returning event.*
`;

for (const job of jobs) {
  try {
    if (job.event_type !== "carrier.shipment.create_requested") {
      throw new CarrierIntegrationError(`Unsupported event: ${job.event_type}`, {
        code: "UNSUPPORTED_OUTBOX_EVENT",
      });
    }

    const shipmentRows = await sql`
      select
        s.id,
        s.service_code,
        s.carrier_code,
        s.idempotency_key,
        o.external_order_id
      from shipments s
      join delivery_orders o on o.id = s.order_id
      where s.id = ${job.aggregate_id}
      limit 1
    `;

    if (!shipmentRows.length) {
      throw new CarrierIntegrationError("Shipment not found", {
        code: "SHIPMENT_NOT_FOUND",
      });
    }

    const shipment = shipmentRows[0];
    const adapter = getCarrierAdapter(shipment.carrier_code);
    const result = await adapter.createShipment({
      shipmentId: shipment.id,
      merchantOrderId: shipment.external_order_id,
      serviceCode: shipment.service_code,
      sender: {},
      recipient: {},
      packages: [],
    });

    await sql`
      with updated_shipment as (
        update shipments
        set
          external_shipment_id = ${result.externalShipmentId},
          tracking_code = ${result.trackingCode},
          status = ${result.initialStatus},
          registered_at = now(),
          updated_at = now()
        where id = ${shipment.id}
      ),
      tracking_record as (
        insert into tracking_events (
          shipment_id,
          provider_status,
          canonical_status,
          description,
          event_at
        )
        values (
          ${shipment.id},
          ${result.initialStatus},
          ${result.initialStatus},
          'Shipment registered by carrier adapter',
          now()
        )
      )
      update outbox_events
      set
        status = 'succeeded',
        processed_at = now(),
        locked_at = null,
        locked_by = null,
        last_error = null
      where id = ${job.id}
    `;

    console.log(`Processed ${job.id}`);
  } catch (error) {
    const retryable = error instanceof CarrierIntegrationError && error.retryable;
    const attempt = Number(job.attempt_count);
    const retryDelaySeconds = Math.min(3600, 15 * 2 ** attempt);
    const nextStatus = retryable && attempt < 8 ? "retry_scheduled" : "dead_letter";

    await sql`
      update outbox_events
      set
        status = ${nextStatus},
        available_at = now() + (${retryDelaySeconds} * interval '1 second'),
        locked_at = null,
        locked_by = null,
        last_error = ${String(error.message || "Unknown integration error")}
      where id = ${job.id}
    `;

    console.error(`Failed ${job.id}: ${error.message}`);
  }
}

console.log(`Outbox batch complete: ${jobs.length} job(s).`);

