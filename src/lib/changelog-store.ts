import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export type ChangelogPost = {
  id: string;
  title: string;
  description: string;
  publishedAt: string;
  updates: string[];
  fixes: string[];
  updatesHtml?: string;
  fixesHtml?: string;
};

type ChangelogPostInput = {
  title: string;
  description?: string;
  publishedAt: string;
  updates: string[];
  fixes: string[];
  updatesHtml?: string;
  fixesHtml?: string;
};

const filePath = path.join(process.cwd(), "src", "data", "changelog-db.json");

async function ensureFile() {
  const dir = path.dirname(filePath);

  await fs.mkdir(dir, { recursive: true });

  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, "[]", "utf-8");
  }
}

function cleanArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => String(item).trim()).filter(Boolean);
}

function normalizePost(post: Partial<ChangelogPost>): ChangelogPost {
  return {
    id: String(post.id || randomUUID()),
    title: String(post.title || "Без названия").trim(),
    description: String(post.description || "").trim(),
    publishedAt: String(post.publishedAt || "").trim(),
    updates: cleanArray(post.updates),
    fixes: cleanArray(post.fixes),
    updatesHtml: String(post.updatesHtml || "").trim(),
    fixesHtml: String(post.fixesHtml || "").trim(),
  };
}

export async function getChangelogPosts(): Promise<ChangelogPost[]> {
  await ensureFile();

  const file = await fs.readFile(filePath, "utf-8");
  const rawPosts = JSON.parse(file) as Partial<ChangelogPost>[];

  const posts = rawPosts.map(normalizePost);

  return posts.sort((a, b) => {
    return b.publishedAt.localeCompare(a.publishedAt);
  });
}

async function savePosts(posts: ChangelogPost[]) {
  await ensureFile();

  await fs.writeFile(filePath, JSON.stringify(posts, null, 2), "utf-8");
}

export async function createChangelogPost(data: ChangelogPostInput) {
  const posts = await getChangelogPosts();

  const newPost: ChangelogPost = {
    id: randomUUID(),
    title: String(data.title || "Без названия").trim(),
    description: String(data.description || "").trim(),
    publishedAt: String(data.publishedAt || "").trim(),
    updates: cleanArray(data.updates),
    fixes: cleanArray(data.fixes),
    updatesHtml: String(data.updatesHtml || "").trim(),
    fixesHtml: String(data.fixesHtml || "").trim(),
  };

  posts.unshift(newPost);

  await savePosts(posts);

  return newPost;
}

export async function updateChangelogPost(
  id: string,
  data: ChangelogPostInput
) {
  const posts = await getChangelogPosts();

  const index = posts.findIndex((post) => post.id === id);

  if (index === -1) {
    return null;
  }

  posts[index] = {
    ...posts[index],
    title: String(data.title || "Без названия").trim(),
    description: String(data.description || "").trim(),
    publishedAt: String(data.publishedAt || "").trim(),
    updates: cleanArray(data.updates),
    fixes: cleanArray(data.fixes),
    updatesHtml: String(data.updatesHtml || "").trim(),
    fixesHtml: String(data.fixesHtml || "").trim(),
  };

  await savePosts(posts);

  return posts[index];
}

export async function deleteChangelogPost(id: string) {
  const posts = await getChangelogPosts();

  const filteredPosts = posts.filter((post) => post.id !== id);

  if (filteredPosts.length === posts.length) {
    return false;
  }

  await savePosts(filteredPosts);

  return true;
}