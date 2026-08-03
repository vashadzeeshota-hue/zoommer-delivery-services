alter table app_users
  add column if not exists password_hash text,
  add column if not exists must_change_password boolean not null default true,
  add column if not exists password_changed_at timestamptz;
-- statement-breakpoint

create table if not exists auth_sessions (
  token_hash text primary key,
  user_id uuid not null references app_users(id) on delete cascade,
  expires_at timestamptz not null,
  user_agent text,
  ip_hash text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
-- statement-breakpoint

create index if not exists auth_sessions_user_expires_idx
  on auth_sessions (user_id, expires_at desc);
-- statement-breakpoint

create index if not exists auth_sessions_expires_idx
  on auth_sessions (expires_at);
-- statement-breakpoint

create table if not exists auth_login_attempts (
  id bigint generated always as identity primary key,
  identifier_hash text not null,
  ip_hash text not null,
  succeeded boolean not null default false,
  attempted_at timestamptz not null default now()
);
-- statement-breakpoint

create index if not exists auth_login_attempts_identifier_time_idx
  on auth_login_attempts (identifier_hash, attempted_at desc);
-- statement-breakpoint

create index if not exists auth_login_attempts_ip_time_idx
  on auth_login_attempts (ip_hash, attempted_at desc);
-- statement-breakpoint

alter table shipments
  drop constraint if exists shipments_label_status_check;
-- statement-breakpoint

alter table shipments
  add constraint shipments_label_status_check
    check (label_status in ('pending', 'ready', 'printed', 'failed'));
