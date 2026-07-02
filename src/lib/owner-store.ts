import fs from "node:fs/promises";
import path from "node:path";

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

async function ensureFile() {
  const dir = path.dirname(filePath);

  await fs.mkdir(dir, { recursive: true });

  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(
      filePath,
      JSON.stringify(defaultAccount, null, 2),
      "utf-8"
    );
  }
}

export async function getOwnerAccount(): Promise<OwnerAccount> {
  await ensureFile();

  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(raw) as Partial<OwnerAccount>;

    return {
      username: "owner",
      password: String(parsed.password || defaultAccount.password),
      updatedAt: String(parsed.updatedAt || defaultAccount.updatedAt),
    };
  } catch {
    await fs.writeFile(
      filePath,
      JSON.stringify(defaultAccount, null, 2),
      "utf-8"
    );

    return defaultAccount;
  }
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

  await fs.writeFile(
    filePath,
    JSON.stringify(updatedAccount, null, 2),
    "utf-8"
  );

  return true;
}
