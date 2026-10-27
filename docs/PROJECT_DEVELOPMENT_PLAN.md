# Zoommer Delivery — პროექტის განვითარების გეგმა

**ვერსია:** 1.0  
**თარიღი:** 2026-10-27  
**სამიზნე:** მოქმედი MVP-დან უსაფრთხო, დაკვირვებადი და მასშტაბირებადი production პლატფორმის მიღება.

## 1. პროდუქტის მიზანი

ერთ სივრცეში გაერთიანდეს:

- Zoommer.ge-დან იკომერს შეკვეთების მიღება და სტატუსების ორმხრივი სინქრონიზაცია;
- სწრაფი, სტანდარტული და დაგეგმილი მიწოდებების დამუშავება;
- საქართველოს ფოსტის, TNT Express-ის, QuickShipper-ის და შიდა კურიერების მართვა;
- ფილიალიდან მიწოდება და ფილიალიდან ნივთის გაცემა;
- A5 ეტიკეტის, Code 128/QR კოდის და Zebra ბეჭდვის პროცესი;
- კურიერების მინიჭება, GPS მონიტორინგი, ჩაბარების დასტური და გამონაკლისების მართვა;
- სრული audit trail, ანგარიშგება და ოპერაციული მონიტორინგი.

## 2. არსებული მდგომარეობა

### უკვე განხორციელებულია

- React/Vite dashboard და Vercel deployment;
- Neon Serverless Postgres და versioned migrations;
- თანამშრომლის email/password ავტორიზაცია, დაცული session cookie და როლები;
- Admin, Operator და Courier უფლებების საწყისი მოდელი;
- Zoommer და ხელით დამატებული ორდერების ერთიანი სია;
- სწრაფი, სტანდარტული და დაგეგმილი სერვისების UI/ბიზნეს-წესები;
- ორდერის inline დეტალები და დამუშავების მოქმედებები;
- ორდერის დანიშნულების, სერვისისა და სტატუსის ცხრილიდან რედაქტირება;
- ფილიალიდან გაცემა და ფილიალიდან მიწოდება;
- branch-level access-ის მონაცემთა მოდელი;
- A5 label preview, Code 128, QR, PDF/browser print და ZPL;
- ბეჭდვის ფილტრები, `printed` მდგომარეობა და ხელახალი ბეჭდვა;
- Leaflet/OpenStreetMap მისამართის pinning და ოპერაციული რუკა;
- carrier adapter contract და შიდა კურიერის საწყისი adapter;
- outbox, audit log, shipment, tracking და assignment ცხრილების საფუძველი;
- სატესტო მონაცემების seed პროცესი.

### მთავარი დარჩენილი ხარვეზები

1. Zoommer.ge-ს რეალური API კონტრაქტი და production სინქრონიზაცია არ არის დასრულებული.
2. Georgian Post, TNT Express და QuickShipper production adapter-ები არ არის რეალიზებული.
3. webhook/polling, retry worker და dead-letter ოპერაციები სრულად არ მუშაობს.
4. კურიერის რეალური სამუშაო სივრცე, GPS telemetry და proof-of-delivery დასასრულებელია.
5. ავტომატური unit/integration/E2E ტესტები და CI quality gates დასამატებელია.
6. production monitoring, alerting, backup/restore drill და runbook-ები მოსამზადებელია.
7. branch access ყველა API endpoint-ზე ერთნაირად უნდა აღსრულდეს და გაიტესტოს.

## 3. განვითარების პრინციპები

- **API-first:** ყველა გარე ინტეგრაცია ფიქსირებული, versioned კონტრაქტით.
- **Adapter pattern:** provider-ის სპეციფიკა არ უნდა მოხვდეს core order workflow-ში.
- **Idempotency:** order intake, shipment registration, webhook და status sync უნდა უძლებდეს განმეორებას.
- **Outbox-first reliability:** გარე API-ის გამოძახება transaction-ის დასრულების შემდეგ, retry queue-ით.
- **Least privilege:** UI-ის დამალვა არ კმარა; უფლებები მოწმდება API და მონაცემთა დონეზე.
- **Auditability:** სტატუსის, მინიჭების, ბეჭდვისა და მონაცემის ყველა მნიშვნელოვანი ცვლილება ინახება.
- **Incremental delivery:** ყოველი ეტაპი უნდა იყოს დამოუკიდებლად სატესტო და deployable.
- **No secret in repository:** credential-ები მხოლოდ Vercel/Neon-ის დაცულ environment variables-ში.

