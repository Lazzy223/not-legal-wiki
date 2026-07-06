import path from "node:path";
import { randomUUID } from "node:crypto";
import { readJsonStore, writeJsonStore } from "@/lib/persistent-json-store";

export type LawDocument = {
  id: string;
  number: string;
  icon: string;
  title: string;
  subtitle: string;
  category: string;
  description: string;
  sortOrder: number;
  version: string;
  adoptedAt: string;
  updatedAt: string;
  published: boolean;
  contentHtml: string;
};

export type LawDocumentInput = Omit<LawDocument, "id" | "updatedAt">;

const filePath = path.join(process.cwd(), "src", "data", "laws-db.json");

function normalizeSortOrder(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeDocument(
  document: Partial<LawDocument>,
  index: number
): LawDocument {
  return {
    id: String(document.id || randomUUID()),
    number: String(document.number || String(index + 1).padStart(2, "0")),
    icon: String(document.icon || "§"),
    title: String(document.title || "Новый нормативный акт").trim(),
    subtitle: String(document.subtitle || "").trim(),
    category: String(document.category || "Законы штата").trim(),
    description: String(document.description || "").trim(),
    sortOrder: normalizeSortOrder(document.sortOrder, (index + 1) * 10),
    version: String(document.version || "1.0").trim(),
    adoptedAt: String(document.adoptedAt || ""),
    updatedAt: String(document.updatedAt || ""),
    published: document.published !== false,
    contentHtml: String(document.contentHtml || "<p></p>"),
  };
}

function sortDocuments(documents: LawDocument[]) {
  return documents.sort((first, second) => {
    if (first.sortOrder !== second.sortOrder) {
      return first.sortOrder - second.sortOrder;
    }

    return first.number.localeCompare(second.number, "ru", { numeric: true });
  });
}

export async function getLawDocuments(): Promise<LawDocument[]> {
  const documents = await readJsonStore<Partial<LawDocument>[]>({
    key: "laws",
    filePath,
    fallback: [],
  });

  return sortDocuments(
    (Array.isArray(documents) ? documents : []).map(normalizeDocument)
  );
}

async function saveLawDocuments(documents: LawDocument[]) {
  await writeJsonStore({ key: "laws", filePath }, sortDocuments(documents));
}

export async function createLawDocument(data: LawDocumentInput) {
  const documents = await getLawDocuments();
  const document: LawDocument = {
    ...normalizeDocument(data, documents.length),
    id: randomUUID(),
    updatedAt: new Date().toISOString(),
  };

  documents.push(document);
  await saveLawDocuments(documents);

  return document;
}

export async function updateLawDocument(
  id: string,
  data: LawDocumentInput,
  options: { updateTimestamp?: boolean } = {}
) {
  const documents = await getLawDocuments();
  const index = documents.findIndex((document) => document.id === id);

  if (index === -1) return null;

  const current = documents[index];
  const normalized = normalizeDocument({ ...current, ...data }, index);

  documents[index] = {
    ...normalized,
    id: current.id,
    updatedAt:
      options.updateTimestamp === false
        ? current.updatedAt
        : new Date().toISOString(),
  };

  await saveLawDocuments(documents);
  return documents[index];
}

export async function deleteLawDocument(id: string) {
  const documents = await getLawDocuments();
  const nextDocuments = documents.filter((document) => document.id !== id);

  if (nextDocuments.length === documents.length) return false;

  await saveLawDocuments(nextDocuments);
  return true;
}
