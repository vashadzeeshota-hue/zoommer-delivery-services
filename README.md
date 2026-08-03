# Zoommer Delivery Services

Zoommer.ge-ს შეკვეთების, გარე გადამზიდავების და შიდა კურიერების მართვის პლატფორმა.

## ტექნიკური დოკუმენტაცია

- [სისტემის არქიტექტურა](docs/ARCHITECTURE.md)
- [PostgreSQL/PostGIS მონაცემთა მოდელი](docs/DATABASE_SCHEMA.md)
- [API და ინტეგრაციების სტრუქტურა](docs/API_INTEGRATIONS.md)

## მიმდინარე ტექნოლოგიური საფუძველი

- React + Vite
- Vercel Functions
- Neon Serverless Postgres
- Drizzle ORM

## A5 ეტიკეტები და Zebra Print

რეგისტრაციების გვერდზე tracking კოდის მქონე გზავნილისთვის ხელმისაწვდომია რეალური Code 128 და QR ეტიკეტი, A5 ბრაუზერული ბეჭდვა/`Save as PDF` და 203 ან 300 DPI ZPL ფაილი.

პირდაპირი `Zebra Print`-ისთვის ოპერატორის Windows ან macOS კომპიუტერზე უნდა იყოს დაყენებული [Zebra Browser Print](https://www.zebra.com/us/en/support-downloads/software/printer-software/browser-print.html), ხოლო Zebra პრინტერი არჩეული უნდა იყოს default მოწყობილობად. ქსელური პრინტერი და ოპერატორის კომპიუტერი ერთ ქსელში უნდა იყვნენ. ქართული ტექსტის ZPL-ით დასაბეჭდად პრინტერს სჭირდება შესაბამისი Unicode/TrueType ფონტი; Code 128 და QR tracking კოდები ASCII-ით იბეჭდება და ფონტზე დამოკიდებული არ არის.

## მისამართები და რუკა

ხელით დამატებულ ორდერში შესაძლებელია მისამართის მოძებნა, ვარიანტის არჩევა, რუკაზე pin-ის დასმა/გადაადგილება და GPS მდებარეობის გამოყენება. Lat/Lng და საფოსტო ინდექსი ინახება ორდერის `metadata.location` ველში. ოპერაციულ რუკაზე ორდერები და კურიერები ავტომატურად ჯგუფდება marker cluster-ებად.

რუკა იყენებს Leaflet-სა და OpenStreetMap-ს. Geocoding proxy ნაგულისხმევად მიმართავს Photon-ის საჯარო demo სერვერს; დიდი production დატვირთვისთვის `PHOTON_BASE_URL` უნდა მიეთითოს საკუთარ ან SLA-ით უზრუნველყოფილ Photon-compatible სერვისზე.

არსებული აპლიკაცია არის MVP. სამიზნე არქიტექტურა აღწერილია ზემოთ მოცემულ დოკუმენტებში და უნდა დაინერგოს ეტაპობრივად, მოქმედი ინტერფეისის შეწყვეტის გარეშე.
