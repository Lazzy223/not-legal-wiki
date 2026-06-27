import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

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
  contentHtml?: string;
  blocks: RuleBlock[];
};

const filePath = path.join(process.cwd(), "src", "data", "rules-db.json");

function blocksToHtml(blocks?: RuleBlock[]) {
  if (!blocks || blocks.length === 0) {
    return "<p></p>";
  }

  return blocks
    .map((block) => {
      const items = block.items
        .map((item) => `<li>${item}</li>`)
        .join("");

      return `<h2>${block.title}</h2><ul>${items}</ul>`;
    })
    .join("");
}

async function loadInitialRules(): Promise<RuleSection[]> {
  try {
    const module = await import("@/data/rules");

    const staticRules = module.rulesSections || [];

    return staticRules.map((section: Partial<RuleSection>, index: number) => ({
      id: String(section.id || randomUUID()),
      number: String(section.number || String(index + 1).padStart(2, "0")),
      icon: String(section.icon || "📜"),
      title: String(section.title || "Раздел правил"),
      short: String(section.short || ""),
      description: String(section.description || ""),
      sortOrder:
        typeof section.sortOrder === "number"
          ? section.sortOrder
          : (index + 1) * 10,
      contentHtml: section.contentHtml || blocksToHtml(section.blocks),
      blocks: Array.isArray(section.blocks) ? section.blocks : [],
    }));
  } catch {
    return [];
  }
}

async function ensureFile() {
  const dir = path.dirname(filePath);

  await fs.mkdir(dir, { recursive: true });

  try {
    await fs.access(filePath);
  } catch {
    const initialRules = await loadInitialRules();

    await fs.writeFile(
      filePath,
      JSON.stringify(initialRules, null, 2),
      "utf-8"
    );
  }
}

function normalizeSection(section: Partial<RuleSection>, index: number): RuleSection {
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
    sortOrder:
      typeof section.sortOrder === "number"
        ? section.sortOrder
        : Number(section.sortOrder || (index + 1) * 10),
    contentHtml: String(section.contentHtml || blocksToHtml(blocks)),
    blocks,
  };
}

function sortSections(sections: RuleSection[]) {
  return sections.sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) {
      return a.sortOrder - b.sortOrder;
    }

    return a.number.localeCompare(b.number);
  });
}

export async function getRuleSections(): Promise<RuleSection[]> {
  await ensureFile();

  const file = await fs.readFile(filePath, "utf-8");
  const rawSections = JSON.parse(file) as Partial<RuleSection>[];

  return sortSections(rawSections.map(normalizeSection));
}

async function saveRuleSections(sections: RuleSection[]) {
  await ensureFile();

  await fs.writeFile(
    filePath,
    JSON.stringify(sortSections(sections), null, 2),
    "utf-8"
  );
}

export async function createRuleSection(data: Omit<RuleSection, "id">) {
  const sections = await getRuleSections();

  const section: RuleSection = {
    id: randomUUID(),
    number: String(data.number || String(sections.length + 1).padStart(2, "0")),
    icon: String(data.icon || "📜"),
    title: String(data.title || "Новый раздел правил").trim(),
    short: String(data.short || "").trim(),
    description: String(data.description || "").trim(),
    sortOrder: Number(data.sortOrder || 999),
    contentHtml: String(data.contentHtml || "<p></p>"),
    blocks: Array.isArray(data.blocks) ? data.blocks : [],
  };

  sections.push(section);

  await saveRuleSections(sections);

  return section;
}

export async function updateRuleSection(
  id: string,
  data: Omit<RuleSection, "id">
) {
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
    sortOrder: Number(data.sortOrder || 999),
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