## 4. ეტაპობრივი გეგმა

საერთო სავარაუდო ხანგრძლივობაა **14–18 კვირა**. ვადები დამოკიდებულია გარე API დოკუმენტაციისა და credential-ების დროულ მიღებაზე.

### ეტაპი 0 — კონტრაქტები და გადაწყვეტილებები

**ხანგრძლივობა:** 1 კვირა  
**პრიორიტეტი:** P0

სამუშაოები:

- Zoommer.ge order intake და status update payload-ების დამტკიცება;
- Georgian Post, TNT და QuickShipper sandbox/production credential-ების მიღება;
- provider webhook-ების, polling-ის, rate limit-ის და label ფორმატის დადასტურება;
- order/status canonical mapping-ის დამტკიცება;
- ფილიალების master-data წყაროს და განახლების წესის განსაზღვრა;
- background execution-ის არჩევა: Vercel Cron + Neon outbox ან მუდმივი worker;
- გარემოების განსაზღვრა: local, preview/staging და production;
- მონაცემთა retention, პირადი ნომრის masking და წვდომის პოლიტიკის დამტკიცება.

**შედეგი:** ხელმოწერილი integration contract, status matrix, credential checklist და Architecture Decision Records.

**მიღების კრიტერიუმი:** უცნობი ველი ან სტატუსი არ რჩება core integration-ის იმპლემენტაციის დასაწყებად.

### ეტაპი 1 — პლატფორმის გამყარება

**ხანგრძლივობა:** 2 კვირა  
**პრიორიტეტი:** P0

სამუშაოები:

- migration history-ის შემოწმება და staging database-ის შექმნა;
- API validation-ის ერთიანი სქემები და სტანდარტული error response;
- request ID, structured logs და audit correlation;
- login/write endpoint-ებზე rate limiting და abuse protection;
- branch access-ის server-side enforcement;
- sensitive მონაცემების masking UI-ში, log-ებში და exports-ში;
- unit tests ბიზნეს-წესებისთვის: cutoff, scheduled window, status transitions;
- API integration tests auth/RBAC/idempotency-ზე;
- Playwright smoke tests კრიტიკულ dashboard flow-ებზე;
- GitHub Actions: lint, test, build და migration validation.

**შედეგი:** staging-ready baseline და ავტომატური quality gate.

**მიღების კრიტერიუმი:** main branch-ზე ვერ ხვდება ცვლილება, თუ lint/test/build ვერ გადის; ყველა write endpoint ავტორიზებული და audit-ირებულია.

### ეტაპი 2 — Zoommer.ge ინტეგრაცია

**ხანგრძლივობა:** 2–3 კვირა  
**პრიორიტეტი:** P0

სამუშაოები:

- order intake endpoint ან scheduled pull, შეთანხმებული კონტრაქტის მიხედვით;
- HMAC/API-key signature verification;
- idempotency key და duplicate order handling;
- payload validation და rejected-order queue;
- Zoommer order ID-სა და internal order ID-ს მუდმივი კავშირი;
- მიღების, განახლებისა და გაუქმების event-ების დამუშავება;
- `delivered` → Zoommer `Finished` ავტომატური sync;
- exponential backoff, max attempts და dead-letter მდგომარეობა;
- ხელით retry/replay ადმინისტრატორისთვის;
- reconciliation job: Zoommer და delivery პლატფორმის სტატუსების შედარება.

**შედეგი:** ორდერი ავტომატურად ხვდება პლატფორმაში და დასრულებული მიწოდება საიმედოდ ბრუნდება Zoommer-ში.

**მიღების კრიტერიუმი:** ერთი payload-ის მრავალჯერ გაგზავნა ქმნის მხოლოდ ერთ ორდერს; დროებით წარუმატებელი sync ავტომატურად აღდგება.

