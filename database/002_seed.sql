insert into delivery_orders (
  external_order_id, recipient_name, recipient_phone, city, address,
  requested_service, assigned_service, status, weight_kg, dimensions_text,
  payment_method, cod_amount, partner_team, created_at
) values
  ('ZMG-DEMO-0124', 'მიმღები 01', '000 00 00 01', 'ბათუმი', 'სატესტო მისამართი №1', 'express', null, 'new', 1.20, '20 × 15 × 10 სმ', 'prepaid', 0, null, now() - interval '1 minute'),
  ('ZMG-DEMO-0123', 'მიმღები 02', '000 00 00 02', 'თბილისი', 'სატესტო მისამართი №2', 'postal', null, 'new', 0.80, '18 × 12 × 8 სმ', 'cod', 149, null, now() - interval '2 minutes'),
  ('ZMG-DEMO-0125', 'მიმღები 03', '000 00 00 03', 'ქუთაისი', 'სატესტო მისამართი №3', 'internal', 'internal', 'assigned', 2.40, '30 × 22 × 12 სმ', 'prepaid', 0, 'Zoommer შიდა გუნდი', now() - interval '3 minutes'),
  ('ZMG-DEMO-0126', 'მიმღები 04', '000 00 00 04', 'თბილისი', 'სატესტო მისამართი №4', 'postal', 'postal', 'completed', 1.10, '22 × 16 × 9 სმ', 'prepaid', 0, 'საქართველოს ფოსტა', now() - interval '4 minutes'),
  ('ZMG-DEMO-0127', 'მიმღები 05', '000 00 00 05', 'რუსთავი', 'სატესტო მისამართი №5', 'express', 'express', 'exception', 0.55, '16 × 10 × 7 სმ', 'cod', 89, 'City Express', now() - interval '5 minutes'),
  ('ZMG-DEMO-0128', 'მიმღები 06', '000 00 00 06', 'თბილისი', 'სატესტო მისამართი №6', 'internal', null, 'new', 3.20, '38 × 26 × 15 სმ', 'prepaid', 0, null, now() - interval '6 minutes'),
  ('ZMG-DEMO-0129', 'მიმღები 07', '000 00 00 07', 'ზუგდიდი', 'სატესტო მისამართი №7', 'postal', 'postal', 'assigned', 0.95, '20 × 14 × 8 სმ', 'cod', 219, 'საქართველოს ფოსტა', now() - interval '7 minutes'),
  ('ZMG-DEMO-0130', 'მიმღები 08', '000 00 00 08', 'თბილისი', 'სატესტო მისამართი №8', 'express', 'express', 'transit', 1.85, '28 × 19 × 10 სმ', 'prepaid', 0, 'City Express', now() - interval '8 minutes'),
  ('ZMG-DEMO-0131', 'მიმღები 09', '000 00 00 09', 'გორი', 'სატესტო მისამართი №9', 'postal', null, 'new', 0.70, '17 × 11 × 8 სმ', 'prepaid', 0, null, now() - interval '9 minutes')
on conflict (external_order_id) do nothing;
