import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { toManagedAuthUser } from "@/lib/auth";
import { findManagedRole } from "@/lib/roles-store";

export type ManagedUser = {
  id: string;
  username: string;
  password: string;
  roleId: string;
  createdAt: string;
  updatedAt: string;
};

type LegacyManagedUser = Partial<ManagedUser> & {
  role?: string;
};

const filePath = path.join(process.cwd(), "src", "data", "users-db.json");

async function ensureFile() {
  const dir = path.dirname(filePath);

  await fs.mkdir(dir, { recursive: true });

  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, JSON.stringify([], null, 2), "utf-8");
  }
}

function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

function normalizeUser(user: LegacyManagedUser): ManagedUser {
  const now = new Date().toISOString();

  return {
    id: String(user.id || randomUUID()),
    username: String(user.username || "").trim(),
    password: String(user.password || "").trim(),
    roleId: String(user.roleId || user.role || "moderator").trim(),
    createdAt: String(user.createdAt || now),
    updatedAt: String(user.updatedAt || now),
  };
}

function sortUsers(users: ManagedUser[]) {
  return [...users].sort((a, b) =>
    a.username.localeCompare(b.username, "ru")
  );
}

async function saveUsers(users: ManagedUser[]) {
  await ensureFile();

  await fs.writeFile(
    filePath,
    JSON.stringify(sortUsers(users), null, 2),
    "utf-8"
  );
}

async function validateRole(roleId: string) {
  const role = await findManagedRole(roleId);

  if (!role) {
    throw new Error("Выбранная роль не найдена");
  }

  return role;
}

export async function getManagedUsers() {
  await ensureFile();

  const file = await fs.readFile(filePath, "utf-8");
  const rawUsers = JSON.parse(file) as LegacyManagedUser[];

  return sortUsers(
    (Array.isArray(rawUsers) ? rawUsers : []).map(normalizeUser)
  );
}

export async function createManagedUser(data: {
  username: string;
  password: string;
  roleId: string;
}) {
  const username = data.username.trim();
  const password = data.password.trim();
  const roleId = data.roleId.trim();

  if (!username) {
    throw new Error("Введите логин");
  }

  if (!password) {
    throw new Error("Введите пароль");
  }

  if (normalizeUsername(username) === "owner") {
    throw new Error("Логин owner зарезервирован");
  }

  await validateRole(roleId);

  const users = await getManagedUsers();

  const exists = users.some((user) => {
    return normalizeUsername(user.username) === normalizeUsername(username);
  });

  if (exists) {
    throw new Error("Пользователь с таким логином уже существует");
  }

  const now = new Date().toISOString();

  const user: ManagedUser = {
    id: randomUUID(),
    username,
    password,
    roleId,
    createdAt: now,
    updatedAt: now,
  };

  users.push(user);

  await saveUsers(users);

  return user;
}

export async function updateManagedUser(
  id: string,
  data: {
    username: string;
    password?: string;
    roleId: string;
  }
) {
  const username = data.username.trim();
  const roleId = data.roleId.trim();

  if (!username) {
    throw new Error("Введите логин");
  }

  if (normalizeUsername(username) === "owner") {
    throw new Error("Логин owner зарезервирован");
  }

  await validateRole(roleId);

  const users = await getManagedUsers();
  const index = users.findIndex((user) => user.id === id);

  if (index === -1) {
    throw new Error("Пользователь не найден");
  }

  const duplicate = users.some((user) => {
    return (
      user.id !== id &&
      normalizeUsername(user.username) === normalizeUsername(username)
    );
  });

  if (duplicate) {
    throw new Error("Пользователь с таким логином уже существует");
  }

  const password = String(data.password || "").trim();

  users[index] = {
    ...users[index],
    username,
    password: password || users[index].password,
    roleId,
    updatedAt: new Date().toISOString(),
  };

  await saveUsers(users);

  return users[index];
}

export async function deleteManagedUser(id: string) {
  const users = await getManagedUsers();
  const filteredUsers = users.filter((user) => user.id !== id);

  if (filteredUsers.length === users.length) {
    throw new Error("Пользователь не найден");
  }

  await saveUsers(filteredUsers);

  return true;
}

export async function findManagedUserByCredentials(
  username: string,
  password: string
) {
  const cleanUsername = normalizeUsername(username);
  const cleanPassword = password.trim();

  const users = await getManagedUsers();

  const user = users.find((item) => {
    return (
      normalizeUsername(item.username) === cleanUsername &&
      item.password === cleanPassword
    );
  });

  if (!user) {
    return null;
  }

  const role =
    (await findManagedRole(user.roleId)) ||
    (await findManagedRole("viewer"));

  if (!role) {
    return null;
  }

  return toManagedAuthUser(user.username, role);
}

export async function changeManagedUserPassword(
  username: string,
  currentPassword: string,
  newPassword: string
) {
  const cleanUsername = normalizeUsername(username);
  const cleanCurrentPassword = currentPassword.trim();
  const cleanNewPassword = newPassword.trim();

  if (cleanNewPassword.length < 4) {
    throw new Error("Новый пароль должен содержать минимум 4 символа");
  }

  const users = await getManagedUsers();
  const index = users.findIndex(
    (user) => normalizeUsername(user.username) === cleanUsername
  );

  if (index === -1) {
    throw new Error("Пользователь не найден");
  }

  if (users[index].password !== cleanCurrentPassword) {
    throw new Error("Текущий пароль указан неверно");
  }

  users[index] = {
    ...users[index],
    password: cleanNewPassword,
    updatedAt: new Date().toISOString(),
  };

  await saveUsers(users);

  return true;
}
