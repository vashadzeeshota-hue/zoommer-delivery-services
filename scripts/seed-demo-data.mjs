import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL_UNPOOLED or DATABASE_URL is required");

const sql = neon(databaseUrl);

await sql`delete from audit_logs where correlation_id like 'demo-seed-%'`;
await sql`delete from outbox_events where payload->>'demo' = 'true'`;
await sql`delete from delivery_orders where external_order_id like 'DEMO-ECOM-%'`;
await sql`delete from branch_pickups where external_order_id like 'DEMO-BR-%'`;

await sql`
  update carriers
  set
    status = case code
      when 'quickshipper' then 'degraded'
      else 'connected'
    end,
    last_sync_at = case code
      when 'georgian_post' then now() - interval '2 minutes'
      when 'fedex_tnt' then now() - interval '5 minutes'
      when 'quickshipper' then now() - interval '1 minute'
      else now()
    end,
    updated_at = now()
  where code in ('georgian_post', 'fedex_tnt', 'quickshipper', 'internal')
`;

await sql`
  insert into couriers (
    employee_code, full_name, phone, city, vehicle_type, status,
    current_lat, current_lng, active_assignments, delivered_today,
    last_location_at, created_at, updated_at
  ) values
    ('DEMO-CR-101', 'ლუკა დემო კურიერი', '+995 555 10 11 01', 'თბილისი', 'car', 'available', 41.715138, 44.827096, 2, 14, now() - interval '2 minutes', now() - interval '10 days', now()),
    ('DEMO-CR-102', 'ანა დემო კურიერი', '+995 555 10 11 02', 'თბილისი', 'bike', 'busy', 41.727250, 44.762720, 4, 11, now() - interval '1 minute', now() - interval '9 days', now()),
    ('DEMO-CR-103', 'გიორგი დემო კურიერი', '+995 555 10 11 03', 'ბათუმი', 'car', 'available', 41.646097, 41.640490, 1, 9, now() - interval '4 minutes', now() - interval '8 days', now()),
    ('DEMO-CR-104', 'მარიამ დემო კურიერი', '+995 555 10 11 04', 'ქუთაისი', 'scooter', 'break', 42.267910, 42.694590, 0, 7, now() - interval '8 minutes', now() - interval '7 days', now()),
    ('DEMO-CR-105', 'ნიკა დემო კურიერი', '+995 555 10 11 05', 'რუსთავი', 'car', 'busy', 41.549490, 44.993230, 3, 8, now() - interval '3 minutes', now() - interval '6 days', now()),
    ('DEMO-CR-106', 'სალომე დემო კურიერი', '+995 555 10 11 06', 'თბილისი', 'foot', 'offline', 41.693780, 44.801540, 0, 5, now() - interval '35 minutes', now() - interval '5 days', now())
  on conflict (employee_code) do update set
    full_name = excluded.full_name,
    phone = excluded.phone,
    city = excluded.city,
    vehicle_type = excluded.vehicle_type,
    status = excluded.status,
    current_lat = excluded.current_lat,
    current_lng = excluded.current_lng,
    active_assignments = excluded.active_assignments,
    delivered_today = excluded.delivered_today,
    last_location_at = excluded.last_location_at,
    updated_at = now()
`;

