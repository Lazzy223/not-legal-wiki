import fs from "node:fs/promises";
import path from "node:path";

type JsonFallback<T> = T | (() => T | Promise<T>);

type JsonStoreOptions<T> = {
  key: string;
  filePath: string;
  fallback: JsonFallback<T>;
};

type RedisResponse<T> = {
  result?: T;
  error?: string;
};

type RedisArgument = string | number;

function getRedisConfig() {
  const url = String(
    process.env.UPSTASH_REDIS_REST_URL ||
      process.env.KV_REST_API_URL ||
      ""
  )
    .trim()
    .replace(/\/+$/, "");

  const token = String(
    process.env.UPSTASH_REDIS_REST_TOKEN ||
      process.env.KV_REST_API_TOKEN ||
      ""
  ).trim();

  if (!url && !token) {
    return null;
  }

  if (!url || !token) {
    throw new Error(
      "Хранилище Redis настроено не полностью: нужны URL и TOKEN"
    );
  }

  return { url, token };
}

function getStorePrefix() {
  return String(process.env.DATA_STORE_PREFIX || "not-legal-rp:v1")
    .trim()
    .replace(/:+$/, "");
}

export function getRemoteStoreKey(key: string) {
  return `${getStorePrefix()}:${key}`;
}

export function hasRemoteDataStore() {
  return Boolean(getRedisConfig());
}

async function resolveFallback<T>(fallback: JsonFallback<T>) {
  return typeof fallback === "function"
    ? await (fallback as () => T | Promise<T>)()
    : fallback;
}

async function readLocalJson<T>(
  filePath: string,
  fallback: JsonFallback<T>,
  createWhenMissing: boolean
): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    const value = await resolveFallback(fallback);

    if (createWhenMissing) {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, JSON.stringify(value, null, 2), "utf-8");
    }

    return value;
  }
}

export async function redisCommand<T>(
  ...command: RedisArgument[]
): Promise<T> {
  const config = getRedisConfig();

  if (!config) {
    throw new Error("Постоянное Redis-хранилище не настроено");
  }

  const response = await fetch(config.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
  });

  let payload: RedisResponse<T>;

  try {
    payload = (await response.json()) as RedisResponse<T>;
  } catch {
    throw new Error("Redis вернул некорректный ответ");
  }

  if (!response.ok || payload.error) {
    throw new Error(payload.error || `Ошибка Redis (${response.status})`);
  }

  return payload.result as T;
}

function parseRemoteJson<T>(value: unknown, key: string): T {
  if (typeof value !== "string") {
    return value as T;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`Данные хранилища ${key} повреждены`);
  }
}

export async function readJsonStore<T>({
  key,
  filePath,
  fallback,
}: JsonStoreOptions<T>): Promise<T> {
  if (hasRemoteDataStore()) {
    const remoteKey = getRemoteStoreKey(key);
    const current = await redisCommand<string | null>("GET", remoteKey);

    if (current !== null && current !== undefined) {
      return parseRemoteJson<T>(current, key);
    }

    const seed = await readLocalJson(filePath, fallback, false);
    const created = await redisCommand<string | null>(
      "SET",
      remoteKey,
      JSON.stringify(seed),
      "NX"
    );

    if (created === null) {
      const value = await redisCommand<string | null>("GET", remoteKey);

      if (value !== null && value !== undefined) {
        return parseRemoteJson<T>(value, key);
      }
    }

    return seed;
  }

  return readLocalJson(filePath, fallback, !process.env.VERCEL);
}

export async function writeJsonStore<T>(
  options: Pick<JsonStoreOptions<T>, "key" | "filePath">,
  value: T
) {
  if (hasRemoteDataStore()) {
    await redisCommand<string>(
      "SET",
      getRemoteStoreKey(options.key),
      JSON.stringify(value)
    );
    return;
  }

  if (process.env.VERCEL) {
    throw new Error(
      "Постоянное хранилище не настроено. Подключите Upstash Redis в Vercel и выполните повторный деплой."
    );
  }

  await fs.mkdir(path.dirname(options.filePath), { recursive: true });
  await fs.writeFile(
    options.filePath,
    JSON.stringify(value, null, 2),
    "utf-8"
  );
}

export async function readLocalSeedJson<T>(
  filePath: string,
  fallback: JsonFallback<T>
) {
  return readLocalJson(filePath, fallback, false);
}
