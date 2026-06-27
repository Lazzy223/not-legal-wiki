export type UserRole = "owner" | "moderator";

export type AuthUser = {
  username: string;
  role: UserRole;
  login?: string;
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

export function normalizeRole(role: string | null | undefined): UserRole | null {
  if (!role) {
    return null;
  }

  const value = role.toLowerCase();

  if (value === "owner") {
    return "owner";
  }

  if (value === "moderator" || value === "moder") {
    return "moderator";
  }

  return null;
}

export function getRoleName(role: string | null | undefined) {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === "owner") {
    return "Owner";
  }

  if (normalizedRole === "moderator") {
    return "Модератор";
  }

  return "Пользователь";
}

export function canOpenAdmin(role: string | null | undefined) {
  const normalizedRole = normalizeRole(role);

  return normalizedRole === "owner" || normalizedRole === "moderator";
}

export function canManageUsers(role: string | null | undefined) {
  const normalizedRole = normalizeRole(role);

  return normalizedRole === "owner";
}

export function isOwner(role: string | null | undefined) {
  return normalizeRole(role) === "owner";
}

export function toAuthUser(username: string, role: UserRole): AuthUser {
  return {
    username,
    role,
    roleName: getRoleName(role),
    canOpenAdmin: canOpenAdmin(role),
    canManageUsers: canManageUsers(role),
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

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function stringToBase64Url(value: string) {
  return bytesToBase64Url(new TextEncoder().encode(value));
}

function base64UrlToString(value: string) {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = base64.padEnd(
    base64.length + ((4 - (base64.length % 4)) % 4),
    "="
  );

  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new TextDecoder().decode(bytes);
}

async function getCryptoKey() {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSecret()),
    {
      name: "HMAC",
      hash: "SHA-256",
    },
    false,
    ["sign"]
  );
}

async function sign(value: string) {
  const key = await getCryptoKey();

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(value)
  );

  return bytesToBase64Url(new Uint8Array(signature));
}

export async function createSession(user: AuthUser) {
  const payload: SessionPayload = {
    username: user.username,
    role: user.role,
    exp: Date.now() + sessionDurationMs,
  };

  const body = stringToBase64Url(JSON.stringify(payload));
  const signature = await sign(body);

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

  const expectedSignature = await sign(body);

  if (expectedSignature !== signature) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlToString(body)) as SessionPayload;

    if (!payload.exp || payload.exp < Date.now()) {
      return null;
    }

    const role = normalizeRole(payload.role);

    if (!role) {
      return null;
    }

    return toAuthUser(payload.username || "admin", role);
  } catch {
    return null;
  }
}