await sql`
  insert into delivery_orders (
    external_order_id, source, recipient_name, recipient_phone, city, address,
    requested_service, assigned_service, service_variant, selected_carrier_code,
    delivery_date_from, delivery_date_to, scheduled_date,
    scheduled_window_start, scheduled_window_end, cutoff_evaluated_at,
    status, weight_kg, dimensions_text, payment_method, cod_amount,
    partner_team, total_price, sla_due_at, metadata, created_at, updated_at
  ) values
    ('DEMO-ECOM-2001', 'zoommer.ge', 'ანა სატესტო', '+995 599 20 01 01', 'თბილისი', 'ვაჟა-ფშაველას გამზირი N70',
     'fast', null, 'same_day', 'quickshipper', current_date, current_date, null, null, null, now() - interval '20 minutes',
     'new', 0.80, 'small', 'prepaid', 0, null, 3299.00, now() + interval '5 hours',
     jsonb_build_object('demo', true, 'location', jsonb_build_object('lat', 41.7208, 'lng', 44.7426, 'postalCode', '0186')),
     now() - interval '20 minutes', now() - interval '20 minutes'),
    ('DEMO-ECOM-2002', 'zoommer.ge', 'გიორგი სატესტო', '+995 599 20 01 02', 'ბათუმი', 'ფარნავაზ მეფის ქუჩა N120',
     'standard', null, 'standard', 'georgian_post', current_date, current_date + 4, null, null, null, now() - interval '35 minutes',
     'new', 1.40, 'medium', 'cod', 1299.00, null, 1299.00, now() + interval '4 days',
     jsonb_build_object('demo', true, 'location', jsonb_build_object('lat', 41.6434, 'lng', 41.6351, 'postalCode', '6000')),
     now() - interval '35 minutes', now() - interval '35 minutes'),
    ('DEMO-ECOM-2003', 'manual', 'მარიამ სატესტო', '+995 599 20 01 03', 'თბილისი', 'ყაზბეგის გამზირი N24',
     'scheduled', 'scheduled', 'scheduled', 'internal', current_date + 1, current_date + 1, current_date + 1, time '12:00', time '15:00', now() - interval '1 hour',
     'assigned', 2.30, 'medium', 'prepaid', 0, 'Zoommer შიდა კურიერი', 1899.00, now() + interval '1 day 15 hours',
     jsonb_build_object('demo', true, 'location', jsonb_build_object('lat', 41.7244, 'lng', 44.7708, 'postalCode', '0160')),
     now() - interval '1 hour', now() - interval '12 minutes'),
    ('DEMO-ECOM-2004', 'zoommer.ge', 'ლუკა სატესტო', '+995 599 20 01 04', 'თბილისი', 'წერეთლის გამზირი N117',
     'fast', 'fast', 'same_day', 'quickshipper', current_date, current_date, null, null, null, now() - interval '2 hours',
     'assigned', 0.55, 'small', 'prepaid', 0, 'QuickShipper', 699.00, now() + interval '3 hours',
     jsonb_build_object('demo', true, 'location', jsonb_build_object('lat', 41.7339, 'lng', 44.7805, 'postalCode', '0119')),
     now() - interval '2 hours', now() - interval '18 minutes'),
    ('DEMO-ECOM-2005', 'zoommer.ge', 'ნინო სატესტო', '+995 599 20 01 05', 'ქუთაისი', 'რუსთაველის გამზირი N42',
     'standard', 'standard', 'standard', 'fedex_tnt', current_date - 1, current_date + 2, null, null, null, now() - interval '1 day',
     'transit', 4.20, 'large', 'cod', 1699.00, 'FedEx / TNT Express', 1699.00, now() + interval '2 days',
     jsonb_build_object('demo', true, 'location', jsonb_build_object('lat', 42.2679, 'lng', 42.6946, 'postalCode', '4600')),
     now() - interval '1 day', now() - interval '25 minutes'),
    ('DEMO-ECOM-2006', 'manual', 'სანდრო სატესტო', '+995 599 20 01 06', 'თბილისი', 'აბაშიძის ქუჩა N51',
     'scheduled', 'scheduled', 'scheduled', 'internal', current_date - 1, current_date - 1, current_date - 1, time '16:00', time '21:00', now() - interval '2 days',
     'completed', 3.10, 'large', 'prepaid', 0, 'Zoommer შიდა კურიერი', 3499.00, now() - interval '4 hours',
     jsonb_build_object('demo', true, 'printing', jsonb_build_object('status', 'printed', 'printedAt', now() - interval '1 day', 'channel', 'zebra'), 'location', jsonb_build_object('lat', 41.7089, 'lng', 44.7692, 'postalCode', '0179')),
     now() - interval '2 days', now() - interval '4 hours'),
    ('DEMO-ECOM-2007', 'zoommer.ge', 'ეკა სატესტო', '+995 599 20 01 07', 'რუსთავი', 'მეგობრობის გამზირი N12',
     'fast', 'fast', 'next_day', 'quickshipper', current_date - 1, current_date, null, null, null, now() - interval '18 hours',
     'exception', 0.70, 'small', 'cod', 999.00, 'QuickShipper', 999.00, now() - interval '2 hours',
     jsonb_build_object('demo', true, 'location', jsonb_build_object('lat', 41.5495, 'lng', 44.9932, 'postalCode', '3700')),
     now() - interval '18 hours', now() - interval '40 minutes'),
    ('DEMO-ECOM-2008', 'zoommer.ge', 'ირაკლი სატესტო', '+995 599 20 01 08', 'ზუგდიდი', 'კოსტავას ქუჩა N28',
     'standard', 'standard', 'standard', 'georgian_post', current_date - 4, current_date, null, null, null, now() - interval '4 days',
     'completed', 1.10, 'medium', 'prepaid', 0, 'საქართველოს ფოსტა', 799.00, now() - interval '3 hours',
     jsonb_build_object('demo', true, 'printing', jsonb_build_object('status', 'printed', 'printedAt', now() - interval '3 days', 'channel', 'a5'), 'location', jsonb_build_object('lat', 42.5088, 'lng', 41.8709, 'postalCode', '2100')),
     now() - interval '4 days', now() - interval '3 hours'),
    ('DEMO-ECOM-2009', 'zoommer.ge', 'თამარ სატესტო', '+995 599 20 01 09', 'თბილისი', 'ხიზანიშვილის ქუჩა N18',
     'fast', 'fast', 'same_day', 'quickshipper', current_date, current_date, null, null, null, now() - interval '3 hours',
     'transit', 0.45, 'small', 'prepaid', 0, 'QuickShipper', 549.00, now() + interval '2 hours',
     jsonb_build_object('demo', true, 'location', jsonb_build_object('lat', 41.7914, 'lng', 44.8170, 'postalCode', '0167')),
     now() - interval '3 hours', now() - interval '8 minutes'),
    ('DEMO-ECOM-2010', 'manual', 'დავით სატესტო', '+995 599 20 01 10', 'გორი', 'ჭავჭავაძის ქუჩა N14',
     'scheduled', null, 'scheduled', 'internal', current_date + 2, current_date + 2, current_date + 2, time '16:00', time '21:00', now() - interval '50 minutes',
     'new', 5.40, 'large', 'prepaid', 0, null, 2199.00, now() + interval '2 days 21 hours',
     jsonb_build_object('demo', true, 'location', jsonb_build_object('lat', 41.9842, 'lng', 44.1158, 'postalCode', '1400')),
     now() - interval '50 minutes', now() - interval '50 minutes'),
    ('DEMO-ECOM-2011', 'zoommer.ge', 'სალომე სატესტო', '+995 599 20 01 11', 'თელავი', 'ალაზნის ქუჩა N77',
     'standard', 'standard', 'standard', 'fedex_tnt', current_date - 1, current_date + 3, null, null, null, now() - interval '5 hours',
     'assigned', 2.80, 'medium', 'prepaid', 0, 'FedEx / TNT Express', 1499.00, now() + interval '3 days',
     jsonb_build_object('demo', true, 'location', jsonb_build_object('lat', 41.9198, 'lng', 45.4732, 'postalCode', '2200')),
     now() - interval '5 hours', now() - interval '15 minutes'),
    ('DEMO-ECOM-2012', 'zoommer.ge', 'ალექსი სატესტო', '+995 599 20 01 12', 'ახალციხე', 'თამარ მეფის ქუჩა N9',
     'standard', 'standard', 'standard', 'georgian_post', current_date - 3, current_date + 1, null, null, null, now() - interval '3 days',
     'exception', 1.75, 'medium', 'cod', 1199.00, 'საქართველოს ფოსტა', 1199.00, now() + interval '1 day',
     jsonb_build_object('demo', true, 'location', jsonb_build_object('lat', 41.6395, 'lng', 42.9826, 'postalCode', '0800')),
     now() - interval '3 days', now() - interval '30 minutes')
`;

