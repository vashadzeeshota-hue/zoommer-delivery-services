create extension if not exists pgcrypto;
-- statement-breakpoint

create table if not exists delivery_orders (
  id uuid primary key default gen_random_uuid(),
  external_order_id text not null unique,
  source text not null default 'zoommer.ge',
  recipient_name text not null,
  recipient_phone text not null,
  city text not null,
  address text not null,
  requested_service text check (requested_service in ('postal', 'express', 'internal')),
  assigned_service text check (assigned_service in ('postal', 'express', 'internal')),
  status text not null default 'new'
    check (status in ('new', 'assigned', 'transit', 'completed', 'exception')),
  weight_kg numeric(8, 2) not null check (weight_kg > 0),
  dimensions_text text not null,
  payment_method text not null default 'prepaid'
    check (payment_method in ('prepaid', 'cod')),
  cod_amount numeric(12, 2) not null default 0 check (cod_amount >= 0),
  partner_team text,
  total_price numeric(12, 2) check (total_price >= 0),
  sla_due_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- statement-breakpoint

create table if not exists order_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references delivery_orders(id) on delete cascade,
  event_type text not null,
  message text not null,
  actor_name text,
  created_at timestamptz not null default now()
);
-- statement-breakpoint

create index if not exists delivery_orders_status_created_idx
  on delivery_orders (status, created_at desc);
-- statement-breakpoint

create index if not exists delivery_orders_active_queue_idx
  on delivery_orders (created_at desc)
  where status in ('new', 'assigned', 'transit', 'exception');
-- statement-breakpoint

create index if not exists order_events_order_id_created_idx
  on order_events (order_id, created_at desc);
