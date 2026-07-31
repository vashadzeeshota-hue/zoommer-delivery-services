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
