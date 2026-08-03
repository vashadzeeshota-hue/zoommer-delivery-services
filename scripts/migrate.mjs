import { readFile, readdir } from "node:fs/promises";
import { neon } from "@neondatabase/serverless";

const migrationUrl = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

if (!migrationUrl) {
  console.error("DATABASE_URL_UNPOOLED or DATABASE_URL is required.");
  process.exit(1);
}

const sql = neon(migrationUrl);
const databaseDirectory = new URL("../database/", import.meta.url);
const files = (await readdir(databaseDirectory))
  .filter((file) => /^\d{3}_.+\.sql$/.test(file))
  .sort((left, right) => left.localeCompare(right))
  .map((file) => `database/${file}`);

await sql`
  create table if not exists schema_migrations (
    filename text primary key,
    applied_at timestamptz not null default now()
  )
`;

const [ledgerCount, existingSchema] = await Promise.all([
  sql`select count(*)::int as count from schema_migrations`,
  sql`
    select exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'delivery_orders'
        and column_name = 'service_variant'
    ) as phase_one_ready
  `,
]);

if (Number(ledgerCount[0]?.count || 0) === 0 && existingSchema[0]?.phase_one_ready) {
  for (const file of files.filter((name) => name < "database/007_")) {
    await sql`insert into schema_migrations (filename) values (${file}) on conflict do nothing`;
  }
  console.log("Baselined database/001–006 migrations");
}

for (const file of files) {
  const applied = await sql`select 1 from schema_migrations where filename = ${file}`;
  if (applied.length) {
    console.log(`Skipped ${file}`);
    continue;
  }

  const source = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
  const statements = source
    .split("-- statement-breakpoint")
    .map((statement) => statement.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await sql.query(statement);
  }

  await sql`insert into schema_migrations (filename) values (${file})`;

  console.log(`Applied ${file}`);
}

console.log("Database is ready.");
