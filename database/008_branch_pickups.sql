create table if not exists retail_branches (
  id uuid primary key default gen_random_uuid(),
  external_code text not null unique,
  name text not null,
  city text not null,
  address text not null,
  phone text,
  branch_type text not null default 'retail'
    check (branch_type in ('retail', 'office', 'warehouse')),
  active boolean not null default true,
  source_url text not null default 'https://zoommer.ge/branches',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- statement-breakpoint

create table if not exists user_branch_access (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  branch_id uuid references retail_branches(id) on delete cascade,
  access_scope text not null default 'branch'
    check (access_scope in ('branch', 'all')),
  granted_by uuid references app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (
    (access_scope = 'all' and branch_id is null)
    or (access_scope = 'branch' and branch_id is not null)
  )
);
-- statement-breakpoint

create unique index if not exists user_branch_access_user_branch_idx
  on user_branch_access (user_id, branch_id)
  where branch_id is not null;
-- statement-breakpoint

create unique index if not exists user_branch_access_all_idx
  on user_branch_access (user_id)
  where access_scope = 'all';
-- statement-breakpoint

create index if not exists user_branch_access_user_idx
  on user_branch_access (user_id);
-- statement-breakpoint

create table if not exists branch_pickups (
  id uuid primary key default gen_random_uuid(),
  external_order_id text not null,
  processor_external_id text,
  processor_name text not null,
  payment_method text not null,
  customer_full_name text not null,
  customer_personal_number text not null
    check (customer_personal_number ~ '^[0-9]{11}$'),
  alternate_recipient_name text,
  alternate_recipient_personal_number text
    check (alternate_recipient_personal_number is null or alternate_recipient_personal_number ~ '^[0-9]{11}$'),
  branch_id uuid not null references retail_branches(id),
  product_name text not null,
  quantity integer not null check (quantity > 0 and quantity <= 1000),
  serial_number text,
  issued_at timestamptz,
  status text not null default 'ready'
    check (status in ('ready', 'issued')),
  comment text,
  price numeric(12, 2) not null check (price >= 0),
  source text not null default 'manual'
    check (source in ('manual', 'zoommer.ge')),
  source_payload jsonb not null default '{}'::jsonb,
  created_by uuid references app_users(id) on delete set null,
  updated_by uuid references app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (alternate_recipient_name is null and alternate_recipient_personal_number is null)
    or (alternate_recipient_name is not null and alternate_recipient_personal_number is not null)
  ),
  check (status <> 'issued' or issued_at is not null)
);
-- statement-breakpoint

create index if not exists branch_pickups_branch_status_date_idx
  on branch_pickups (branch_id, status, issued_at desc, created_at desc);
-- statement-breakpoint

create index if not exists branch_pickups_order_idx
  on branch_pickups (external_order_id);
-- statement-breakpoint

create index if not exists branch_pickups_serial_idx
  on branch_pickups (serial_number)
  where serial_number is not null;
-- statement-breakpoint

insert into retail_branches (external_code, name, city, address, phone, branch_type)
values
  ('tbilisi-tsereteli-1', 'წერეთელი', 'თბილისი', 'წერეთლის გამზირი, N1', '+995 591 967 601', 'retail'),
  ('tbilisi-pekini-14a', 'პეკინი', 'თბილისი', 'კ. გამსახურდიას (პეკინის) გამზირი N14ა', '+995 591 967 671', 'retail'),
  ('tbilisi-central', 'თბილისი ცენტრალი', 'თბილისი', 'სადგურის მოედანი, III სართული', '+995 599 862 449', 'retail'),
  ('tbilisi-city-mall-kavtaradze', 'სითი მოლი ქავთარაძე', 'თბილისი', 'პეტრე ქავთარაძის N1 / ვაჟა-ფშაველას 70', '+995 591 971 962', 'retail'),
  ('tbilisi-mall', 'თბილისი მოლი', 'თბილისი', 'აღმაშენებლის ხეივანი, მე-16 კმ, I სართული', '+995 591 967 608', 'retail'),
  ('tbilisi-city-mall-gldani', 'სითი მოლი გლდანი', 'თბილისი', 'ი. ვეკუა N1', '+995 591 270 581', 'retail'),
  ('tbilisi-gldani-mall', 'გლდანი მოლი', 'თბილისი', 'მეტრო ახმეტელის მიმდებარედ, I სართული', '+995 591 967 673', 'retail'),
  ('tbilisi-east-point', 'ისთ ფოინთი', 'თბილისი', 'ალ. თვალჭრელიძის N2', '+995 591 340 476', 'retail'),
  ('rustavi-mall', 'რუსთავი მოლი', 'რუსთავი', 'შარტავასა და ლომოურის ქუჩების კვეთა', '+995 591 441 082', 'retail'),
  ('batumi-chavchavadze-21', 'ბათუმი — ჭავჭავაძე', 'ბათუმი', 'ჭავჭავაძის N21', '+995 591 967 606', 'retail'),
  ('batumi-black-sea-mall', 'Black Sea Mall', 'ბათუმი', 'ტბელ აბუსერიძის N22', '+995 591 310 257', 'retail'),
  ('batumi-grand-mall', 'გრანდ მოლი', 'ბათუმი', 'შერიფ ხიმშიაშვილის N29', '+995 591 022 872', 'retail'),
  ('kutaisi-central', 'ქუთაისის ცენტრალური მოედანი', 'ქუთაისი', 'თამარ მეფის ქ. N3', '+995 591 967 605', 'retail'),
  ('kutaisi-west-mall', 'ვესთ მოლი', 'ქუთაისი', 'შარტავას N2', '+995 595 306 765', 'retail'),
  ('zugdidi-mall', 'ზუგდიდი მოლი', 'ზუგდიდი', 'კოსტავას ქუჩა N28', '+995 591 676 489', 'retail'),
  ('gori-mall', 'გორი მოლი', 'გორი', 'ცხინვალის გზატკეცილი 14-14ა', '+995 591 198 248', 'retail'),
  ('akhaltsikhe-tamar-mepe-9', 'ახალციხე', 'ახალციხე', 'თამარ მეფის ქ. N9', '+995 598 088 659', 'retail'),
  ('telavi-mall', 'თელავი მოლი', 'თელავი', 'ალაზნის ქ. N77', '+995 595 069 853', 'retail'),
  ('tbilisi-head-office', 'სათაო ოფისი', 'თბილისი', 'აკაკი წერეთლის გამზირი N1', null, 'office'),
  ('tbilisi-wholesale-warehouse', 'საბითუმო საწყობი', 'თბილისი', 'აკაკი წერეთლის გამზირი N1, -1 სართული', '+995 32 2 60 30 60', 'warehouse')
on conflict (external_code) do update set
  name = excluded.name,
  city = excluded.city,
  address = excluded.address,
  phone = excluded.phone,
  branch_type = excluded.branch_type,
  active = true,
  source_url = 'https://zoommer.ge/branches',
  updated_at = now();
-- statement-breakpoint

insert into user_branch_access (user_id, branch_id, access_scope, granted_by)
select id, null, 'all', id
from app_users
where lower(email) = 'svashadze@zoommer.ge'
on conflict (user_id) where access_scope = 'all'
do update set access_scope = excluded.access_scope;
