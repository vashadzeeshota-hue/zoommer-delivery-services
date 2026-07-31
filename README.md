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

არსებული აპლიკაცია არის MVP. სამიზნე არქიტექტურა აღწერილია ზემოთ მოცემულ დოკუმენტებში და უნდა დაინერგოს ეტაპობრივად, მოქმედი ინტერფეისის შეწყვეტის გარეშე.
