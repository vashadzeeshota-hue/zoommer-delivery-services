alter table branch_pickups
  add column if not exists operation_type text not null default 'pickup',
  add column if not exists destination_phone text,
  add column if not exists destination_address text;
-- statement-breakpoint

alter table branch_pickups
  drop constraint if exists branch_pickups_status_check;
-- statement-breakpoint

alter table branch_pickups
  add constraint branch_pickups_operation_type_check
    check (operation_type in ('pickup', 'delivery')),
  add constraint branch_pickups_status_check
    check (status in ('ready', 'issued', 'in_transit', 'delivered')),
  add constraint branch_pickups_operation_status_check
    check (
      (operation_type = 'pickup' and status in ('ready', 'issued'))
      or (operation_type = 'delivery' and status in ('ready', 'in_transit', 'delivered'))
    ),
  add constraint branch_pickups_delivery_destination_check
    check (
      operation_type = 'pickup'
      or (
        destination_phone is not null
        and length(trim(destination_phone)) >= 5
        and destination_address is not null
        and length(trim(destination_address)) >= 3
      )
    ),
  add constraint branch_pickups_completion_date_check
    check (status not in ('issued', 'delivered') or issued_at is not null);
-- statement-breakpoint

create index if not exists branch_pickups_operation_branch_status_idx
  on branch_pickups (operation_type, branch_id, status, issued_at desc, created_at desc);
