import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export type RolePermissions = {
  canOpenAdmin: boolean;
  canManageUsers: boolean;
};

export type ManagedRole = {
  id: string;
  name: string;
  slug: string;
  color: string;
  permissions: RolePermissions;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
};

const filePath = path.join(process.cwd(), "src", "data", "roles-db.json");

const defaultRoles: ManagedRole[] = [
  {
    id: "moderator",
    name: "Модератор",
    slug: "moderator",
    color: "#ef4444",
    permissions: {
      canOpenAdmin: true,
      canManageUsers: false,
    },
    isSystem: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "viewer",
    name: "Наблюдатель",
    slug: "viewer",
    color: "#71717a",
    permissions: {
      canOpenAdmin: false,
      canManageUsers: false,
    },
    isSystem: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

async function ensureFile() {
  const dir = path.dirname(filePath);

  await fs.mkdir(dir, { recursive: true });

  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(
      filePath,
      JSON.stringify(defaultRoles, null, 2),
      "utf-8"
    );
  }
}

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^a-zа-я0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeColor(value: unknown) {
  const color = String(value || "").trim();

  if (/^#[0-9a-f]{6}$/i.test(color)) {
    return color;
  }

  return "#ef4444";
}

function normalizePermissions(value: unknown): RolePermissions {
  const source =
    value && typeof value === "object"
      ? (value as Partial<RolePermissions>)
      : {};

  const canManageUsers = Boolean(source.canManageUsers);

  return {
    canOpenAdmin: Boolean(source.canOpenAdmin) || canManageUsers,
    canManageUsers,
  };
}

function normalizeRole(role: Partial<ManagedRole>): ManagedRole {
  const now = new Date().toISOString();
  const name = String(role.name || "Без названия").trim();
  const slug = normalizeSlug(String(role.slug || name)) || randomUUID();

  return {
    id: String(role.id || randomUUID()),
    name,
    slug,
    color: normalizeColor(role.color),
    permissions: normalizePermissions(role.permissions),
    isSystem: Boolean(role.isSystem),
    createdAt: String(role.createdAt || now),
    updatedAt: String(role.updatedAt || now),
  };
}

function sortRoles(roles: ManagedRole[]) {
  return [...roles].sort((a, b) => {
    if (a.isSystem !== b.isSystem) {
      return a.isSystem ? -1 : 1;
    }

    return a.name.localeCompare(b.name, "ru");
  });
}

async function saveRoles(roles: ManagedRole[]) {
  await ensureFile();

  await fs.writeFile(
    filePath,
    JSON.stringify(sortRoles(roles), null, 2),
    "utf-8"
  );
}

export async function getManagedRoles() {
  await ensureFile();

  const file = await fs.readFile(filePath, "utf-8");
  const rawRoles = JSON.parse(file) as Partial<ManagedRole>[];
  const roles = Array.isArray(rawRoles)
    ? rawRoles.map(normalizeRole)
    : [];

  let changed = false;

  for (const defaultRole of defaultRoles) {
    const exists = roles.some((role) => role.id === defaultRole.id);

    if (!exists) {
      roles.push(defaultRole);
      changed = true;
    }
  }

  if (changed) {
    await saveRoles(roles);
  }

  return sortRoles(roles);
}

export async function findManagedRole(value: string) {
  const cleanValue = value.trim().toLowerCase();
  const roles = await getManagedRoles();

  return (
    roles.find((role) => role.id.toLowerCase() === cleanValue) ||
    roles.find((role) => role.slug.toLowerCase() === cleanValue) ||
    null
  );
}

export async function createManagedRole(data: {
  name: string;
  slug?: string;
  color?: string;
  permissions?: Partial<RolePermissions>;
}) {
  const name = data.name.trim();

  if (!name) {
    throw new Error("Введите название роли");
  }

  const slug = normalizeSlug(data.slug || name);

  if (!slug) {
    throw new Error("Не удалось создать системное имя роли");
  }

  if (slug === "owner") {
    throw new Error("Роль owner зарезервирована");
  }

  const roles = await getManagedRoles();

  const duplicate = roles.some((role) => {
    return (
      role.name.toLowerCase() === name.toLowerCase() ||
      role.slug.toLowerCase() === slug.toLowerCase()
    );
  });

  if (duplicate) {
    throw new Error("Роль с таким названием уже существует");
  }

  const now = new Date().toISOString();

  const role: ManagedRole = {
    id: randomUUID(),
    name,
    slug,
    color: normalizeColor(data.color),
    permissions: normalizePermissions(data.permissions),
    isSystem: false,
    createdAt: now,
    updatedAt: now,
  };

  roles.push(role);
  await saveRoles(roles);

  return role;
}

export async function updateManagedRole(
  id: string,
  data: {
    name: string;
    slug?: string;
    color?: string;
    permissions?: Partial<RolePermissions>;
  }
) {
  const roles = await getManagedRoles();
  const index = roles.findIndex((role) => role.id === id);

  if (index === -1) {
    throw new Error("Роль не найдена");
  }

  const current = roles[index];
  const name = data.name.trim();

  if (!name) {
    throw new Error("Введите название роли");
  }

  const slug = current.isSystem
    ? current.slug
    : normalizeSlug(data.slug || name);

  const duplicate = roles.some((role) => {
    return (
      role.id !== id &&
      (role.name.toLowerCase() === name.toLowerCase() ||
        role.slug.toLowerCase() === slug.toLowerCase())
    );
  });

  if (duplicate) {
    throw new Error("Роль с таким названием уже существует");
  }

  roles[index] = {
    ...current,
    name,
    slug,
    color: normalizeColor(data.color),
    permissions: normalizePermissions(data.permissions),
    updatedAt: new Date().toISOString(),
  };

  await saveRoles(roles);

  return roles[index];
}

export async function deleteManagedRole(id: string) {
  const roles = await getManagedRoles();
  const role = roles.find((item) => item.id === id);

  if (!role) {
    throw new Error("Роль не найдена");
  }

  if (role.isSystem) {
    throw new Error("Системную роль удалить нельзя");
  }

  await saveRoles(roles.filter((item) => item.id !== id));

  return true;
}
