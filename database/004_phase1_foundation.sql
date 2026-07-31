create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  external_auth_id text unique,
  email text not null unique,
  full_name text not null,
  phone text,
  role text not null check (role in ('admin', 'operator', 'courier')),
  status text not null default 'active' check (status in ('active', 'invited', 'disabled')),
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- statement-breakpoint

create table if not exists carriers (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code in ('georgian_post', 'fedex_tnt', 'quickshipper', 'internal')),
  name text not null,
  category text not null check (category in ('postal', 'express', 'internal')),
  status text not null default 'setup_required'
    check (status in ('connected', 'degraded', 'offline', 'setup_required')),
  capabilities jsonb not null default '{}'::jsonb,
  last_sync_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- statement-breakpoint

create table if not exists shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references delivery_orders(id) on delete cascade,
  carrier_code text not null references carriers(code),
  service_code text not null,
  external_shipment_id text,
  tracking_code text,
  status text not null default 'registration_pending'
    check (status in (
      'draft', 'registration_pending', 'registered', 'picked_up', 'in_transit',
      'out_for_delivery', 'delivered', 'delivery_failed', 'exception',
      'returned', 'cancelled'
    )),
  idempotency_key text not null unique,
  label_status text not null default 'pending'
    check (label_status in ('pending', 'ready', 'failed')),
  price numeric(12, 2) check (price >= 0),
  metadata jsonb not null default '{}'::jsonb,
  registered_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- statement-breakpoint

create unique index if not exists shipments_carrier_external_idx
  on shipments (carrier_code, external_shipment_id)
  where external_shipment_id is not null;
-- statement-breakpoint

create index if not exists shipments_order_created_idx
  on shipments (order_id, created_at desc);
-- statement-breakpoint

create index if not exists shipments_status_updated_idx
  on shipments (status, updated_at desc);
-- statement-breakpoint

create table if not exists tracking_events (
  id bigint generated always as identity primary key,
  shipment_id uuid not null references shipments(id) on delete cascade,
  provider_event_id text,
  provider_status text not null,
  canonical_status text not null,
  description text,
  event_at timestamptz not null,
  raw_payload jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now()
);
-- statement-breakpoint

create unique index if not exists tracking_events_provider_event_idx
  on tracking_events (shipment_id, provider_event_id)
  where provider_event_id is not null;
-- statement-breakpoint

create index if not exists tracking_events_shipment_time_idx
  on tracking_events (shipment_id, event_at desc);
-- statement-breakpoint

create table if not exists couriers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references app_users(id) on delete set null,
  employee_code text not null unique,
  full_name text not null,
  phone text not null,
  city text not null,
  vehicle_type text not null default 'car'
    check (vehicle_type in ('car', 'bike', 'scooter', 'foot')),
  status text not null default 'offline'
    check (status in ('available', 'busy', 'break', 'offline')),
  current_lat numeric(9, 6),
  current_lng numeric(9, 6),
  active_assignments integer not null default 0 check (active_assignments >= 0),
  delivered_today integer not null default 0 check (delivered_today >= 0),
  last_location_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- statement-breakpoint

create index if not exists couriers_city_status_idx
  on couriers (city, status);
-- statement-breakpoint

create table if not exists delivery_assignments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references delivery_orders(id) on delete cascade,
  shipment_id uuid references shipments(id) on delete cascade,
  courier_id uuid not null references couriers(id),
  status text not null default 'assigned'
    check (status in ('assigned', 'accepted', 'picked_up', 'in_progress', 'delivered', 'failed', 'cancelled')),
  sequence_no integer,
  assigned_by uuid references app_users(id) on delete set null,
  assigned_at timestamptz not null default now(),
  accepted_at timestamptz,
  completed_at timestamptz,
  failure_reason text
);
-- statement-breakpoint

create unique index if not exists delivery_assignments_active_order_idx
  on delivery_assignments (order_id)
  where status in ('assigned', 'accepted', 'picked_up', 'in_progress');
-- statement-breakpoint

create index if not exists delivery_assignments_courier_status_idx
  on delivery_assignments (courier_id, status, assigned_at desc);
-- statement-breakpoint

create table if not exists outbox_events (
  id uuid primary key default gen_random_uuid(),
  aggregate_type text not null,
  aggregate_id uuid not null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'succeeded', 'retry_scheduled', 'dead_letter')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  available_at timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  processed_at timestamptz,
  last_error text,
  created_at timestamptz not null default now()
);
-- statement-breakpoint

create index if not exists outbox_events_ready_idx
  on outbox_events (available_at, created_at)
  where status in ('pending', 'retry_scheduled');
-- statement-breakpoint

create table if not exists audit_logs (
  id bigint generated always as identity primary key,
  actor_user_id uuid references app_users(id) on delete set null,
  actor_type text not null check (actor_type in ('user', 'system', 'integration')),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  correlation_id text not null,
  created_at timestamptz not null default now()
);
-- statement-breakpoint

create index if not exists audit_logs_entity_created_idx
  on audit_logs (entity_type, entity_id, created_at desc);

