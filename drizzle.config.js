import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./database/schema.js",
  out: "./database/drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL,
  },
  strict: true,
  verbose: true,
});
