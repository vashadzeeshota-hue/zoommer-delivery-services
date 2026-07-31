export function json(data, status = 200, extraHeaders = {}) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
      "X-Content-Type-Options": "nosniff",
      ...extraHeaders,
    },
  });
}

export function getRequestId(request) {
  return request.headers.get("x-request-id") || crypto.randomUUID();
}

export function errorResponse(code, message, status, requestId, fieldErrors = []) {
  return json(
    {
      error: {
        code,
        message,
        fieldErrors,
        requestId,
      },
    },
    status,
    { "X-Request-Id": requestId },
  );
}

