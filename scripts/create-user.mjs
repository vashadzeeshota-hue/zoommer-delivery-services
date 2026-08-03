import { neon } from "@neondatabase/serverless";
import { hashPassword, isAcceptablePassword, normalizeEmail } from "../server/auth.js";

const databaseUrl = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
const email = normalizeEmail(process.env.BOOTSTRAP_USER_EMAIL);
const password = String(process.env.BOOTSTRAP_USER_PASSWORD || "");
const fullName = String(process.env.BOOTSTRAP_USER_NAME || email.split("@")[0] || "Zoommer User").trim();
const role = String(process.env.BOOTSTRAP_USER_ROLE || "operator").trim();

if (!databaseUrl) throw new Error("DATABASE_URL_UNPOOLED or DATABASE_URL is required");
if (!email || !email.includes("@")) throw new Error("BOOTSTRAP_USER_EMAIL is required");
if (!isAcceptablePassword(password)) throw new Error("BOOTSTRAP_USER_PASSWORD must contain 12–128 characters");
if (!new Set(["admin", "operator", "courier"]).has(role)) throw new Error("BOOTSTRAP_USER_ROLE is invalid");

const sql = neon(databaseUrl);
const passwordHash = await hashPassword(password);
const rows = await sql`
  with saved_user as (
    insert into app_users (
      email, full_name, role, status, password_hash, must_change_password
    ) values (
      ${email}, ${fullName}, ${role}, 'active', ${passwordHash}, true
    )
    on conflict (email) do update set
      full_name = excluded.full_name,
      role = excluded.role,
      status = 'active',
      password_hash = excluded.password_hash,
      must_change_password = true,
      updated_at = now()
    returning id, email, full_name, role
  ),
  revoked_sessions as (
    delete from auth_sessions
    where user_id = (select id from saved_user)
  )
  select email, full_name, role from saved_user
`;

console.log(`Created ${rows[0].email} (${rows[0].role})`);
