import {
  clearSessionCookieHeader,
  isSameOriginRequest,
  revokeSession,
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
      await revokeSession(request);
      return json(
        { authenticated: false },
        200,
        {
          "Set-Cookie": clearSessionCookieHeader(request),
          "X-Request-Id": requestId,
        },
      );
    } catch (error) {
      console.error("auth_logout_failed", { requestId, message: error.message });
      return json(
        { authenticated: false },
        200,
        {
          "Set-Cookie": clearSessionCookieHeader(request),
          "X-Request-Id": requestId,
        },
      );
    }
  },
};