await sql`
  insert into order_events (order_id, event_type, message, actor_name, created_at)
  select id, 'demo_order_created', 'სატესტო ორდერი მიღებულია Zoommer Delivery-ში', 'Demo Seeder', created_at
  from delivery_orders
  where external_order_id like 'DEMO-ECOM-%'
`;

await sql`
  insert into order_events (order_id, event_type, message, actor_name, created_at)
  select id, 'demo_status_updated', 'სატესტო სტატუსი განახლებულია: ' || status, 'Demo Seeder', updated_at
  from delivery_orders
  where external_order_id like 'DEMO-ECOM-%' and status <> 'new'
`;

await sql`
  insert into shipments (
    order_id, carrier_code, service_code, external_shipment_id, tracking_code,
    status, idempotency_key, label_status, price, metadata,
    registered_at, delivered_at, created_at, updated_at
  )
  select
    orders.id, demo.carrier_code, demo.service_code, demo.external_shipment_id,
    demo.tracking_code, demo.status, 'demo-seed-' || demo.external_shipment_id,
    demo.label_status, demo.price,
    jsonb_build_object('demo', true, 'providerNote', demo.provider_note),
    orders.created_at + interval '20 minutes',
    case when demo.status = 'delivered' then orders.updated_at else null end,
    orders.created_at + interval '20 minutes', orders.updated_at
  from (values
    ('DEMO-ECOM-2003', 'internal', 'scheduled', 'DEMO-SHP-2003', 'ZIN20030001', 'registered', 'ready', 12.00, 'დაგეგმილი ფანჯარა დადასტურებულია'),
    ('DEMO-ECOM-2004', 'quickshipper', 'fast', 'DEMO-SHP-2004', 'DQS20040001', 'registered', 'pending', 15.00, 'კურიერის გამოძახება მიღებულია'),
    ('DEMO-ECOM-2005', 'fedex_tnt', 'standard', 'DEMO-SHP-2005', 'TNT20050001', 'in_transit', 'ready', 18.00, 'გზავნილი ტრანზიტშია'),
    ('DEMO-ECOM-2006', 'internal', 'scheduled', 'DEMO-SHP-2006', 'ZIN20060001', 'delivered', 'printed', 12.00, 'ჩაბარდა მიმღებს'),
    ('DEMO-ECOM-2007', 'quickshipper', 'fast', 'DEMO-SHP-2007', 'DQS20070001', 'exception', 'failed', 15.00, 'მისამართი საჭიროებს დაზუსტებას'),
    ('DEMO-ECOM-2008', 'georgian_post', 'standard', 'DEMO-SHP-2008', 'GPOST2008001', 'delivered', 'printed', 9.50, 'ჩაბარდა მიმღებს'),
    ('DEMO-ECOM-2009', 'quickshipper', 'fast', 'DEMO-SHP-2009', 'DQS20090001', 'out_for_delivery', 'ready', 15.00, 'კურიერი გზაშია'),
    ('DEMO-ECOM-2011', 'fedex_tnt', 'standard', 'DEMO-SHP-2011', 'TNT20110001', 'registered', 'ready', 18.00, 'რეგისტრაცია დასრულებულია'),
    ('DEMO-ECOM-2012', 'georgian_post', 'standard', 'DEMO-SHP-2012', 'GPOST2012001', 'exception', 'pending', 9.50, 'საფოსტო ინდექსი გადასამოწმებელია')
  ) as demo(order_number, carrier_code, service_code, external_shipment_id, tracking_code, status, label_status, price, provider_note)
  join delivery_orders orders on orders.external_order_id = demo.order_number
`;

