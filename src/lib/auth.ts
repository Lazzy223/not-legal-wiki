import { createHmac, timingSafeEqual } from "node:crypto";
import type { ManagedRole } from "@/lib/roles-store";

export type UserRole = "owner" | "manager" | "moderator" | "viewer";

export type AuthUser = {
  username: string;
  login?: string;
  role: UserRole;
  roleId: string;
  roleName: string;
  canOpenAdmin: boolean;
  canManageUsers: boolean;
};

type Account = {
  username: string;
  password: string;
  role: UserRole;
};

type SessionPayload = {
  username: string;
  role: UserRole;
  roleId: string;
  roleName: string;
  canOpenAdmin: boolean;
  canManageUsers: boolean;
  exp: number;
};

export const authCookieName = "nlrp_auth";

const sessionDurationMs = 1000 * 60 * 60 * 24 * 7;

const ownerAccounts: Account[] = [
  {
    username: "owner",
    password: "123456",
    role: "owner",
  },
];

function getSecret() {
  return process.env.AUTH_SECRET || "dev-secret-change-me";
}

export function normalizeRole(
  role: string | null | undefined
): UserRole | null {
  if (!role) {
    return null;
  }

  const value = role.toLowerCase();

  if (
    value === "owner" ||
    value === "manager" ||
    value === "moderator" ||
    value === "viewer"
  ) {
    return value;
  }

  if (value === "moder") {
    return "moderator";
  }

  return null;
}

export function getRoleName(role: string | null | undefined) {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === "owner") return "Owner";
  if (normalizedRole === "manager") return "Управляющий";
  if (normalizedRole === "moderator") return "Модератор";
  if (normalizedRole === "viewer") return "Наблюдатель";

  return "Пользователь";
}

export function canOpenAdmin(
  roleOrUser: string | AuthUser | null | undefined
) {
  if (roleOrUser && typeof roleOrUser === "object") {
    return Boolean(roleOrUser.canOpenAdmin);
  }

  const role = normalizeRole(roleOrUser);

  return (
    role === "owner" ||
    role === "manager" ||
    role === "moderator"
  );
}

export function canManageUsers(
  roleOrUser: string | AuthUser | null | undefined
) {
  if (roleOrUser && typeof roleOrUser === "object") {
    return Boolean(roleOrUser.canManageUsers);
  }

  const role = normalizeRole(roleOrUser);

  return role === "owner" || role === "manager";
}

export function isOwner(role: string | null | undefined) {
  return normalizeRole(role) === "owner";
}

export function toAuthUser(
  username: string,
  role: UserRole
): AuthUser {
  return {
    username,
    login: username,
    role,
    roleId: role,
    roleName: getRoleName(role),
    canOpenAdmin: canOpenAdmin(role),
    canManageUsers: canManageUsers(role),
  };
}

export function toManagedAuthUser(
  username: string,
  role: ManagedRole
): AuthUser {
  const effectiveRole: UserRole = role.permissions.canManageUsers
    ? "manager"
    : role.permissions.canOpenAdmin
      ? "moderator"
      : "viewer";

  return {
    username,
    login: username,
    role: effectiveRole,
    roleId: role.id,
    roleName: role.name,
    canOpenAdmin: role.permissions.canOpenAdmin,
    canManageUsers: role.permissions.canManageUsers,
  };
}

export function validateOwnerUser(username: string, password: string) {
  const cleanUsername = username.trim().toLowerCase();
  const cleanPassword = password.trim();

  const account = ownerAccounts.find((item) => {
    return (
      item.username.toLowerCase() === cleanUsername &&
      item.password === cleanPassword
    );
  });

  if (!account) {
    return null;
  }

  return toAuthUser(account.username, account.role);
}

function encodeBase64Url(value: string) {
  return Buffer.from(value, "utf-8").toString("base64url");
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf-8");
}

function sign(value: string) {
  return createHmac("sha256", getSecret())
    .update(value)
    .digest("base64url");
}

function signaturesEqual(left: string, right: string) {
  try {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);

    if (leftBuffer.length !== rightBuffer.length) {
      return false;
    }

    return timingSafeEqual(leftBuffer, rightBuffer);
  } catch {
    return false;
  }
}

export async function createSession(user: AuthUser) {
  const payload: SessionPayload = {
    username: user.username,
    role: user.role,
    roleId: user.roleId,
    roleName: user.roleName,
    canOpenAdmin: user.canOpenAdmin,
    canManageUsers: user.canManageUsers,
    exp: Date.now() + sessionDurationMs,
  };

  const body = encodeBase64Url(JSON.stringify(payload));
  const signature = sign(body);

  return `${body}.${signature}`;
}

export async function verifySession(token?: string | null) {
  if (!token) {
    return null;
  }

  const [body, signature] = token.split(".");

  if (!body || !signature) {
    return null;
  }

  const expectedSignature = sign(body);

  if (!signaturesEqual(expectedSignature, signature)) {
    return null;
  }

  try {
    const payload = JSON.parse(
      decodeBase64Url(body)
    ) as Partial<SessionPayload>;

    if (!payload.exp || payload.exp < Date.now()) {
      return null;
    }

    const role = normalizeRole(payload.role);

    if (!role) {
      return null;
    }

    return {
      username: payload.username || "admin",
      login: payload.username || "admin",
      role,
      roleId: payload.roleId || role,
      roleName: payload.roleName || getRoleName(role),
      canOpenAdmin:
        typeof payload.canOpenAdmin === "boolean"
          ? payload.canOpenAdmin
          : canOpenAdmin(role),
      canManageUsers:
        typeof payload.canManageUsers === "boolean"
          ? payload.canManageUsers
          : canManageUsers(role),
    } satisfies AuthUser;
  } catch {
    return null;
  }
}
