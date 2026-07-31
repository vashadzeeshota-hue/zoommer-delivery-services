# API და ინტეგრაციების სტრუქტურა

## 1. API სტანდარტი

- base path: `/api/v1`;
- JSON request/response;
- OpenAPI 3.1 არის contract-ის source of truth;
- timestamp: ISO 8601 UTC;
- ფული: `{ "amount": "12.50", "currency": "GEL" }`;
- pagination: cursor-based;
- ყველა write endpoint იღებს `Idempotency-Key`;
- ყველა response აბრუნებს `X-Request-Id`;
- შეცდომა იყენებს ერთიან envelope-ს:

```json
{
  "error": {
    "code": "SHIPMENT_VALIDATION_FAILED",
    "message": "Shipment data is invalid",
    "fieldErrors": [
      { "field": "deliveryAddress.postalCode", "code": "REQUIRED" }
    ],
    "requestId": "req_..."
  }
}
```

## 2. Public application API

### Orders

```text
GET    /api/v1/orders
POST   /api/v1/orders/import
GET    /api/v1/orders/{orderId}
PATCH  /api/v1/orders/{orderId}
GET    /api/v1/orders/{orderId}/timeline
POST   /api/v1/orders/{orderId}/validate-address
```

Filters: `status`, `deliveryType`, `carrier`, `city`, `courierId`, `createdFrom`, `createdTo`, `search`, `cursor`.

### Shipments

```text
POST   /api/v1/orders/{orderId}/shipments
GET    /api/v1/shipments/{shipmentId}
POST   /api/v1/shipments/{shipmentId}/register
POST   /api/v1/shipments/{shipmentId}/cancel
POST   /api/v1/shipments/{shipmentId}/refresh-tracking
GET    /api/v1/shipments/{shipmentId}/tracking-events
GET    /api/v1/shipments/{shipmentId}/labels/{format}
POST   /api/v1/shipments/{shipmentId}/labels
POST   /api/v1/shipments/{shipmentId}/print-jobs
```

`register` სასურველია აბრუნებდეს `202 Accepted`-ს და operation/job id-ს. Carrier network call worker-ში სრულდება.

### Couriers და dispatch

```text
GET    /api/v1/couriers
POST   /api/v1/couriers
PATCH  /api/v1/couriers/{courierId}
POST   /api/v1/assignments/bulk
PATCH  /api/v1/assignments/{assignmentId}/status
POST   /api/v1/courier-locations/batch
GET    /api/v1/map/orders
GET    /api/v1/map/couriers
GET    /api/v1/route-batches/{routeBatchId}
```

Courier location batch request ამცირებს ქსელისა და ბაზის დატვირთვას. API იღებს ბოლო რამდენიმე წერტილს, future/ძალიან ძველ timestamp-ებს უარყოფს და user-ს courier identity-ს server-side უკავშირებს.

### Dashboard

```text
GET    /api/v1/dashboard/summary
GET    /api/v1/dashboard/carriers
GET    /api/v1/dashboard/cities
GET    /api/v1/dashboard/sla
GET    /api/v1/events/stream
```

SSE stream მხოლოდ invalidation/status event-ებს გზავნის; სრული order data თავიდან REST API-ით იტვირთება.

### Webhooks

```text
POST   /api/v1/webhooks/zoommer
POST   /api/v1/webhooks/carriers/georgian-post
POST   /api/v1/webhooks/carriers/fedex-tnt
POST   /api/v1/webhooks/carriers/quickshipper
```

Webhook handler-ის ნაბიჯები:

1. raw body-ის signature verification;
2. provider event id/hash deduplication;
3. `webhook_inbox` insert;
4. `2xx` სწრაფი პასუხი;
5. asynchronous parse/normalize/process;
6. unknown status-ის alert და raw payload-ის შენახვა.

## 3. Carrier Adapter contract

```ts
export type CarrierCode =
  | "georgian_post"
  | "fedex_tnt"
  | "quickshipper"
  | "internal";

export interface CarrierCapabilities {
  createShipment: boolean;
  cancelShipment: boolean;
  rates: boolean;
  providerLabel: boolean;
  webhooks: boolean;
  trackingPolling: boolean;
  multiPackage: boolean;
  cod: boolean;
}

export interface CarrierAdapter {
  readonly code: CarrierCode;
  readonly capabilities: CarrierCapabilities;

  validateShipment(input: CanonicalShipmentRequest): Promise<ValidationResult>;
  quote(input: CanonicalShipmentRequest): Promise<CarrierQuote[]>;
  createShipment(
    input: CanonicalShipmentRequest,
    context: IntegrationContext,
  ): Promise<CreateShipmentResult>;
  cancelShipment(
    input: CancelShipmentRequest,
    context: IntegrationContext,
  ): Promise<CancelShipmentResult>;
  getTracking(input: TrackingRequest): Promise<CanonicalTrackingEvent[]>;
  parseWebhook(input: SignedWebhookInput): Promise<CanonicalTrackingEvent[]>;
  getLabel?(input: LabelRequest): Promise<ProviderLabel>;
}
```

