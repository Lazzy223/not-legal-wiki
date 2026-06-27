import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { toAuthUser } from "@/lib/auth";

export type ManagedUser = {
  id: string;
  username: string;
  password: string;
  role: "moderator";
  createdAt: string;
  updatedAt: string;
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

function normalizeUser(user: Partial<ManagedUser>): ManagedUser {
  const now = new Date().toISOString();

  return {
    id: String(user.id || randomUUID()),
    username: String(user.username || "").trim(),
    password: String(user.password || "").trim(),
    role: "moderator",
    createdAt: String(user.createdAt || now),
    updatedAt: String(user.updatedAt || now),
  };
}

function sortUsers(users: ManagedUser[]) {
  return users.sort((a, b) => a.username.localeCompare(b.username));
}

async function saveUsers(users: ManagedUser[]) {
  await ensureFile();

  await fs.writeFile(
    filePath,
    JSON.stringify(sortUsers(users), null, 2),
    "utf-8"
  );
}

export async function getManagedUsers() {
  await ensureFile();

  const file = await fs.readFile(filePath, "utf-8");
  const rawUsers = JSON.parse(file) as Partial<ManagedUser>[];

  return sortUsers(rawUsers.map(normalizeUser));
}

export async function createManagedUser(data: {
  username: string;
  password: string;
}) {
  const username = data.username.trim();
  const password = data.password.trim();

  if (!username) {
    throw new Error("Введите логин");
  }

  if (!password) {
    throw new Error("Введите пароль");
  }

  if (normalizeUsername(username) === "owner") {
    throw new Error("Логин owner зарезервирован");
  }

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
    role: "moderator",
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
    password: string;
  }
) {
  const username = data.username.trim();
  const password = data.password.trim();

  if (!username) {
    throw new Error("Введите логин");
  }

  if (!password) {
    throw new Error("Введите пароль");
  }

  if (normalizeUsername(username) === "owner") {
    throw new Error("Логин owner зарезервирован");
  }

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

  users[index] = {
    ...users[index],
    username,
    password,
    role: "moderator",
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

  return toAuthUser(user.username, "moderator");
}