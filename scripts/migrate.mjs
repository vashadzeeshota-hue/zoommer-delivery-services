import { readFile } from "node:fs/promises";
import { neon } from "@neondatabase/serverless";

const migrationUrl = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

if (!migrationUrl) {
  console.error("DATABASE_URL_UNPOOLED or DATABASE_URL is required.");
  process.exit(1);
}

const sql = neon(migrationUrl);
const files = [
  "database/001_initial.sql",
  "database/002_seed.sql",
  "database/003_anonymize_demo.sql",
];

for (const file of files) {
  const source = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
  const statements = source
    .split("-- statement-breakpoint")
    .map((statement) => statement.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await sql.query(statement);
  }

  console.log(`Applied ${file}`);
}

console.log("Database is ready.");
