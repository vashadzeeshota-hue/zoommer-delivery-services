import { getSql } from "../../server/db.js";
import { errorResponse, getRequestId, json } from "../../server/http.js";
import {
  createSession,
  identifierHash,
  isSameOriginRequest,
  normalizeEmail,
  publicUser,
  requestFingerprint,
  sessionCookieHeader,
  verifyPassword,
} from "../../server/auth.js";

const INVALID_LOGIN_MESSAGE = "ელფოსტა ან პაროლი არასწორია";

export default {
  async fetch(request) {
    const requestId = getRequestId(request);
    if (request.method !== "POST") {
      return errorResponse("METHOD_NOT_ALLOWED", "Method not allowed", 405, requestId);
    }
    if (!isSameOriginRequest(request)) {
      return errorResponse("INVALID_ORIGIN", "Request origin is not allowed", 403, requestId);
    }

    try {
      const contentLength = Number(request.headers.get("content-length") || 0);
      if (contentLength > 4096) {
        return errorResponse("INVALID_LOGIN", INVALID_LOGIN_MESSAGE, 400, requestId);
      }

      const body = await request.json();
      const email = normalizeEmail(body.email);
      const password = String(body.password || "");
      const emailHash = identifierHash(email);
      const { ipHash, userAgent } = requestFingerprint(request);
      const sql = getSql();

      const [identifierRows, ipRows, userRows] = await Promise.all([
        sql`
          select count(*)::int as failed_count
          from auth_login_attempts
          where identifier_hash = ${emailHash}
            and succeeded = false
            and attempted_at > now() - interval '15 minutes'
        `,
        sql`
          select count(*)::int as failed_count
          from auth_login_attempts
          where ip_hash = ${ipHash}
            and succeeded = false
            and attempted_at > now() - interval '15 minutes'
        `,
        sql`
          select id, email, full_name, role, status, password_hash, must_change_password
          from app_users
          where lower(email) = ${email}
          limit 1
        `,
      ]);

      if (Number(identifierRows[0]?.failed_count || 0) >= 5 || Number(ipRows[0]?.failed_count || 0) >= 20) {
        return errorResponse(
          "LOGIN_RATE_LIMITED",
          "ძალიან ბევრი მცდელობაა. სცადეთ 15 წუთში.",
          429,
          requestId,
        );
      }

      const user = userRows[0];
      const passwordMatches = await verifyPassword(password, user?.password_hash);
      const valid = Boolean(
        email &&
        password.length <= 128 &&
        user &&
        user.status === "active" &&
        passwordMatches,
      );

      await sql`
        insert into auth_login_attempts (identifier_hash, ip_hash, succeeded)
        values (${emailHash}, ${ipHash}, ${valid})
      `;

      if (!valid) {
        return errorResponse("INVALID_CREDENTIALS", INVALID_LOGIN_MESSAGE, 401, requestId);
      }

      const actor = {
        id: user.id,
        email: user.email,
        name: user.full_name,
        role: user.role,
        mustChangePassword: Boolean(user.must_change_password),
      };
      const session = await createSession({ userId: user.id, request });

      await Promise.all([
        sql`
          update app_users
          set last_login_at = now(), updated_at = now()
          where id = ${user.id}
        `,
        sql`
          delete from auth_login_attempts
          where identifier_hash = ${emailHash}
            and succeeded = false
        `,
        sql`
          insert into audit_logs (
            actor_user_id, actor_type, action, entity_type, entity_id,
            after_data, correlation_id
          ) values (
            ${user.id}, 'user', 'auth.login', 'app_user', ${user.id},
            ${JSON.stringify({ userAgent })}::jsonb, ${requestId}
          )
        `,
      ]);

      return json(
        { authenticated: true, user: publicUser(actor) },
        200,
        {
          "Set-Cookie": sessionCookieHeader(request, session.token),
          "X-Request-Id": requestId,
        },
      );
    } catch (error) {
      console.error("auth_login_failed", { requestId, message: error.message });
      return errorResponse("AUTH_UNAVAILABLE", "ავტორიზაცია დროებით მიუწვდომელია", 503, requestId);
    }
  },
};
