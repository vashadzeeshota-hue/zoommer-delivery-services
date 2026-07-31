alter table delivery_orders
  add column if not exists service_variant text,
  add column if not exists selected_carrier_code text,
  add column if not exists delivery_date_from date,
  add column if not exists delivery_date_to date,
  add column if not exists scheduled_date date,
  add column if not exists scheduled_window_start time,
  add column if not exists scheduled_window_end time,
  add column if not exists cutoff_evaluated_at timestamptz;
-- statement-breakpoint

alter table delivery_orders
  drop constraint if exists delivery_orders_requested_service_check,
  drop constraint if exists delivery_orders_assigned_service_check,
  drop constraint if exists delivery_orders_service_variant_check,
  drop constraint if exists delivery_orders_schedule_window_check,
  drop constraint if exists delivery_orders_selected_carrier_code_fkey;
-- statement-breakpoint

update delivery_orders
set
  requested_service = case requested_service
    when 'express' then 'fast'
    when 'postal' then 'standard'
    when 'internal' then 'scheduled'
    else requested_service
  end,
  assigned_service = case assigned_service
    when 'express' then 'fast'
    when 'postal' then 'standard'
    when 'internal' then 'scheduled'
    else assigned_service
  end,
  service_variant = coalesce(
    service_variant,
    case coalesce(assigned_service, requested_service)
      when 'express' then case
        when (created_at at time zone 'Asia/Tbilisi')::time < time '15:00' then 'same_day'
        else 'next_day'
      end
      when 'postal' then 'standard'
      when 'internal' then 'scheduled'
      when 'fast' then case
        when (created_at at time zone 'Asia/Tbilisi')::time < time '15:00' then 'same_day'
        else 'next_day'
      end
      when 'standard' then 'standard'
      when 'scheduled' then 'scheduled'
    end
  ),
  selected_carrier_code = coalesce(
    selected_carrier_code,
    case coalesce(assigned_service, requested_service)
      when 'express' then 'quickshipper'
      when 'fast' then 'quickshipper'
      when 'postal' then 'georgian_post'
      when 'standard' then 'georgian_post'
      when 'internal' then 'internal'
      when 'scheduled' then 'internal'
    end
  ),
  delivery_date_from = coalesce(delivery_date_from, (created_at at time zone 'Asia/Tbilisi')::date),
  delivery_date_to = coalesce(delivery_date_to, (created_at at time zone 'Asia/Tbilisi')::date),
  scheduled_date = case
    when coalesce(assigned_service, requested_service) in ('internal', 'scheduled')
      then coalesce(scheduled_date, (created_at at time zone 'Asia/Tbilisi')::date + 1)
    else scheduled_date
  end,
  scheduled_window_start = case
    when coalesce(assigned_service, requested_service) in ('internal', 'scheduled')
      then coalesce(scheduled_window_start, time '16:00')
    else scheduled_window_start
  end,
  scheduled_window_end = case
    when coalesce(assigned_service, requested_service) in ('internal', 'scheduled')
      then coalesce(scheduled_window_end, time '21:00')
    else scheduled_window_end
  end,
  cutoff_evaluated_at = coalesce(cutoff_evaluated_at, created_at);
-- statement-breakpoint

alter table delivery_orders
  add constraint delivery_orders_requested_service_check
    check (requested_service in ('fast', 'standard', 'scheduled')),
  add constraint delivery_orders_assigned_service_check
    check (assigned_service in ('fast', 'standard', 'scheduled')),
  add constraint delivery_orders_service_variant_check
    check (service_variant in ('same_day', 'next_day', 'standard', 'scheduled')),
  add constraint delivery_orders_schedule_window_check
    check (
      coalesce(assigned_service, requested_service) <> 'scheduled'
      or (
        scheduled_date is not null
        and scheduled_window_start is not null
        and scheduled_window_end is not null
        and scheduled_window_start < scheduled_window_end
      )
    ),
  add constraint delivery_orders_selected_carrier_code_fkey
    foreign key (selected_carrier_code) references carriers(code);
-- statement-breakpoint

create index if not exists delivery_orders_service_deadline_idx
  on delivery_orders (assigned_service, delivery_date_to, status);