await sql`
  insert into tracking_events (
    shipment_id, provider_event_id, provider_status, canonical_status,
    description, event_at, raw_payload
  )
  select shipments.id, demo.provider_event_id, demo.provider_status,
    demo.canonical_status, demo.description, shipments.updated_at - demo.event_offset,
    jsonb_build_object('demo', true, 'source', 'seed-demo-data')
  from (values
    ('DEMO-SHP-2003', 'DEMO-EVT-2003-1', 'registered', 'assigned', 'გზავნილი დარეგისტრირდა', interval '40 minutes'),
    ('DEMO-SHP-2004', 'DEMO-EVT-2004-1', 'registered', 'assigned', 'კურიერის გამოძახება მიღებულია', interval '30 minutes'),
    ('DEMO-SHP-2005', 'DEMO-EVT-2005-1', 'picked_up', 'transit', 'გზავნილი აღებულია ფილიალიდან', interval '6 hours'),
    ('DEMO-SHP-2005', 'DEMO-EVT-2005-2', 'in_transit', 'transit', 'გზავნილი გადაადგილდება ჰაბისკენ', interval '25 minutes'),
    ('DEMO-SHP-2006', 'DEMO-EVT-2006-1', 'delivered', 'completed', 'შეკვეთა ჩაბარდა მიმღებს', interval '4 hours'),
    ('DEMO-SHP-2007', 'DEMO-EVT-2007-1', 'address_issue', 'exception', 'მისამართის დაზუსტება ვერ მოხერხდა', interval '40 minutes'),
    ('DEMO-SHP-2008', 'DEMO-EVT-2008-1', 'delivered', 'completed', 'საფოსტო გზავნილი ჩაბარდა', interval '3 hours'),
    ('DEMO-SHP-2009', 'DEMO-EVT-2009-1', 'out_for_delivery', 'transit', 'კურიერი გზაშია', interval '8 minutes'),
    ('DEMO-SHP-2011', 'DEMO-EVT-2011-1', 'registered', 'assigned', 'TNT რეგისტრაცია დასრულებულია', interval '15 minutes'),
    ('DEMO-SHP-2012', 'DEMO-EVT-2012-1', 'postal_code_issue', 'exception', 'საფოსტო ინდექსი გადასამოწმებელია', interval '30 minutes')
  ) as demo(external_shipment_id, provider_event_id, provider_status, canonical_status, description, event_offset)
  join shipments on shipments.external_shipment_id = demo.external_shipment_id
`;

