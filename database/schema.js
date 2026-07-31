import {
  bigint,
  index,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const deliveryOrders = pgTable(
  "delivery_orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    externalOrderId: text("external_order_id").notNull(),
    source: text("source").notNull().default("zoommer.ge"),
    recipientName: text("recipient_name").notNull(),
    recipientPhone: text("recipient_phone").notNull(),
    city: text("city").notNull(),
    address: text("address").notNull(),
    requestedService: text("requested_service"),
    assignedService: text("assigned_service"),
    status: text("status").notNull().default("new"),
    weightKg: numeric("weight_kg", { precision: 8, scale: 2 }).notNull(),
    dimensionsText: text("dimensions_text").notNull(),
    paymentMethod: text("payment_method").notNull().default("prepaid"),
    codAmount: numeric("cod_amount", { precision: 12, scale: 2 }).notNull().default("0"),
    partnerTeam: text("partner_team"),
    totalPrice: numeric("total_price", { precision: 12, scale: 2 }),
    slaDueAt: timestamp("sla_due_at", { withTimezone: true }),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("delivery_orders_external_order_id_idx").on(table.externalOrderId),
    index("delivery_orders_status_created_idx").on(table.status, table.createdAt),
  ],
);

export const orderEvents = pgTable(
  "order_events",
  {
    id: bigint("id", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => deliveryOrders.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    message: text("message").notNull(),
    actorName: text("actor_name"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("order_events_order_id_created_idx").on(table.orderId, table.createdAt)],
);
