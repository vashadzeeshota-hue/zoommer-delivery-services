import { neon } from "@neondatabase/serverless";
import { randomUUID } from "node:crypto";
import { normalizeEmail } from "../server/auth.js";

const databaseUrl = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
const email = normalizeEmail(process.env.TARGET_USER_EMAIL);
const role = String(process.env.TARGET_USER_ROLE || "").trim();
const correlationId = randomUUID();

if (!databaseUrl) throw new Error("DATABASE_URL_UNPOOLED or DATABASE_URL is required");
if (!email || !email.includes("@")) throw new Error("TARGET_USER_EMAIL is required");
if (!new Set(["admin", "operator", "courier"]).has(role)) {
  throw new Error("TARGET_USER_ROLE must be admin, operator, or courier");
}

const sql = neon(databaseUrl);
const rows = await sql`
  with updated_user as (
    update app_users
    set role = ${role}, updated_at = now()
    where lower(email) = ${email}
    returning id, email, full_name, role, must_change_password
  ),
  audit_record as (
    insert into audit_logs (
      actor_user_id, actor_type, action, entity_type, entity_id, after_data,
      correlation_id
    )
    select
      id,
      'system',
      'auth.role_updated',
      'app_user',
      id,
      jsonb_build_object('role', role),
      ${correlationId}
    from updated_user
  )
  select email, full_name, role, must_change_password
  from updated_user
`;

if (rows.length !== 1) throw new Error(`User not found: ${email}`);
console.log(JSON.stringify(rows[0]));
