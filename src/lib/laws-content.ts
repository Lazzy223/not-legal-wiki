export type LawHeading = {
  id: string;
  level: 2 | 3 | 4;
  title: string;
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

function stripTags(value: string) {
  return decodeHtmlEntities(value.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(value: string, index: number) {
  const slug = value
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^a-zа-я0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);

  return slug || `law-heading-${index + 1}`;
}

export function getLawHeadings(html: string): LawHeading[] {
  const headings: LawHeading[] = [];
  const used = new Map<string, number>();
  const expression = /<h([234])(?:\s[^>]*)?>([\s\S]*?)<\/h\1>/gi;

  let match: RegExpExecArray | null;

  while ((match = expression.exec(html))) {
    const level = Number(match[1]) as 2 | 3 | 4;
    const title = stripTags(match[2]);

    if (!title) continue;

    const base = slugify(title, headings.length);
    const count = used.get(base) || 0;
    used.set(base, count + 1);

    headings.push({
      id: count === 0 ? base : `${base}-${count + 1}`,
      level,
      title,
    });
  }

  return headings;
}

export function addLawHeadingAnchors(html: string) {
  const headings = getLawHeadings(html);
  let index = 0;

  return html.replace(
    /<h([234])(?:\s[^>]*)?>([\s\S]*?)<\/h\1>/gi,
    (full, level: string, inner: string) => {
      const heading = headings[index];
      index += 1;

      if (!heading) return full;
      return `<h${level} id="${heading.id}">${inner}</h${level}>`;
    }
  );
}

export function stripLawHtml(html: string) {
  return stripTags(html);
}

export function getLawArticleCount(html: string) {
  const plain = stripLawHtml(html);
  const matches = plain.match(/(?:^|\s)Статья\s+\d+(?:\.\d+)?\b/gi);
  return matches?.length || 0;
}

export function lawDocumentMatches(
  document: {
    number?: string;
    title?: string;
    subtitle?: string;
    category?: string;
    description?: string;
    version?: string;
    contentHtml?: string;
  },
  query: string
) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) return true;

  return [
    document.number,
    document.title,
    document.subtitle,
    document.category,
    document.description,
    document.version,
    stripLawHtml(document.contentHtml || ""),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(normalizedQuery);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function cleanPlainText(value: string) {
  return value
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+$/gm, "")
    .trim();
}

export function legalPlainTextToHtml(value: string) {
  const source = cleanPlainText(value);

  if (!source) return "<p></p>";

  const lines = source.split("\n");
  const html: string[] = [];
  let previousWasBlank = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      previousWasBlank = true;
      continue;
    }

    const safe = escapeHtml(line);

    if (/^РАЗДЕЛ\s+[IVXLCDM\d]+(?:\.|\s)/i.test(line)) {
      html.push(`<h2>${safe}</h2>`);
      previousWasBlank = false;
      continue;
    }

    if (/^ГЛАВА\s+\d+(?:\.|\s)/i.test(line)) {
      html.push(`<h3>${safe}</h3>`);
      previousWasBlank = false;
      continue;
    }

    if (/^Статья\s+\d+(?:\.\d+)?(?:\.|\s)/i.test(line)) {
      html.push(`<h4>${safe}</h4>`);
      previousWasBlank = false;
      continue;
    }

    if (/^(Примечание|Исключение)\s*:/i.test(line)) {
      const [label, ...rest] = line.split(":");
      html.push(
        `<blockquote><strong>${escapeHtml(label)}:</strong>${rest.length ? ` ${escapeHtml(rest.join(":").trim())}` : ""}</blockquote>`
      );
      previousWasBlank = false;
      continue;
    }

    const partMatch = line.match(/^(ч\.\s*\d+(?:\.\d+)?)(?:\s+|$)(.*)$/i);

    if (partMatch) {
      html.push(
        `<p><strong>${escapeHtml(partMatch[1])}</strong>${partMatch[2] ? ` ${escapeHtml(partMatch[2])}` : ""}</p>`
      );
      previousWasBlank = false;
      continue;
    }

    const letterMatch = line.match(/^([а-яёa-z]\))(?:\s+|$)(.*)$/i);

    if (letterMatch) {
      html.push(
        `<p><strong>${escapeHtml(letterMatch[1])}</strong>${letterMatch[2] ? ` ${escapeHtml(letterMatch[2])}` : ""}</p>`
      );
      previousWasBlank = false;
      continue;
    }

    if (/^Закон$/i.test(line)) {
      html.push(`<p><strong>${safe}</strong></p>`);
      previousWasBlank = false;
      continue;
    }

    if (/^[«“"].+[»”"]$/.test(line) && html.length < 4) {
      html.push(`<h1>${safe}</h1>`);
      previousWasBlank = false;
      continue;
    }

    if (previousWasBlank && html.length > 0) {
      html.push(`<p>${safe}</p>`);
    } else {
      html.push(`<p>${safe}</p>`);
    }

    previousWasBlank = false;
  }

  return html.join("\n");
}