await sql`
  insert into delivery_assignments (
    order_id, shipment_id, courier_id, status, sequence_no, assigned_by,
    assigned_at, accepted_at, completed_at, failure_reason
  )
  select orders.id, shipments.id, couriers.id, demo.status, demo.sequence_no,
    actor.id, orders.created_at + interval '25 minutes',
    case when demo.status in ('accepted', 'picked_up', 'in_progress', 'delivered', 'failed') then orders.created_at + interval '35 minutes' else null end,
    case when demo.status in ('delivered', 'failed') then orders.updated_at else null end,
    demo.failure_reason
  from (values
    ('DEMO-ECOM-2003', 'DEMO-SHP-2003', 'DEMO-CR-101', 'accepted', 1, null),
    ('DEMO-ECOM-2004', 'DEMO-SHP-2004', 'DEMO-CR-102', 'assigned', 2, null),
    ('DEMO-ECOM-2005', 'DEMO-SHP-2005', 'DEMO-CR-104', 'in_progress', 1, null),
    ('DEMO-ECOM-2006', 'DEMO-SHP-2006', 'DEMO-CR-101', 'delivered', 3, null),
    ('DEMO-ECOM-2007', 'DEMO-SHP-2007', 'DEMO-CR-105', 'failed', 2, 'მისამართი ვერ დაზუსტდა'),
    ('DEMO-ECOM-2008', 'DEMO-SHP-2008', 'DEMO-CR-103', 'delivered', 1, null),
    ('DEMO-ECOM-2009', 'DEMO-SHP-2009', 'DEMO-CR-102', 'in_progress', 3, null),
    ('DEMO-ECOM-2011', 'DEMO-SHP-2011', 'DEMO-CR-104', 'assigned', 2, null)
  ) as demo(order_number, shipment_number, courier_code, status, sequence_no, failure_reason)
  join delivery_orders orders on orders.external_order_id = demo.order_number
  join shipments on shipments.external_shipment_id = demo.shipment_number
  join couriers on couriers.employee_code = demo.courier_code
  left join app_users actor on lower(actor.email) = 'svashadze@zoommer.ge'
`;

await sql`
  insert into outbox_events (
    aggregate_type, aggregate_id, event_type, payload, status,
    attempt_count, available_at, processed_at, last_error, created_at
  )
  select 'shipment', shipments.id, demo.event_type,
    jsonb_build_object('demo', true, 'trackingCode', shipments.tracking_code),
    demo.status, demo.attempt_count, now() - demo.available_offset,
    case when demo.status = 'succeeded' then now() - interval '5 minutes' else null end,
    demo.last_error, now() - demo.available_offset
  from (values
    ('DEMO-SHP-2003', 'shipment.registered', 'succeeded', 1, interval '50 minutes', null),
    ('DEMO-SHP-2004', 'shipment.register', 'pending', 0, interval '5 minutes', null),
    ('DEMO-SHP-2005', 'tracking.sync', 'succeeded', 1, interval '30 minutes', null),
    ('DEMO-SHP-2007', 'tracking.sync', 'retry_scheduled', 2, interval '3 minutes', 'QuickShipper demo timeout'),
    ('DEMO-SHP-2008', 'zoommer.status_sync', 'succeeded', 1, interval '10 minutes', null),
    ('DEMO-SHP-2012', 'zoommer.status_sync', 'dead_letter', 4, interval '20 minutes', 'Demo postal code validation error')
  ) as demo(shipment_number, event_type, status, attempt_count, available_offset, last_error)
  join shipments on shipments.external_shipment_id = demo.shipment_number
`;

