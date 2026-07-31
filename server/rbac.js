const rolePermissions = {
  admin: new Set([
    "orders:read",
    "orders:create",
    "shipments:register",
    "couriers:read",
    "couriers:assign",
    "integrations:read",
    "integrations:manage",
    "reports:read",
  ]),
  operator: new Set([
    "orders:read",
    "orders:create",
    "shipments:register",
    "couriers:read",
    "couriers:assign",
    "integrations:read",
    "reports:read",
  ]),
  courier: new Set(["assignments:read:own", "assignments:update:own"]),
};

export function getActor(request) {
  if (process.env.ALLOW_DEMO_AUTH !== "true") {
    return null;
  }

  const role = request.headers.get("x-demo-role") || "operator";
  if (!rolePermissions[role]) {
    return null;
  }

  return {
    id: null,
    role,
    name: role === "admin" ? "Demo Admin" : "Demo Operator",
    mode: "demo",
  };
}

export function hasPermission(actor, permission) {
  return Boolean(actor && rolePermissions[actor.role]?.has(permission));
}

export function getRolePermissions() {
  return Object.fromEntries(
    Object.entries(rolePermissions).map(([role, permissions]) => [
      role,
      [...permissions],
    ]),
  );
}