### ეტაპი 3 — გარე გადამზიდავების adapter-ები

**ხანგრძლივობა:** 3–4 კვირა  
**პრიორიტეტი:** P0

იმპლემენტაციის რიგი:

1. QuickShipper — სწრაფი მიწოდება;
2. Georgian Post — სტანდარტული მიწოდება;
3. TNT Express — სტანდარტული მიწოდება.

თითოეული adapter-ის სამუშაოები:

- authentication/token lifecycle;
- create/cancel shipment;
- tracking code და provider label-ის მიღება;
- provider status → canonical status mapping;
- webhook signature verification ან polling fallback;
- timeout, retryable/non-retryable error classification;
- rate limit და circuit-breaker ქცევა;
- sanitized request/response metadata audit-ისთვის;
- sandbox contract tests და failure simulations.

**შედეგი:** ერთი core workflow სამივე provider-ს ერთიანი contract-ით მართავს.

**მიღების კრიტერიუმი:** sandbox-ში shipment registration, tracking update, cancellation და label flow წარმატებით გადის; provider outage ორდერს არ კარგავს.

### ეტაპი 4 — ოპერატორის სრული სამუშაო პროცესი

**ხანგრძლივობა:** 2–3 კვირა  
**პრიორიტეტი:** P1

სამუშაოები:

- მკაცრი order/shipment status state machine;
- bulk selection და bulk registration/assignment;
- validation warnings არასრული მისამართის, ტელეფონის ან ზომისთვის;
- exception inbox პასუხისმგებელი პირით, მიზეზით და SLA-ით;
- retry/cancel/reassign მოქმედებები შესაბამისი უფლებებით;
- tracking timeline რეალური events-იდან;
- order notes და internal comments;
- Saved filters და CSV export უფლებების გათვალისწინებით;
- label generation-ის server-side snapshot და print audit;
- Zebra Browser Print deployment/runbook ფილიალის მოწყობილობებისთვის.

**შედეგი:** ოპერატორი ორდერს მიღებიდან რეგისტრაციამდე და პრობლემის გადაწყვეტამდე ერთ სივრცეში მართავს.

**მიღების კრიტერიუმი:** კრიტიკული workflow არ საჭიროებს მონაცემთა ბაზაში ხელით ჩარევას.

### ეტაპი 5 — კურიერის ოპერაციები და გეოლოკაცია

**ხანგრძლივობა:** 3 კვირა  
**პრიორიტეტი:** P1

სამუშაოები:

- mobile-first courier workspace/PWA;
- მხოლოდ საკუთარ დავალებებზე წვდომა;
- pickup, in-transit, delivered, failed და returned მოქმედებები;
- GPS opt-in, telemetry interval და last-seen indicator;
- city/zone-based batch assignment;
- რუკაზე clustering, courier location და delivery density;
- proof of delivery: მიმღები, დრო, GPS და საჭიროების შემთხვევაში ფოტო/ხელმოწერა;
- failed-delivery reason codes და შემდეგი მცდელობის დაგეგმვა;
- offline/poor-network retry strategy.

**შედეგი:** კურიერი ტელეფონიდან ასრულებს დავალებას, ოპერატორი კი პროგრესს რეალურ დროში ხედავს.

**მიღების კრიტერიუმი:** ჩაბარების event audit-ირებულია და ავტომატურად იწყებს Zoommer Finished sync-ს.

### ეტაპი 6 — ფილიალის ოპერაციების დასრულება

**ხანგრძლივობა:** 2 კვირა  
**პრიორიტეტი:** P1

სამუშაოები:

- ფილიალების authoritative sync;
- user-to-branch access მართვის ადმინისტრაციული UI;
- branch delivery და branch pickup ცალკე state machine-ებით;
- პროდუქტის რაოდენობისა და serial number-ის validation;
- „სხვა გაიტანს“ მონაცემების უსაფრთხო შენახვა და masking;
- მზადაა/გაცემულია transition და გამცემის audit;
- branch reports: მზადაა, ვადაგადაცილებული, გაცემული, გაუქმებული;
- მონაცემების export მხოლოდ შესაბამისი უფლებით.

