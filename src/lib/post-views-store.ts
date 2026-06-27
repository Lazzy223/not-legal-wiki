import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

const dataDir = path.join(process.cwd(), "src", "data");
const viewsFile = path.join(dataDir, "post-views.json");

type ViewsData = Record<string, number>;

async function ensureViewsFile() {
  await mkdir(dataDir, { recursive: true });

  try {
    await readFile(viewsFile, "utf-8");
  } catch {
    await writeFile(viewsFile, JSON.stringify({}, null, 2), "utf-8");
  }
}

async function readViews(): Promise<ViewsData> {
  await ensureViewsFile();

  try {
    const raw = await readFile(viewsFile, "utf-8");
    const parsed = JSON.parse(raw);

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    return parsed;
  } catch {
    return {};
  }
}

async function writeViews(data: ViewsData) {
  await ensureViewsFile();
  await writeFile(viewsFile, JSON.stringify(data, null, 2), "utf-8");
}

export async function getPostViews(postId: string) {
  const views = await readViews();
  return views[postId] || 0;
}

export async function incrementPostViews(postId: string) {
  const views = await readViews();

  views[postId] = (views[postId] || 0) + 1;

  await writeViews(views);

  return views[postId];
}

export async function getAllPostViews() {
  return readViews();
}