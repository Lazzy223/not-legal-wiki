import type { RuleBlock, RuleSection } from "@/lib/rules-store";

export type RuleHeading = {
  id: string;
  text: string;
  level: 2 | 3;
};

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

export function stripRuleHtml(value: string) {
  return decodeHtmlEntities(
    String(value || "")
      .replace(/<br\s*\/?\s*>/gi, "\n")
      .replace(/<\/\s*(p|div|li|h1|h2|h3|h4|h5|h6)\s*>/gi, "\n")
      .replace(/<[^>]*>/g, " ")
  )
    .replace(/\s+/g, " ")
    .trim();
}

export function makeRuleAnchor(value: string, index: number) {
  const slug = stripRuleHtml(value)
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^a-zа-я0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);

  return `rules-${slug || "section"}-${index + 1}`;
}

export function blocksToRulesHtml(blocks?: RuleBlock[]) {
  if (!blocks || blocks.length === 0) {
    return "<p>Текст правил пока не добавлен.</p>";
  }

  return blocks
    .map((block) => {
      const items = (block.items || [])
        .map((item) => `<li>${item}</li>`)
        .join("");

      return `<h2>${block.title}</h2><ul>${items}</ul>`;
    })
    .join("");
}

export function getRuleSectionHtml(section?: Partial<RuleSection>) {
  const contentHtml = String(section?.contentHtml || "").trim();

  if (contentHtml) {
    return contentHtml;
  }

  return blocksToRulesHtml(section?.blocks);
}

export function getRuleItemCount(section?: Partial<RuleSection>) {
  const blocksCount = (section?.blocks || []).reduce((total, block) => {
    return total + (block.items?.length || 0);
  }, 0);

  if (blocksCount > 0) {
    return blocksCount;
  }

  const html = getRuleSectionHtml(section);
  const listItems = html.match(/<li\b[^>]*>/gi);

  if (listItems?.length) {
    return listItems.length;
  }

  const paragraphs = html.match(/<p\b[^>]*>/gi);
  return paragraphs?.length || 0;
}

export function extractRuleHeadings(html: string): RuleHeading[] {
  const headings: RuleHeading[] = [];
  const expression = /<(h2|h3)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = expression.exec(html)) !== null) {
    const level = match[1].toLowerCase() === "h3" ? 3 : 2;
    const attributes = match[2] || "";
    const text = stripRuleHtml(match[3]);
    const idMatch = attributes.match(/\bid=["']([^"']+)["']/i);
    const id = idMatch?.[1] || makeRuleAnchor(text, index);

    if (text) {
      headings.push({ id, text, level });
      index += 1;
    }
  }

  return headings;
}

export function addRuleHeadingAnchors(html: string) {
  let index = 0;

  return String(html || "").replace(
    /<(h2|h3)\b([^>]*)>([\s\S]*?)<\/\1>/gi,
    (full, tag: string, attributes: string, inner: string) => {
      if (/\bid=["'][^"']+["']/i.test(attributes)) {
        index += 1;
        return full;
      }

      const id = makeRuleAnchor(inner, index);
      index += 1;

      return `<${tag}${attributes} id="${id}">${inner}</${tag}>`;
    }
  );
}

export function ruleSectionMatches(section: RuleSection, query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  const haystack = [
    section.number,
    section.title,
    section.short,
    section.description,
    section.version,
    stripRuleHtml(getRuleSectionHtml(section)),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalizedQuery);
}