**შედეგი:** ფილიალის თანამშრომელი ხედავს და მართავს მხოლოდ მის ფილიალზე დაშვებულ ოპერაციებს.

**მიღების კრიტერიუმი:** სხვა ფილიალის ჩანაწერზე წვდომა იბლოკება როგორც UI-დან, ისე პირდაპირი API მოთხოვნით.

### ეტაპი 7 — რეპორტინგი, მონიტორინგი და production launch

**ხანგრძლივობა:** 1–2 კვირა  
**პრიორიტეტი:** P0 launch gate

სამუშაოები:

- dashboard KPI-ები რეალური მონაცემებით;
- provider SLA, first-attempt success და exception rate;
- outbox lag, webhook failures და carrier error alerts;
- frontend/backend error monitoring;
- uptime checks და synthetic critical-flow test;
- Neon backup/restore drill;
- incident, credential rotation და provider outage runbook-ები;
- load test შეთანხმებულ პიკურ მოცულობაზე;
- UAT: ოპერატორი, ფილიალი, კურიერი და ადმინისტრატორი;
- pilot rollout ერთ ფილიალსა და შეზღუდულ order volume-ზე;
- rollback გეგმა და ეტაპობრივი სრული გაშვება.

**შედეგი:** მონიტორინგით დაცული და მხარდაჭერისთვის მზად production სისტემა.

**მიღების კრიტერიუმი:** ყველა go-live gate შესრულებულია და pilot-ის კრიტიკული ხარვეზები დახურულია.

## 5. პრიორიტეტული backlog

### P0 — production-ისთვის სავალდებულო

- Zoommer order intake და Finished sync;
- provider adapter-ები და status mapping;
- retry/outbox worker და dead-letter მართვა;
- API validation, RBAC და branch scoping;
- audit logs და sensitive-data masking;
- CI tests, monitoring, alerting და runbook;
- backup/restore და UAT.

### P1 — ოპერაციული ეფექტიანობა

- bulk processing;
- courier mobile workflow და GPS;
- exception management;
- branch access admin UI;
- რეალური tracking timeline;
- SLA და ოპერაციული reports.

### P2 — მასშტაბირება და ოპტიმიზაცია

- route optimization;
- heatmap და demand forecasting;
- provider-ის ავტომატური არჩევა ფასის/SLA-ის მიხედვით;
- მომხმარებლის notification-ები;
- advanced analytics და scheduled reports;
- მრავალსაწყობიანი inventory handoff.

## 6. შემდეგი Sprint — რეკომენდებული 10 ამოცანა

1. Staging Neon branch და Vercel Preview environment-ის გამართვა.
2. GitHub Actions-ში lint/build/test pipeline-ის დამატება.
3. status transition state machine-ის კოდში ფორმალიზება.
4. API request validation-ის ერთიანი მოდულის დამატება.
5. outbox worker-ის retry/backoff/dead-letter წესების დასრულება.
6. Zoommer order intake contract fixture-ებისა და mock server-ის შექმნა.
7. Zoommer intake idempotency integration test.
8. Zoommer Finished sync-ის mock adapter და replay UI.
9. QuickShipper adapter skeleton + sandbox contract test.
10. monitoring-ისთვის request ID და structured error logs.

## 7. ხარისხის და უსაფრთხოების მოთხოვნები

### ტესტირება

- unit tests: ბიზნეს-წესები და mapper-ები;
- integration tests: database, auth, RBAC, idempotency და outbox;
- contract tests: Zoommer და ყველა carrier;
- E2E tests: order intake → registration → delivery → Finished sync;
- visual smoke tests: dashboard, printing და mobile courier flow;
- load tests: შეთანხმებული peak orders/hour და concurrent operators.

### უსაფრთხოება