await sql`
  insert into audit_logs (
    actor_user_id, actor_type, action, entity_type, entity_id,
    after_data, correlation_id, created_at
  )
  select actor.id, 'system', 'demo.delivery_order_seeded', 'delivery_order', orders.id,
    jsonb_build_object('externalOrderId', orders.external_order_id, 'status', orders.status, 'demo', true),
    'demo-seed-' || orders.external_order_id, orders.created_at
  from delivery_orders orders
  left join app_users actor on lower(actor.email) = 'svashadze@zoommer.ge'
  where orders.external_order_id like 'DEMO-ECOM-%'
`;

await sql`
  with actor as (
    select id from app_users where lower(email) = 'svashadze@zoommer.ge' limit 1
  ),
  demo (
    external_order_id, operation_type, branch_code, processor_name, payment_method,
    customer_full_name, customer_personal_number, alternate_name, alternate_number,
    destination_phone, destination_address, product_name, quantity, serial_number,
    status, comment, price, created_offset, completed_offset
  ) as (
    values
      ('DEMO-BR-PICK-3001', 'pickup', 'tbilisi-city-mall-kavtaradze', 'ნინო დემო ოპერატორი', 'card', 'ანა სატესტო', '01001003001', null, null, null, null, 'Apple iPhone 16 Pro 256GB', 1, 'DEMO-PICK-IP16-3001', 'ready', 'მომხმარებელს გაეგზავნა მზადყოფნის შეტყობინება', 3299.00, interval '25 minutes', null),
      ('DEMO-BR-PICK-3002', 'pickup', 'tbilisi-pekini-14a', 'გიორგი დემო ოპერატორი', 'installment', 'ლუკა სატესტო', '01001003002', null, null, null, null, 'Samsung Galaxy S25 Ultra 256GB', 1, 'DEMO-PICK-S25-3002', 'issued', 'გაცემულია პირადობის მოწმობის შემოწმებით', 2899.00, interval '2 hours', interval '20 minutes'),
      ('DEMO-BR-PICK-3003', 'pickup', 'batumi-grand-mall', 'თამარ დემო ოპერატორი', 'cash', 'მარიამ სატესტო', '01001003003', 'ეკა სატესტო', '01001003903', null, null, 'Dyson V15 Detect Absolute', 1, 'DEMO-PICK-DY15-3003', 'ready', 'შეკვეთას სხვა პირი გაიტანს', 1799.00, interval '1 hour', null),
      ('DEMO-BR-PICK-3004', 'pickup', 'kutaisi-west-mall', 'დავით დემო ოპერატორი', 'bank_transfer', 'ნიკა სატესტო', '01001003004', null, null, null, null, 'Sony PlayStation 5 Slim', 1, 'DEMO-PICK-PS5-3004', 'issued', 'წარმატებით გაიცა', 1699.00, interval '4 hours', interval '1 hour'),
      ('DEMO-BR-PICK-3005', 'pickup', 'tbilisi-city-mall-gldani', 'გიორგი დემო ოპერატორი', 'prepaid', 'სალომე სატესტო', '01001003005', null, null, null, null, 'Apple AirPods Pro 2 USB-C', 2, 'DEMO-PICK-APP2-3005', 'ready', 'პროდუქტი დაცულია ფილიალში', 1398.00, interval '45 minutes', null),
      ('DEMO-BR-PICK-3006', 'pickup', 'tbilisi-east-point', 'ნინო დემო ოპერატორი', 'card', 'ირაკლი სატესტო', '01001003006', null, null, null, null, 'Apple Watch Series 10 GPS 46mm', 1, 'DEMO-PICK-AW10-3006', 'issued', 'გაცემულია დღეს', 1299.00, interval '5 hours', interval '2 hours'),
      ('DEMO-BR-PICK-3007', 'pickup', 'zugdidi-mall', 'თამარ დემო ოპერატორი', 'installment', 'ელენე სატესტო', '01001003007', null, null, null, null, 'Xiaomi Robot Vacuum S20+', 1, 'DEMO-PICK-XRV-3007', 'ready', 'მომხმარებელი მოვა საღამოს', 999.00, interval '3 hours', null),
      ('DEMO-BR-PICK-3008', 'pickup', 'telavi-mall', 'დავით დემო ოპერატორი', 'prepaid', 'სანდრო სატესტო', '01001003008', null, null, null, null, 'Apple MacBook Air 13 M4 16/256GB', 1, 'DEMO-PICK-MBA4-3008', 'issued', 'გაცემულია მომხმარებელზე', 3499.00, interval '7 hours', interval '3 hours'),
      ('DEMO-BR-DEL-4001', 'delivery', 'tbilisi-city-mall-kavtaradze', 'ნინო დემო ოპერატორი', 'card', 'ანა სატესტო', '01001004001', null, null, '+995 599 40 01 01', 'თბილისი, ვაჟა-ფშაველას გამზირი N70', 'Apple iPhone 16 Pro 256GB', 1, 'DEMO-DEL-IP16-4001', 'ready', 'დარეკეთ მიწოდებამდე 15 წუთით ადრე', 3299.00, interval '20 minutes', null),
      ('DEMO-BR-DEL-4002', 'delivery', 'tbilisi-pekini-14a', 'გიორგი დემო ოპერატორი', 'installment', 'ლუკა სატესტო', '01001004002', null, null, '+995 599 40 01 02', 'თბილისი, პეკინის გამზირი N24', 'Samsung Galaxy S25 Ultra 256GB', 1, 'DEMO-DEL-S25-4002', 'in_transit', 'კურიერი უკვე გავიდა ფილიალიდან', 2899.00, interval '2 hours', null),
      ('DEMO-BR-DEL-4003', 'delivery', 'tbilisi-east-point', 'ნინო დემო ოპერატორი', 'prepaid', 'მარიამ სატესტო', '01001004003', null, null, '+995 599 40 01 03', 'თბილისი, ვარკეთილი, ჯავახეთის ქუჩა N15', 'Apple Watch Series 10 GPS 46mm', 1, 'DEMO-DEL-AW10-4003', 'delivered', 'მიწოდებულია მომხმარებელთან', 1299.00, interval '4 hours', interval '35 minutes'),
      ('DEMO-BR-DEL-4004', 'delivery', 'batumi-grand-mall', 'თამარ დემო ოპერატორი', 'cash', 'ნიკა სატესტო', '01001004004', 'ეკა სატესტო', '01001004904', '+995 599 40 01 04', 'ბათუმი, ფარნავაზ მეფის ქუჩა N120', 'Dyson V15 Detect Absolute', 1, 'DEMO-DEL-DY15-4004', 'ready', 'ნივთს მიიღებს მითითებული სხვა პირი', 1799.00, interval '1 hour', null),
      ('DEMO-BR-DEL-4005', 'delivery', 'kutaisi-west-mall', 'დავით დემო ოპერატორი', 'bank_transfer', 'სალომე სატესტო', '01001004005', null, null, '+995 599 40 01 05', 'ქუთაისი, რუსთაველის გამზირი N42', 'Sony PlayStation 5 Slim', 1, 'DEMO-DEL-PS5-4005', 'in_transit', 'მიწოდების სავარაუდო დრო 16:00–18:00', 1699.00, interval '3 hours', null),
      ('DEMO-BR-DEL-4006', 'delivery', 'tbilisi-city-mall-gldani', 'გიორგი დემო ოპერატორი', 'card', 'ირაკლი სატესტო', '01001004006', null, null, '+995 599 40 01 06', 'თბილისი, გლდანი, ხიზანიშვილის ქუჩა N18', 'Apple AirPods Pro 2 USB-C', 2, 'DEMO-DEL-APP2-4006', 'delivered', 'ჩაბარდა პირადად მომხმარებელს', 1398.00, interval '6 hours', interval '2 hours'),
      ('DEMO-BR-DEL-4007', 'delivery', 'tbilisi-tsereteli-1', 'ნინო დემო ოპერატორი', 'prepaid', 'ელენე სატესტო', '01001004007', null, null, '+995 599 40 01 07', 'თბილისი, წერეთლის გამზირი N117', 'Xiaomi Robot Vacuum S20+', 1, 'DEMO-DEL-XRV-4007', 'ready', 'სასურველი მიწოდება დღის მეორე ნახევარში', 999.00, interval '45 minutes', null),
      ('DEMO-BR-DEL-4008', 'delivery', 'batumi-black-sea-mall', 'თამარ დემო ოპერატორი', 'installment', 'სანდრო სატესტო', '01001004008', null, null, '+995 599 40 01 08', 'ბათუმი, ლეხ და მარია კაჩინსკების ქუჩა N8', 'Apple MacBook Air 13 M4 16/256GB', 1, 'DEMO-DEL-MBA4-4008', 'delivered', 'შეკვეთა წარმატებით მიწოდებულია', 3499.00, interval '8 hours', interval '3 hours')
  )
  insert into branch_pickups (
    external_order_id, operation_type, processor_external_id, processor_name,
    payment_method, customer_full_name, customer_personal_number,
    alternate_recipient_name, alternate_recipient_personal_number,
    destination_phone, destination_address, branch_id, product_name, quantity,
    serial_number, issued_at, status, comment, price, source, source_payload,
    created_by, updated_by, created_at, updated_at
  )
  select
    demo.external_order_id, demo.operation_type, 'DEMO-EMP-01', demo.processor_name,
    demo.payment_method, demo.customer_full_name, demo.customer_personal_number,
    demo.alternate_name, demo.alternate_number, demo.destination_phone,
    demo.destination_address, branches.id, demo.product_name, demo.quantity,
    demo.serial_number,
    case when demo.status in ('issued', 'delivered') then now() - demo.completed_offset else null end,
    demo.status, demo.comment, demo.price, 'zoommer.ge',
    jsonb_build_object('demo', true, 'seed', 'all-operational-tables-v1'),
    actor.id, actor.id, now() - demo.created_offset, now()
  from demo
  join retail_branches branches on branches.external_code = demo.branch_code and branches.active = true
  cross join actor
`;