### Canonical create request

```ts
export interface CanonicalShipmentRequest {
  shipmentId: string;
  merchantOrderId: string;
  serviceCode: string;
  sender: ContactAddress;
  recipient: ContactAddress;
  packages: Array<{
    reference: string;
    weightKg: string;
    dimensionsCm: { length: string; width: string; height: string };
  }>;
  cod?: { amount: string; currency: "GEL" };
  declaredValue?: { amount: string; currency: string };
  deliveryInstructions?: string;
}
```

Provider-specific field mapping adapter-ის შიგნითაა. Domain/API-ში Georgian Post/TNT/QuickShipper-ის request DTO არ უნდა გავრცელდეს.

### Result და error classification

```ts
export interface CreateShipmentResult {
  externalShipmentId: string;
  trackingCode: string;
  packageTrackingCodes?: string[];
  initialStatus: CanonicalShipmentStatus;
  providerLabel?: ProviderLabel;
  providerMetadata?: Record<string, unknown>;
}

export type IntegrationErrorKind =
  | "validation"
  | "authentication"
  | "authorization"
  | "rate_limit"
  | "timeout"
  | "temporary"
  | "conflict"
  | "not_found"
  | "unknown";
```

Adapter error-ს ანიჭებს `retryable` ნიშნულს. Orchestrator წყვეტს retry/dead-letter პოლიტიკას; provider implementation თვითნებურად არ ატრიალებს უსასრულო retry loop-ს.

## 4. Provider-ების სტრუქტურა

```text
packages/carriers/
  src/
    contract/
      carrier-adapter.ts
      canonical-status.ts
      errors.ts
    registry.ts
    georgian-post/
      adapter.ts
      auth.ts
      mapper.ts
      status-map.ts
      webhook.ts
    fedex-tnt/
      adapter.ts
      auth.ts
      mapper.ts
      status-map.ts
      webhook.ts
    quickshipper/
      adapter.ts
      auth.ts
      mapper.ts
      status-map.ts
      webhook.ts
    internal/
      adapter.ts
```

### Georgian Post

ზუსტი endpoint-ები და payload-ები ჩაიწერება მხოლოდ ოფიციალური merchant დოკუმენტაციის მიღების შემდეგ. Adapter-ს მინიმუმ სჭირდება:

- shipment validation/create;
- tracking identifier;
- label/document response ან ჩვენი label-ისთვის საჭირო მონაცემები;
- tracking status/webhook ან polling;
- cancellation, თუ provider უჭერს მხარს.

არ უნდა გამოიგონოს endpoint ან status code საჯარო marketing ინფორმაციის საფუძველზე.

### FedEx/TNT

FedEx Ship API create/validate/cancel და tracking შესაძლებლობებს ცალკე operation-ებად ვფუთავთ. TNT-ის ხელმისაწვდომი პროდუქტები და account mapping რეგიონულ merchant account-ზე უნდა დადასტურდეს.

გასათვალისწინებელია:

- OAuth/access token caching და expiry;
- account number და service/package codes;
- label response-ის ფორმატი;
- international shipment-ის customs data;
- provider transaction id-ის logging;
- non-ASCII მისამართის transliteration/validation მხოლოდ provider-ის რეალური მოთხოვნის მიხედვით.

### QuickShipper

QuickShipper adapter აბსტრაქტავს authentication-ს, provider/service selection-ს, pickup/drop-off mapping-ს, order creation-სა და tracking-ს. რადგან provider IDs და credential-ები account/config-ზეა დამოკიდებული, ისინი hard-code არ უნდა იყოს.

### Internal courier

`internal` adapter network call-ს არ აკეთებს. იგი ქმნის local shipment/assignment-ს, tracking code-ს და canonical event-ებს იმავე interface-ით. ასე dashboard-სა და Zoommer sync-ს არ აინტერესებს ვინ შეასრულა მიწოდება.

## 5. Zoommer integration

### Incoming order contract

Zoommer payload ჯერ გადადის anti-corruption layer-ში:

```text
ZoommerOrderPayload
  -> validate signature/schema
  -> mapToCanonicalOrder
  -> upsert(source, externalOrderId)
  -> emit order.received / order.updated
```

საწყის contract-ში საჭიროა:

- order id/version;
- recipient and contact;
- pickup/delivery address;
- products/packages ან მინიმუმ total weight/dimensions;
- delivery type/SLA;
- payment/COD;
- cancellation/update semantics.

### Finished sync

```text
shipment.delivered
  -> verify delivery completion rule
  -> outbox: zoommer.order.finish_requested
  -> worker: PUT/PATCH Zoommer status
  -> integration_attempt
  -> success: order.completed
  -> retryable failure: retry_scheduled
  -> permanent failure: dead_letter + operator alert
```

თუ ერთ order-ს რამდენიმე shipment აქვს, `Finished` იგზავნება მხოლოდ მაშინ, როცა ყველა აუცილებელი shipment `delivered`-ია. Returned/cancelled/partial delivery-ის ბიზნეს წესი Zoommer-თან წინასწარ უნდა შეთანხმდეს.

