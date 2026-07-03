import path from "node:path";
import { randomUUID } from "node:crypto";
import { readJsonStore, writeJsonStore } from "@/lib/persistent-json-store";

export type RuleBlock = {
  title: string;
  items: string[];
};

export type RuleSection = {
  id: string;
  number: string;
  icon: string;
  title: string;
  short: string;
  description: string;
  sortOrder: number;
  version: string;
  updatedAt: string;
  contentHtml?: string;
  blocks: RuleBlock[];
};

type RuleSectionInput = Omit<RuleSection, "id" | "updatedAt">;

const filePath = path.join(process.cwd(), "src", "data", "rules-db.json");

function blocksToHtml(blocks?: RuleBlock[]) {
  if (!blocks || blocks.length === 0) {
    return "<p></p>";
  }

  return blocks
    .map((block) => {
      const items = block.items.map((item) => `<li>${item}</li>`).join("");
      return `<h2>${block.title}</h2><ul>${items}</ul>`;
    })
    .join("");
}

function normalizeSortOrder(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function loadInitialRules(): Promise<RuleSection[]> {
  try {
    const rulesModule = await import("@/data/rules");
    const staticRules = rulesModule.rulesSections || [];

    return staticRules.map((section: Partial<RuleSection>, index: number) => ({
      id: String(section.id || randomUUID()),
      number: String(section.number || String(index + 1).padStart(2, "0")),
      icon: String(section.icon || "📜"),
      title: String(section.title || "Раздел правил"),
      short: String(section.short || ""),
      description: String(section.description || ""),
      sortOrder: normalizeSortOrder(section.sortOrder, (index + 1) * 10),
      version: String(section.version || "1.0"),
      updatedAt: String(section.updatedAt || ""),
      contentHtml: section.contentHtml || blocksToHtml(section.blocks),
      blocks: Array.isArray(section.blocks) ? section.blocks : [],
    }));
  } catch {
    return [];
  }
}

function normalizeSection(
  section: Partial<RuleSection>,
  index: number
): RuleSection {
  const blocks = Array.isArray(section.blocks)
    ? section.blocks.map((block) => ({
        title: String(block.title || "Блок правил").trim(),
        items: Array.isArray(block.items)
          ? block.items.map((item) => String(item).trim()).filter(Boolean)
          : [],
      }))
    : [];

  return {
    id: String(section.id || randomUUID()),
    number: String(section.number || String(index + 1).padStart(2, "0")),
    icon: String(section.icon || "📜"),
    title: String(section.title || "Раздел правил").trim(),
    short: String(section.short || "").trim(),
    description: String(section.description || "").trim(),
    sortOrder: normalizeSortOrder(section.sortOrder, (index + 1) * 10),
    version: String(section.version || "1.0").trim(),
    updatedAt: String(section.updatedAt || ""),
    contentHtml: String(section.contentHtml || blocksToHtml(blocks)),
    blocks,
  };
}

function sortSections(sections: RuleSection[]) {
  return sections.sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) {
      return a.sortOrder - b.sortOrder;
    }

    return a.number.localeCompare(b.number, "ru", { numeric: true });
  });
}

export async function getRuleSections(): Promise<RuleSection[]> {
  const rawSections = await readJsonStore<Partial<RuleSection>[]>({
    key: "rules",
    filePath,
    fallback: loadInitialRules,
  });

  return sortSections(
    (Array.isArray(rawSections) ? rawSections : []).map(normalizeSection)
  );
}

async function saveRuleSections(sections: RuleSection[]) {
  await writeJsonStore({ key: "rules", filePath }, sortSections(sections));
}

export async function createRuleSection(data: RuleSectionInput) {
  const sections = await getRuleSections();
  const now = new Date().toISOString();

  const section: RuleSection = {
    id: randomUUID(),
    number: String(
      data.number || String(sections.length + 1).padStart(2, "0")
    ),
    icon: String(data.icon || "📜"),
    title: String(data.title || "Новый раздел правил").trim(),
    short: String(data.short || "").trim(),
    description: String(data.description || "").trim(),
    sortOrder: normalizeSortOrder(data.sortOrder, (sections.length + 1) * 10),
    version: String(data.version || "1.0").trim(),
    updatedAt: now,
    contentHtml: String(data.contentHtml || "<p></p>"),
    blocks: Array.isArray(data.blocks) ? data.blocks : [],
  };

  sections.push(section);
  await saveRuleSections(sections);

  return section;
}

export async function updateRuleSection(id: string, data: RuleSectionInput) {
  const sections = await getRuleSections();
  const index = sections.findIndex((section) => section.id === id);

  if (index === -1) {
    return null;
  }

  sections[index] = {
    ...sections[index],
    number: String(data.number || sections[index].number),
    icon: String(data.icon || "📜"),
    title: String(data.title || "Раздел правил").trim(),
    short: String(data.short || "").trim(),
    description: String(data.description || "").trim(),
    sortOrder: normalizeSortOrder(data.sortOrder, sections[index].sortOrder),
    version: String(data.version || sections[index].version || "1.0").trim(),
    updatedAt: new Date().toISOString(),
    contentHtml: String(data.contentHtml || "<p></p>"),
    blocks: Array.isArray(data.blocks) ? data.blocks : [],
  };

  await saveRuleSections(sections);

  return sections[index];
}

export async function deleteRuleSection(id: string) {
  const sections = await getRuleSections();
  const filteredSections = sections.filter((section) => section.id !== id);

  if (filteredSections.length === sections.length) {
    return false;
  }

  await saveRuleSections(filteredSections);

  return true;
}
