import { getRequestId, json } from "../../server/http.js";
import { getRolePermissions } from "../../server/rbac.js";
import { listImplementedAdapters } from "../../server/carriers/registry.js";

export default {
  async fetch(request) {
    const requestId = getRequestId(request);

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
