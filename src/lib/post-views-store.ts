import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  getRemoteStoreKey,
  hasRemoteDataStore,
  readLocalSeedJson,
  redisCommand,
} from "@/lib/persistent-json-store";

const dataDir = path.join(process.cwd(), "src", "data");
const viewsFile = path.join(dataDir, "post-views.json");

type ViewsData = Record<string, number>;

const remoteViewsKey = getRemoteStoreKey("post-views");
const remoteViewsSeedKey = getRemoteStoreKey("post-views-seeded");

async function ensureViewsFile() {
  await mkdir(dataDir, { recursive: true });

  try {
    await readFile(viewsFile, "utf-8");
  } catch {
    await writeFile(viewsFile, JSON.stringify({}, null, 2), "utf-8");
  }
}

async function readLocalViews(): Promise<ViewsData> {
  if (process.env.VERCEL) {
    return readLocalSeedJson<ViewsData>(viewsFile, {});
  }

  await ensureViewsFile();

  try {
    const raw = await readFile(viewsFile, "utf-8");
    const parsed = JSON.parse(raw);

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    return parsed as ViewsData;
  } catch {
    return {};
  }
}

async function writeLocalViews(data: ViewsData) {
  if (process.env.VERCEL) {
    throw new Error(
      "Постоянное хранилище не настроено. Подключите Upstash Redis в Vercel и выполните повторный деплой."
    );
  }

  await ensureViewsFile();
  await writeFile(viewsFile, JSON.stringify(data, null, 2), "utf-8");
}

async function ensureRemoteViewsSeeded() {
  const seeded = await redisCommand<number>("EXISTS", remoteViewsSeedKey);

  if (seeded) {
    return;
  }

  const seed = await readLocalSeedJson<ViewsData>(viewsFile, {});
  const entries = Object.entries(seed).filter(([, value]) =>
    Number.isFinite(Number(value))
  );

  if (entries.length > 0) {
    const command: Array<string | number> = ["HSET", remoteViewsKey];

    for (const [postId, value] of entries) {
      command.push(postId, Math.max(0, Math.trunc(Number(value))));
    }

    await redisCommand<number>(...command);
  }

  await redisCommand<string>("SET", remoteViewsSeedKey, "1");
}

function parseHashResult(result: unknown): ViewsData {
  if (!Array.isArray(result)) {
    return {};
  }

  const views: ViewsData = {};

  for (let index = 0; index < result.length; index += 2) {
    const postId = String(result[index] || "");
    const value = Number(result[index + 1] || 0);

    if (postId) {
      views[postId] = Number.isFinite(value) ? value : 0;
    }
  }

  return views;
}

export async function getPostViews(postId: string) {
  if (hasRemoteDataStore()) {
    await ensureRemoteViewsSeeded();
    const value = await redisCommand<string | null>(
      "HGET",
      remoteViewsKey,
      postId
    );

    return Number(value || 0);
  }

  const views = await readLocalViews();
  return views[postId] || 0;
}

export async function incrementPostViews(postId: string) {
  if (hasRemoteDataStore()) {
    await ensureRemoteViewsSeeded();
    return redisCommand<number>("HINCRBY", remoteViewsKey, postId, 1);
  }

  const views = await readLocalViews();
  views[postId] = (views[postId] || 0) + 1;
  await writeLocalViews(views);

  return views[postId];
}

export async function getAllPostViews() {
  if (hasRemoteDataStore()) {
    await ensureRemoteViewsSeeded();
    const result = await redisCommand<unknown>("HGETALL", remoteViewsKey);
    return parseHashResult(result);
  }

  return readLocalViews();
}
