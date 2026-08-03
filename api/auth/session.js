import { getSessionActor, publicUser } from "../../server/auth.js";
import { errorResponse, getRequestId, json } from "../../server/http.js";

export default {
  async fetch(request) {
    const requestId = getRequestId(request);
    if (request.method !== "GET") {
      return errorResponse("METHOD_NOT_ALLOWED", "Method not allowed", 405, requestId);
    }

    try {
      const actor = await getSessionActor(request);
      if (!actor) {
        return errorResponse("AUTH_REQUIRED", "Authentication required", 401, requestId);
      }
      return json(
        { authenticated: true, user: publicUser(actor) },
        200,
        { "X-Request-Id": requestId },
      );
    } catch (error) {
      console.error("auth_session_failed", { requestId, message: error.message });
      return errorResponse("AUTH_UNAVAILABLE", "Authentication is unavailable", 503, requestId);
    }
  },
};
