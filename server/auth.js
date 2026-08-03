import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { getSql } from "./db.js";

const scryptAsync = promisify(scrypt);
const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;
const SCRYPT_N = 16_384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEY_LENGTH = 64;
const SESSION_COOKIE = "__Host-zoommer_session";
const LOCAL_SESSION_COOKIE = "zoommer_session";

function sha256(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

function cookieMap(request) {
  const result = new Map();
  for (const part of String(request.headers.get("cookie") || "").split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    result.set(part.slice(0, separator).trim(), part.slice(separator + 1).trim());
  }
  return result;
}

function sessionToken(request) {
  const cookies = cookieMap(request);
  return cookies.get(SESSION_COOKIE) || cookies.get(LOCAL_SESSION_COOKIE) || "";
}

export function isSameOriginRequest(request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export function requestFingerprint(request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || request.headers.get("x-real-ip") || "unknown";
  return {
    ipHash: sha256(ip),
    userAgent: String(request.headers.get("user-agent") || "unknown").slice(0, 320),
  };
}

export function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase().slice(0, 254);
}

export function isAcceptablePassword(value) {
  const password = String(value || "");
  return password.length >= 12 && password.length <= 128 && Buffer.byteLength(password, "utf8") <= 512;
}

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const derived = await scryptAsync(String(password), salt, SCRYPT_KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: 64 * 1024 * 1024,
  });
  return [
    "scrypt",
    SCRYPT_N,
    SCRYPT_R,
    SCRYPT_P,
    salt.toString("base64url"),
    Buffer.from(derived).toString("base64url"),
  ].join("$");
}

const dummyHashPromise = hashPassword(randomBytes(32).toString("base64url"));

export async function verifyPassword(password, encodedHash) {
  const candidate = encodedHash || await dummyHashPromise;
  const [algorithm, n, r, p, saltValue, hashValue] = String(candidate).split("$");
  if (algorithm !== "scrypt" || !saltValue || !hashValue) {
    await dummyHashPromise;
    return false;
  }

  try {
    const expected = Buffer.from(hashValue, "base64url");
    const actual = await scryptAsync(String(password), Buffer.from(saltValue, "base64url"), expected.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
      maxmem: 64 * 1024 * 1024,
    });
    return expected.length === actual.length && timingSafeEqual(expected, Buffer.from(actual));
  } catch {
    return false;
  }
}

export function identifierHash(email) {
  return sha256(normalizeEmail(email));
}

export async function createSession({ userId, request }) {
  const sql = getSql();
  const token = randomBytes(32).toString("base64url");
  const tokenHash = sha256(token);
  const { ipHash, userAgent } = requestFingerprint(request);
  await sql`
    insert into auth_sessions (token_hash, user_id, expires_at, user_agent, ip_hash)
    values (
      ${tokenHash},
      ${userId},
      now() + (${SESSION_MAX_AGE_SECONDS} * interval '1 second'),
      ${userAgent},
      ${ipHash}
    )
  `;
  return { token, tokenHash };
}

export function sessionCookieHeader(request, token) {
  const secure = new URL(request.url).protocol === "https:";
  const name = secure ? SESSION_COOKIE : LOCAL_SESSION_COOKIE;
  return [
    `${name}=${token}`,
    "Path=/",
    `Max-Age=${SESSION_MAX_AGE_SECONDS}`,
    "HttpOnly",
    "SameSite=Strict",
    secure ? "Secure" : "",
  ].filter(Boolean).join("; ");
}

export function clearSessionCookieHeader(request) {
  const secure = new URL(request.url).protocol === "https:";
  const name = secure ? SESSION_COOKIE : LOCAL_SESSION_COOKIE;
  return [
    `${name}=`,
    "Path=/",
    "Max-Age=0",
    "HttpOnly",
    "SameSite=Strict",
    secure ? "Secure" : "",
  ].filter(Boolean).join("; ");
}

export async function getSessionActor(request) {
  const token = sessionToken(request);
  if (!token || token.length > 128) return null;
  const tokenHash = sha256(token);
  const sql = getSql();
  const rows = await sql`
    select
      u.id,
      u.email,
      u.full_name,
      u.role,
      u.status,
      u.must_change_password,
      s.token_hash,
      s.expires_at
    from auth_sessions s
    join app_users u on u.id = s.user_id
    where s.token_hash = ${tokenHash}
      and s.expires_at > now()
      and u.status = 'active'
    limit 1
  `;
  if (!rows.length) return null;
  const user = rows[0];
  return {
    id: user.id,
    email: user.email,
    name: user.full_name,
    role: user.role,
    mustChangePassword: Boolean(user.must_change_password),
    sessionTokenHash: user.token_hash,
    mode: "session",
  };
}

export async function revokeSession(request) {
  const token = sessionToken(request);
  if (!token) return;
  const sql = getSql();
  await sql`delete from auth_sessions where token_hash = ${sha256(token)}`;
}

export function publicUser(actor) {
  if (!actor) return null;
  return {
    id: actor.id,
    email: actor.email,
    fullName: actor.name,
    role: actor.role,
    mustChangePassword: Boolean(actor.mustChangePassword),
  };
}
