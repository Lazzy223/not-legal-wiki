import path from "node:path";
import { readJsonStore, writeJsonStore } from "@/lib/persistent-json-store";

type OwnerAccount = {
  username: "owner";
  password: string;
  updatedAt: string;
};

const filePath = path.join(
  process.cwd(),
  "src",
  "data",
  "owner-db.json"
);

const defaultAccount: OwnerAccount = {
  username: "owner",
  password: "123456",
  updatedAt: new Date().toISOString(),
};

export async function getOwnerAccount(): Promise<OwnerAccount> {
  const parsed = await readJsonStore<Partial<OwnerAccount>>({
    key: "owner",
    filePath,
    fallback: defaultAccount,
  });

  return {
    username: "owner",
    password: String(parsed.password || defaultAccount.password),
    updatedAt: String(parsed.updatedAt || defaultAccount.updatedAt),
  };
}

export async function validateOwnerCredentials(
  username: string,
  password: string
) {
  const account = await getOwnerAccount();

  return (
    username.trim().toLowerCase() === account.username &&
    password.trim() === account.password
  );
}

export async function changeOwnerPassword(
  currentPassword: string,
  newPassword: string
) {
  const account = await getOwnerAccount();

  if (currentPassword.trim() !== account.password) {
    throw new Error("Текущий пароль указан неверно");
  }

  const cleanPassword = newPassword.trim();

  if (cleanPassword.length < 4) {
    throw new Error("Новый пароль должен содержать минимум 4 символа");
  }

  const updatedAccount: OwnerAccount = {
    username: "owner",
    password: cleanPassword,
    updatedAt: new Date().toISOString(),
  };

  await writeJsonStore(
    { key: "owner", filePath },
    updatedAccount
  );

  return true;
}