### Retry policy

- request-ზე stable idempotency/reference;
- exponential backoff + jitter;
- `Retry-After` მხარდაჭერა;
- maximum attempts და maximum age;
- manual replay მხოლოდ Admin-ს;
- replay ყოველთვის audit log-ში;
- credential error-ზე retry storm-ის ნაცვლად integration circuit breaker/alert.

## 6. Label, barcode და Zebra

### Label rendering pipeline

```text
Shipment snapshot
  -> validate mandatory fields
  -> render common label model
  -> PDF A5 renderer
  -> ZPL renderer (203/300 DPI)
  -> object storage + content hash
  -> user initiated print job
```

A5 ზომა არის `148 × 210 mm`. ZPL layout millimeter-იდან printer dots-ში ითარგმნება კონკრეტული DPI-ის მიხედვით.

ეტიკეტზე:

- მიმღების სახელი და ტელეფონი;
- სრული მისამართი და მითითება;
- ქალაქი/საფოსტო ინდექსი;
- carrier/service;
- order reference;
- tracking code ტექსტურად;
- Code 128;
- QR tracking URL;
- package count, წონა და COD საჭიროების შემთხვევაში.

### Printing modes

1. **PDF** — universal fallback; browser print dialog.
2. **ZPL download** — raw file ლოკალური Zebra utility/driver-ისთვის.
3. **Zebra Browser Print** — browser-იდან local USB/LAN printer-ზე სწრაფი ბეჭდვა, თუ client კომპიუტერზე Browser Print დაყენებულია და საიტი ნებადართულია.

Direct print ყოველთვის operator-ის ინიციირებული მოქმედებაა. Server-იდან მომხმარებლის LAN/USB printer-ზე დაუდასტურებელი წვდომა არ იგეგმება.

## 7. Maps და location API

ერთ production provider-ს ვირჩევთ. Google Maps-ის შემთხვევაში:

- Places Autocomplete — address suggestion;
- Place Details/Geocoding — normalized address და lat/lng;
- Geocoding — reverse geocoding pin drop-ზე;
- country restriction `GE`;
- search bias map viewport/city-ზე;
- API key restrictions: domain, API allowlist და server/client key-ების განცალკევება.

ჩვენს ბაზაში provider response-ის ყველა ველი არ ინახება; ვინახავთ normalized address-ს, provider place id-ს, `geography(Point,4326)`-ს და საჭირო metadata-ს.

### Map data contract

`GET /api/v1/map/orders` იღებს viewport-სა და zoom-ს და აბრუნებს:

- დაბალ zoom-ზე server-side clusters/aggregates;
- მაღალ zoom-ზე შეზღუდულ marker-ებს;
- მხოლოდ როლისთვის დასაშვებ PII-ს;
- cursor/limit-ს და მაქსიმალურ bounding area-ს.

Courier GPS endpoint:

- მხოლოდ active shift;
- server-side courier identity;
- points batch;
- accuracy/clock sanity checks;
- rate limiting;
- short raw retention.

## 8. Security checklist

- OAuth/session auth მომხმარებლებისთვის;
- server-side RBAC ყველა endpoint-ზე;
- HMAC/signature verification webhook-ებზე;
- constant-time signature comparison;
- secrets მხოლოდ environment/secret manager-ში;
- credential rotation;
- outbound timeout და allowlisted base URL;
- request/response size limits;
- PII redaction logs-ში;
- rate limiting განსაკუთრებით webhooks/auth/location-ზე;
- audit log register/cancel/assign/replay/credential ცვლილებებზე;
- dependency და container scanning CI-ში.

## 9. Testing strategy

### Contract tests

თითო adapter-ს ერთი და იგივე test suite:

- canonical request mapping;
- authentication refresh;
- success response mapping;
- duplicate/idempotent create;
- validation error;
- timeout/429/5xx classification;
- unknown status;
- webhook signature და deduplication.

### Integration tests

- provider sandbox tests, თუ sandbox ხელმისაწვდომია;
- recorded/redacted fixtures;
- Zoommer delivered → Finished end-to-end;
- outbox worker concurrency;
- retry და dead-letter;
- PDF/ZPL golden snapshot;
- barcode scanner readability test რეალურ Zebra პრინტერზე.

### Operational acceptance

- label test ორივე DPI-ზე;
- ქართული მისამართის rendering/transliteration;
- offline/reconnect courier behavior;
- duplicate webhook;
- carrier outage;
- Neon/Vercel cold start;
- 100/1,000 order bulk assignment load test.

## 10. ინტეგრაციის იმპლემენტაციის წესი

რეალური provider adapter-ის დაწყებამდე საჭიროა:

1. ოფიციალური დოკუმენტაცია და sandbox credential;
2. sample request/response და error catalog;
3. status mapping workshop ოპერაციებთან;
4. idempotency/cancellation semantics;
5. webhook security და retry policy;
6. label ownership — provider label ვიყენებთ თუ ჩვენს A5 template-ს;
7. sandbox contract tests;
8. feature flag-ით შეზღუდული production rollout.