const counts = await sql`
  select 'delivery_orders' as table_name, count(*)::int as count from delivery_orders where external_order_id like 'DEMO-ECOM-%'
  union all select 'order_events', count(*)::int from order_events where order_id in (select id from delivery_orders where external_order_id like 'DEMO-ECOM-%')
  union all select 'shipments', count(*)::int from shipments where order_id in (select id from delivery_orders where external_order_id like 'DEMO-ECOM-%')
  union all select 'tracking_events', count(*)::int from tracking_events where raw_payload->>'demo' = 'true'
  union all select 'couriers', count(*)::int from couriers where employee_code like 'DEMO-CR-%'
  union all select 'delivery_assignments', count(*)::int from delivery_assignments where order_id in (select id from delivery_orders where external_order_id like 'DEMO-ECOM-%')
  union all select 'outbox_events', count(*)::int from outbox_events where payload->>'demo' = 'true'
  union all select 'audit_logs', count(*)::int from audit_logs where correlation_id like 'demo-seed-%'
  union all select 'branch_pickups', count(*)::int from branch_pickups where operation_type = 'pickup' and external_order_id like 'DEMO-BR-%'
  union all select 'branch_deliveries', count(*)::int from branch_pickups where operation_type = 'delivery' and external_order_id like 'DEMO-BR-%'
`;

const result = Object.fromEntries(counts.map((row) => [row.table_name, Number(row.count)]));
const expected = {
  delivery_orders: 12,
  order_events: 21,
  shipments: 9,
  tracking_events: 10,
  couriers: 6,
  delivery_assignments: 8,
  outbox_events: 6,
  audit_logs: 12,
  branch_pickups: 8,
  branch_deliveries: 8,
};

for (const [table, count] of Object.entries(expected)) {
  if (result[table] !== count) {
    throw new Error(`Expected ${count} demo rows in ${table}, found ${result[table] ?? 0}`);
  }
}

console.log(JSON.stringify(result));
