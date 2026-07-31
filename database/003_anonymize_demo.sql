delete from order_events
where order_id in (
  select id
  from delivery_orders
  where external_order_id like 'ZMG-260731-%'
);
-- statement-breakpoint

delete from delivery_orders
where external_order_id like 'ZMG-260731-%';
