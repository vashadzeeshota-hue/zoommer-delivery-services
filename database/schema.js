import {
  bigint,
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  time,
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
    serviceVariant: text("service_variant"),
    selectedCarrierCode: text("selected_carrier_code").references(
      () => carriers.code,
    ),
    deliveryDateFrom: date("delivery_date_from"),
    deliveryDateTo: date("delivery_date_to"),
    scheduledDate: date("scheduled_date"),
    scheduledWindowStart: time("scheduled_window_start"),
    scheduledWindowEnd: time("scheduled_window_end"),
    cutoffEvaluatedAt: timestamp("cutoff_evaluated_at", { withTimezone: true }),
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

export const appUsers = pgTable(
  "app_users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    externalAuthId: text("external_auth_id").unique(),
    email: text("email").notNull().unique(),
    fullName: text("full_name").notNull(),
    phone: text("phone"),
    role: text("role").notNull(),
    status: text("status").notNull().default("active"),
    passwordHash: text("password_hash"),
    mustChangePassword: boolean("must_change_password").notNull().default(true),
    passwordChangedAt: timestamp("password_changed_at", { withTimezone: true }),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("app_users_role_status_idx").on(table.role, table.status)],
);

export const authSessions = pgTable(
  "auth_sessions",
  {
    tokenHash: text("token_hash").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => appUsers.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    userAgent: text("user_agent"),
    ipHash: text("ip_hash"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("auth_sessions_user_expires_idx").on(table.userId, table.expiresAt),
    index("auth_sessions_expires_idx").on(table.expiresAt),
  ],
);

export const authLoginAttempts = pgTable(
  "auth_login_attempts",
  {
    id: bigint("id", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
    identifierHash: text("identifier_hash").notNull(),
    ipHash: text("ip_hash").notNull(),
    succeeded: boolean("succeeded").notNull().default(false),
    attemptedAt: timestamp("attempted_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("auth_login_attempts_identifier_time_idx").on(table.identifierHash, table.attemptedAt),
    index("auth_login_attempts_ip_time_idx").on(table.ipHash, table.attemptedAt),
  ],
);

export const carriers = pgTable("carriers", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  status: text("status").notNull().default("setup_required"),
  capabilities: jsonb("capabilities").notNull().default({}),
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const shipments = pgTable(
  "shipments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => deliveryOrders.id, { onDelete: "cascade" }),
    carrierCode: text("carrier_code")
      .notNull()
      .references(() => carriers.code),
    serviceCode: text("service_code").notNull(),
    externalShipmentId: text("external_shipment_id"),
    trackingCode: text("tracking_code"),
    status: text("status").notNull().default("registration_pending"),
    idempotencyKey: text("idempotency_key").notNull().unique(),
    labelStatus: text("label_status").notNull().default("pending"),
    price: numeric("price", { precision: 12, scale: 2 }),
    metadata: jsonb("metadata").notNull().default({}),
    registeredAt: timestamp("registered_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("shipments_order_created_idx").on(table.orderId, table.createdAt),
    index("shipments_status_updated_idx").on(table.status, table.updatedAt),
  ],
);

export const trackingEvents = pgTable(
  "tracking_events",
  {
    id: bigint("id", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
    shipmentId: uuid("shipment_id")
      .notNull()
      .references(() => shipments.id, { onDelete: "cascade" }),
    providerEventId: text("provider_event_id"),
    providerStatus: text("provider_status").notNull(),
    canonicalStatus: text("canonical_status").notNull(),
    description: text("description"),
    eventAt: timestamp("event_at", { withTimezone: true }).notNull(),
    rawPayload: jsonb("raw_payload").notNull().default({}),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("tracking_events_shipment_time_idx").on(table.shipmentId, table.eventAt),
  ],
);

export const couriers = pgTable(
  "couriers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => appUsers.id, { onDelete: "set null" }),
    employeeCode: text("employee_code").notNull().unique(),
    fullName: text("full_name").notNull(),
    phone: text("phone").notNull(),
    city: text("city").notNull(),
    vehicleType: text("vehicle_type").notNull().default("car"),
    status: text("status").notNull().default("offline"),
    currentLat: numeric("current_lat", { precision: 9, scale: 6 }),
    currentLng: numeric("current_lng", { precision: 9, scale: 6 }),
    activeAssignments: integer("active_assignments").notNull().default(0),
    deliveredToday: integer("delivered_today").notNull().default(0),
    lastLocationAt: timestamp("last_location_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("couriers_city_status_idx").on(table.city, table.status)],
);

export const deliveryAssignments = pgTable(
  "delivery_assignments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => deliveryOrders.id, { onDelete: "cascade" }),
    shipmentId: uuid("shipment_id").references(() => shipments.id, {
      onDelete: "cascade",
    }),
    courierId: uuid("courier_id")
      .notNull()
      .references(() => couriers.id),
    status: text("status").notNull().default("assigned"),
    sequenceNo: integer("sequence_no"),
    assignedBy: uuid("assigned_by").references(() => appUsers.id, {
      onDelete: "set null",
    }),
    assignedAt: timestamp("assigned_at", { withTimezone: true }).notNull().defaultNow(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    failureReason: text("failure_reason"),
  },
  (table) => [
    index("delivery_assignments_courier_status_idx").on(
      table.courierId,
      table.status,
      table.assignedAt,
    ),
  ],
);

export const outboxEvents = pgTable(
  "outbox_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    aggregateType: text("aggregate_type").notNull(),
    aggregateId: uuid("aggregate_id").notNull(),
    eventType: text("event_type").notNull(),
    payload: jsonb("payload").notNull().default({}),
    status: text("status").notNull().default("pending"),
    attemptCount: integer("attempt_count").notNull().default(0),
    availableAt: timestamp("available_at", { withTimezone: true }).notNull().defaultNow(),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    lockedBy: text("locked_by"),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("outbox_events_status_available_idx").on(table.status, table.availableAt),
  ],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: bigint("id", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
    actorUserId: uuid("actor_user_id").references(() => appUsers.id, {
      onDelete: "set null",
    }),
    actorType: text("actor_type").notNull(),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id"),
    beforeData: jsonb("before_data"),
    afterData: jsonb("after_data"),
    correlationId: text("correlation_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("audit_logs_entity_created_idx").on(
      table.entityType,
      table.entityId,
      table.createdAt,
    ),
  ],
);
