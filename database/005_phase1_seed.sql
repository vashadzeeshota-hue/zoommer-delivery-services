insert into carriers (code, name, category, status, capabilities, last_sync_at)
values
  (
    'georgian_post',
    'საქართველოს ფოსტა',
    'postal',
    'setup_required',
    '{"createShipment":true,"trackingPolling":true,"providerLabel":true,"cod":true}'::jsonb,
    null
  ),
  (
    'fedex_tnt',
    'FedEx / TNT Express',
    'express',
    'setup_required',
    '{"createShipment":true,"trackingPolling":true,"providerLabel":true,"multiPackage":true}'::jsonb,
    null
  ),
  (
    'quickshipper',
    'QuickShipper',
    'express',
    'setup_required',
    '{"createShipment":true,"webhooks":true,"trackingPolling":true,"cod":true}'::jsonb,
    null
  ),
  (
    'internal',
    'Zoommer შიდა კურიერი',
    'internal',
    'connected',
    '{"createShipment":true,"webhooks":false,"trackingPolling":false,"cod":true}'::jsonb,
    now()
  )
on conflict (code) do update set
  name = excluded.name,
  category = excluded.category,
  capabilities = excluded.capabilities,
  updated_at = now();
-- statement-breakpoint

insert into couriers (
  employee_code, full_name, phone, city, vehicle_type, status,
  current_lat, current_lng, active_assignments, delivered_today, last_location_at
)
values
  ('CR-001', 'ლუკა მაისურაძე', '555 10 20 30', 'თბილისი', 'car', 'available', 41.715138, 44.827096, 2, 14, now() - interval '2 minutes'),
  ('CR-002', 'ანა კვარაცხელია', '555 21 31 41', 'თბილისი', 'bike', 'busy', 41.727250, 44.762720, 5, 11, now() - interval '1 minute'),
  ('CR-003', 'გიორგი ბერიძე', '555 32 42 52', 'ბათუმი', 'car', 'available', 41.646097, 41.640490, 1, 9, now() - interval '4 minutes'),
  ('CR-004', 'მარიამ კაპანაძე', '555 43 53 63', 'ქუთაისი', 'scooter', 'break', 42.267910, 42.694590, 0, 7, now() - interval '8 minutes')
on conflict (employee_code) do update set
  full_name = excluded.full_name,
  phone = excluded.phone,
  city = excluded.city,
  vehicle_type = excluded.vehicle_type,
  updated_at = now();