- HttpOnly/Secure/SameSite session cookie;
- CSRF/same-origin დაცვა ყველა write endpoint-ზე;
- secret rotation და გარემოების გამიჯვნა;
- პირადი ნომრის encryption ან tokenization-ის გადაწყვეტილება;
- masking default-ად და audit ყველა unmask/export მოქმედებაზე;
- session revocation, role/branch change propagation;
- dependency და vulnerability scanning CI-ში.

### საიმედოობა

- ყველა გარე მოთხოვნას აქვს timeout;
- retry ხდება მხოლოდ retryable შეცდომაზე;
- idempotency იცავს duplicate shipment-სა და duplicate Finished update-ს;
- dead-letter event ჩანს ადმინისტრატორისთვის;
- reconciliation job პოულობს დაკარგულ ან აცდენილ სტატუსს;
- provider outage არ ბლოკავს ახალი ორდერების მიღებას.

## 8. გასაზომი KPI-ები

- მიღებული ორდერების წარმატებული ingest: **≥ 99.9%**;
- duplicate order/shipment: **0**;
- provider registration success პირველ ცდაზე: **≥ 98%**;
- retry-ის შემდეგ საბოლოო წარმატება: **≥ 99.5%**;
- delivered → Zoommer Finished sync: **≤ 5 წუთი**;
- order registration-ის ოპერატორის საშუალო დრო: **≤ 60 წამი**;
- label print failure: **< 1%**;
- first-attempt delivery success და SLA compliance — provider/ქალაქის ჭრილში;
- კრიტიკული incident-ის აღმოჩენის დრო: **≤ 5 წუთი**.

საწყისი KPI-ები pilot-ის რეალური მოცულობის მიხედვით უნდა დაკალიბრდეს.

## 9. დამოკიდებულებები და რისკები

| რისკი/დამოკიდებულება | გავლენა | შემცირების გზა |
|---|---|---|
| გარე API დოკუმენტაცია ან credential გვიან მოდის | P0 ინტეგრაციების შეფერხება | mock server, contract fixtures და adapter skeleton წინასწარ |
| provider-ს webhook არ აქვს | სტატუსი იგვიანებს | adaptive polling + reconciliation job |
| provider-ის არასტაბილური API | duplicate/დაკარგული ოპერაცია | idempotency, timeout, retry, circuit breaker, dead-letter |
| არასრული მისამართები | ჩაბარების შეფერხება | validation, geocoding confidence და operator correction queue |
| პირადი მონაცემების ზედმეტი ხილვადობა | უსაფრთხოებისა და შესაბამისობის რისკი | masking, branch scope, audit, retention policy |
| Zebra მოწყობილობების განსხვავებული კონფიგურაცია | ბეჭდვის ჩავარდნა | device checklist, test label, fallback PDF და support runbook |
| real-time GPS-ის მაღალი სიხშირე | ხარჯი და privacy | opt-in, გონივრული interval, retention და last-known-location რეჟიმი |

## 10. Go-live checklist

- [ ] ყველა P0 ინტეგრაციის sandbox და production credential დამოწმებულია;
- [ ] Zoommer და carrier contract tests გადის;
- [ ] migration staging-ზე და production dry-run-ზე გადის;
- [ ] role/branch permission matrix UAT-ით შემოწმებულია;
- [ ] backup/restore drill შესრულებულია;
- [ ] alerts და პასუხისმგებელი პირები განსაზღვრულია;
- [ ] incident, outage, retry და rollback runbook მზადაა;
- [ ] Zebra მოწყობილობები pilot ლოკაციაზე შემოწმებულია;
- [ ] pilot KPI-ები მისაღებ ზღვარშია;
- [ ] ბიზნესის, ოპერაციების და IT-ის go-live თანხმობა მიღებულია.

## 11. Definition of Done

ამოცანა დასრულებულად ითვლება მხოლოდ მაშინ, როცა:

1. business rule და acceptance criteria დადასტურებულია;
2. code review და ავტომატური ტესტები წარმატებულია;
3. migration/backward compatibility შემოწმებულია;
4. RBAC, audit და error handling დაფარულია;
5. staging-ზე user flow გაიარა;
6. საჭირო monitoring და runbook განახლებულია;
7. შესაბამისი ტექნიკური დოკუმენტაცია განახლებულია.

