# Zoommer Delivery Services

Zoommer.ge-ს შეკვეთების, გარე გადამზიდავების და შიდა კურიერების მართვის პლატფორმა.

## ტექნიკური დოკუმენტაცია

- [სისტემის არქიტექტურა](docs/ARCHITECTURE.md)
- [PostgreSQL/PostGIS მონაცემთა მოდელი](docs/DATABASE_SCHEMA.md)
- [API და ინტეგრაციების სტრუქტურა](docs/API_INTEGRATIONS.md)
- [პროექტის განვითარების გეგმა](docs/PROJECT_DEVELOPMENT_PLAN.md)

## მიმდინარე ტექნოლოგიური საფუძველი

- React + Vite
- Vercel Functions
- Neon Serverless Postgres
- Drizzle ORM

## A5 ეტიკეტები და Zebra Print

რეგისტრაციების გვერდზე tracking კოდის მქონე გზავნილისთვის ხელმისაწვდომია რეალური Code 128 და QR ეტიკეტი, A5 ბრაუზერული ბეჭდვა/`Save as PDF` და 203 ან 300 DPI ZPL ფაილი.

ცალკე **ბეჭდვის ცენტრი** აჩვენებს ყველა ორდერს და ოპერატორს აძლევს A5 preview-ს, ბრაუზერულ ბეჭდვა/`Save as PDF`-ს, ZPL ჩამოტვირთვასა და Zebra Browser Print-ით პირდაპირ ბეჭდვას. Carrier tracking-ის მიღებამდე ბარკოდად გამოიყენება ორდერის უსაფრთხო reference-კოდი; მიღების შემდეგ ეტიკეტი ავტომატურად carrier tracking-ზე გადადის.

ბეჭდვის რიგი იფილტრება ზუსტი დღის, მიწოდების მეთოდის, ბეჭდვის სტატუსისა და კოდის წყაროს მიხედვით. A5 ან Zebra ბეჭდვის წარმატებული ინიციაციის შემდეგ ეტიკეტს ენიჭება `printed` მდგომარეობა და მოქმედება იცვლება „ხელახალი ბეჭდვა“-ზე. მდგომარეობა ინახება Neon-ში ავტორიზებული write რეჟიმისას და ბრაუზერის local storage-ში read-only/demo რეჟიმის fallback-ად.

პირდაპირი `Zebra Print`-ისთვის ოპერატორის Windows ან macOS კომპიუტერზე უნდა იყოს დაყენებული [Zebra Browser Print](https://www.zebra.com/us/en/support-downloads/software/printer-software/browser-print.html), ხოლო Zebra პრინტერი არჩეული უნდა იყოს default მოწყობილობად. ქსელური პრინტერი და ოპერატორის კომპიუტერი ერთ ქსელში უნდა იყვნენ. ქართული ტექსტის ZPL-ით დასაბეჭდად პრინტერს სჭირდება შესაბამისი Unicode/TrueType ფონტი; Code 128 და QR tracking კოდები ASCII-ით იბეჭდება და ფონტზე დამოკიდებული არ არის.

## მისამართები და რუკა

ხელით დამატებულ ორდერში შესაძლებელია მისამართის მოძებნა, ვარიანტის არჩევა, რუკაზე pin-ის დასმა/გადაადგილება და GPS მდებარეობის გამოყენება. Lat/Lng და საფოსტო ინდექსი ინახება ორდერის `metadata.location` ველში. ოპერაციულ რუკაზე ორდერები და კურიერები ავტომატურად ჯგუფდება marker cluster-ებად.

რუკა იყენებს Leaflet-სა და OpenStreetMap-ს. Geocoding proxy ნაგულისხმევად მიმართავს Photon-ის საჯარო demo სერვერს; დიდი production დატვირთვისთვის `PHOTON_BASE_URL` უნდა მიეთითოს საკუთარ ან SLA-ით უზრუნველყოფილ Photon-compatible სერვისზე.

არსებული აპლიკაცია არის MVP. სამიზნე არქიტექტურა აღწერილია ზემოთ მოცემულ დოკუმენტებში და უნდა დაინერგოს ეტაპობრივად, მოქმედი ინტერფეისის შეწყვეტის გარეშე.

## Employee authentication

The platform uses first-party email/password authentication backed by Neon Postgres. Passwords are stored as salted `scrypt` hashes; sessions use random tokens whose hashes are stored in the database. The browser receives an `HttpOnly`, `Secure`, `SameSite=Strict` cookie with an eight-hour lifetime. Newly created accounts must replace their temporary password on first sign-in.

Apply database migrations before creating an employee:

```powershell
npm run db:migrate
$env:BOOTSTRAP_USER_EMAIL="employee@zoommer.ge"
$env:BOOTSTRAP_USER_PASSWORD="a-long-temporary-password"
$env:BOOTSTRAP_USER_NAME="Employee Name"
$env:BOOTSTRAP_USER_ROLE="operator"
npm run user:create
```

The bootstrap password is never written to the repository. Running `user:create` again updates that employee, invalidates active sessions, and requires another password change at the next sign-in.
