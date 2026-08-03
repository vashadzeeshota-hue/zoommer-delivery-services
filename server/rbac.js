const rolePermissions = {
  admin: new Set([
    "orders:read",
    "orders:create",
    "orders:edit",
    "shipments:register",
    "labels:print",
    "couriers:read",
    "couriers:assign",
    "integrations:read",
    "integrations:manage",
    "reports:read",
  ]),
  operator: new Set([
    "orders:read",
    "orders:create",
    "orders:edit",
    "shipments:register",
    "labels:print",
    "couriers:read",
    "couriers:assign",
    "integrations:read",
    "reports:read",
  ]),
  courier: new Set(["assignments:read:own", "assignments:update:own"]),
};

export async function getActor(request) {
  const sessionActor = await getSessionActor(request);
  if (sessionActor) return sessionActor;

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
  return Boolean(
    actor &&
    !actor.mustChangePassword &&
    rolePermissions[actor.role]?.has(permission),
  );
}

export function getRolePermissions() {
  return Object.fromEntries(
    Object.entries(rolePermissions).map(([role, permissions]) => [
      role,
      [...permissions],
    ]),
  );
}
import { getSessionActor } from "./auth.js";
