import { errorResponse, getRequestId, json } from "../../server/http.js";
import { getActor, getRolePermissions, hasPermission } from "../../server/rbac.js";
import { listImplementedAdapters } from "../../server/carriers/registry.js";

export default {
  async fetch(request) {
    const requestId = getRequestId(request);
    const actor = await getActor(request);
    if (!hasPermission(actor, "integrations:read")) {
      return errorResponse("AUTH_REQUIRED", "Authentication required", 401, requestId);
    }

    return json(
      {
        version: "v1",
        roles: getRolePermissions(),
        implementedAdapters: listImplementedAdapters(),
        features: {
          outbox: true,
          labels: true,
          postgis: false,
          realtime: false,
        },
      },
      200,
      { "X-Request-Id": requestId },
    );
  },
};
