# მიწოდების სერვისების მოდელი

პლატფორმაში მიწოდების ტიპი და შემსრულებელი პროვაიდერი ცალ-ცალკე ინახება.

| სერვისი | წესი | პროვაიდერი |
|---|---|---|
| `fast` | Zoommer-იდან 15:00-მდე მიღებული ორდერი იმავე დღეს; 15:00-დან მიღებული — მეორე დღეს | QuickShipper |
| `standard` | ჩაბარების ვადა 2–5 სამუშაო დღე | საქართველოს ფოსტა ან TNT Express |
| `scheduled` | მომხმარებლის მიერ არჩეული თარიღი და დროის ფანჯარა | Zoommer შიდა კურიერი |

## API payload

`PATCH /api/orders`

```json
{
  "orderId": "ZMG-DEMO-0124",
  "service": "standard",
  "providerCode": "fedex_tnt",
  "scheduledDate": null,
  "windowStart": null,
  "windowEnd": null
}
```

დაგეგმილი მიწოდებისთვის `scheduledDate`, `windowStart` და `windowEnd` სავალდებულოა. სწრაფი მიწოდების `same_day` / `next_day` ვარიანტს API თვითონ ითვლის ორდერის `created_at` დროით, `Asia/Tbilisi` დროის სარტყელში.

## მონაცემთა ბაზა

`delivery_orders` ინახავს:

- `assigned_service` — `fast`, `standard`, `scheduled`;
- `service_variant` — `same_day`, `next_day`, `standard`, `scheduled`;
- `selected_carrier_code` — რეალური შემსრულებელი პროვაიდერი;
- `delivery_date_from`, `delivery_date_to` — დაპირებული მიწოდების დიაპაზონი;
- `scheduled_date`, `scheduled_window_start`, `scheduled_window_end` — მომხმარებლის დროის ფანჯარა;
- `cutoff_evaluated_at` — cutoff-ის გამოთვლის აუდიტის დრო.

ცვლილება შეტანილია versioned migration-ში: `database/006_delivery_service_model.sql`.
