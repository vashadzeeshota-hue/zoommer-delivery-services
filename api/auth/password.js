import { getSql } from "../../server/db.js";
import {
  getSessionActor,
  hashPassword,
  isAcceptablePassword,
  isSameOriginRequest,
  publicUser,
  verifyPassword,
} from "../../server/auth.js";
import { errorResponse, getRequestId, json } from "../../server/http.js";

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
      const actor = await getSessionActor(request);
      if (!actor) {
        return errorResponse("AUTH_REQUIRED", "Authentication required", 401, requestId);
      }

      const body = await request.json();
      const currentPassword = String(body.currentPassword || "");
      const newPassword = String(body.newPassword || "");
      if (!isAcceptablePassword(newPassword) || currentPassword === newPassword) {
        return errorResponse(
          "WEAK_PASSWORD",
          "ახალი პაროლი უნდა შეიცავდეს მინიმუმ 12 სიმბოლოს და განსხვავდებოდეს ძველისგან",
          400,
          requestId,
        );
      }

      const sql = getSql();
      const rows = await sql`
        select password_hash
        from app_users
        where id = ${actor.id}
        limit 1
      `;
      if (!rows.length || !(await verifyPassword(currentPassword, rows[0].password_hash))) {
        return errorResponse("INVALID_PASSWORD", "მიმდინარე პაროლი არასწორია", 401, requestId);
      }

      const passwordHash = await hashPassword(newPassword);
      await sql`
        with updated_user as (
          update app_users
          set
            password_hash = ${passwordHash},
            must_change_password = false,
            password_changed_at = now(),
            updated_at = now()
          where id = ${actor.id}
          returning id
        ),
        revoked_sessions as (
          delete from auth_sessions
          where user_id = ${actor.id}
            and token_hash <> ${actor.sessionTokenHash}
        )
        insert into audit_logs (
          actor_user_id, actor_type, action, entity_type, entity_id, correlation_id
        )
        select id, 'user', 'auth.password_changed', 'app_user', id, ${requestId}
        from updated_user
      `;

      return json(
        {
          ok: true,
          user: publicUser({ ...actor, mustChangePassword: false }),
        },
        200,
        { "X-Request-Id": requestId },
      );
    } catch (error) {
      console.error("auth_password_change_failed", { requestId, message: error.message });
      return errorResponse("AUTH_UNAVAILABLE", "პაროლის შეცვლა დროებით მიუწვდომელია", 503, requestId);
    }
  },
};
