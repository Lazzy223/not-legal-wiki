export type LawHeading = {
  id: string;
  level: 3;
  title: string;
};

export type LegalImportOptions = {
  chapterColor?: string;
  articleColor?: string;
  listColor?: string;
  italicizeArticleBody?: boolean;
};

export const DEFAULT_LEGAL_IMPORT_OPTIONS: Required<LegalImportOptions> = {
  chapterColor: "#f4f4f5",
  articleColor: "#ef4444",
  listColor: "#ef4444",
  italicizeArticleBody: false,
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

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value: string) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}

function cleanPlainText(value: string) {
  return value
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+$/gm, "")
    .trim();
}

function normalizeColor(value: string | undefined, fallback: string) {
  const candidate = value?.trim();
  return candidate && /^#[0-9a-f]{6}$/i.test(candidate) ? candidate : fallback;
}

function hasAttribute(attributes: string, name: string) {
  return new RegExp(`\\s${name}=(?:"[^"]*"|'[^']*'|[^\\s>]+)`, "i").test(
    attributes
  );
}

function ensureAttribute(attributes: string, name: string, value: string) {
  if (hasAttribute(attributes, name)) return attributes;
  return `${attributes} ${name}="${escapeAttribute(value)}"`;
}

function isSectionTitle(value: string) {
  return /^РАЗДЕЛ\s+[IVXLCDM\d]+(?:\.\d+)?\.?(?:\s+|$)/i.test(value);
}

function isChapterTitle(value: string) {
  return /^ГЛАВА\s+[IVXLCDM\d]+(?:\.\d+)?\.?(?:\s+|$)/i.test(value);
}

function isArticleTitle(value: string) {
  return /^Статья\s+\d+(?:\.\d+)?\.?(?:\s+|$)/i.test(value);
}

function mergeAdjacentLawLists(html: string) {
  let normalized = html;
  let previous = "";

  while (normalized !== previous) {
    previous = normalized;
    normalized = normalized.replace(
      /<(ol|ul)([^>]*)>([\s\S]*?)<\/\1>\s*<\1([^>]*)>([\s\S]*?)<\/\1>/gi,
      (_full, tag: string, firstAttributes: string, firstItems: string, _secondAttributes: string, secondItems: string) =>
        `<${tag}${firstAttributes}>${firstItems}${secondItems}</${tag}>`
    );
  }

  return normalized;
}

export function normalizeLawStructureHtml(html: string) {
  if (!html.trim()) return html;

  const structured = html.replace(
    /<p([^>]*)>([\s\S]*?)<\/p>/gi,
    (full, rawAttributes: string, inner: string) => {
      const title = stripTags(inner);
      let attributes = rawAttributes || "";

      if (isSectionTitle(title)) {
        attributes = ensureAttribute(attributes, "data-law-kind", "section");
        attributes = ensureAttribute(attributes, "data-law-align", "center");
        return `<h2${attributes}>${inner}</h2>`;
      }

      if (isChapterTitle(title)) {
        attributes = ensureAttribute(attributes, "data-law-kind", "chapter");
        attributes = ensureAttribute(attributes, "data-law-align", "center");
        return `<h3${attributes}>${inner}</h3>`;
      }

      if (isArticleTitle(title)) {
        attributes = ensureAttribute(attributes, "data-law-kind", "article");
        attributes = ensureAttribute(attributes, "data-law-align", "left");
        return `<h4${attributes}>${inner}</h4>`;
      }

      return full;
    }
  );

  return mergeAdjacentLawLists(structured);
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

function isTocBlock(tag: string, attributes: string, title: string) {
  return (
    tag.toLowerCase() === "h3" ||
    /data-law-kind=(?:"chapter"|'chapter'|chapter)/i.test(attributes) ||
    /data-law-toc=(?:"true"|'true'|true)/i.test(attributes) ||
    isChapterTitle(title)
  );
}

const TOC_BLOCK_EXPRESSION =
  /<(h[234]|p|blockquote)([^>]*)>([\s\S]*?)<\/\1>/gi;

export function getLawHeadings(html: string): LawHeading[] {
  const normalizedHtml = normalizeLawStructureHtml(html);
  const headings: LawHeading[] = [];
  const used = new Map<string, number>();
  const expression = new RegExp(TOC_BLOCK_EXPRESSION.source, "gi");

  let match: RegExpExecArray | null;

  while ((match = expression.exec(normalizedHtml))) {
    const tag = match[1];
    const attributes = match[2] || "";
    const title = stripTags(match[3]);

    if (!title || !isTocBlock(tag, attributes, title)) continue;

    const base = slugify(title, headings.length);
    const count = used.get(base) || 0;
    used.set(base, count + 1);

    headings.push({
      id: count === 0 ? base : `${base}-${count + 1}`,
      level: 3,
      title,
    });
  }

  return headings;
}

export function addLawHeadingAnchors(html: string) {
  const normalizedHtml = normalizeLawStructureHtml(html);
  const headings = getLawHeadings(normalizedHtml);
  let headingIndex = 0;

  return normalizedHtml.replace(
    TOC_BLOCK_EXPRESSION,
    (full, tag: string, rawAttributes: string = "", inner: string) => {
      const title = stripTags(inner);
      if (!isTocBlock(tag, rawAttributes, title)) return full;

      const heading = headings[headingIndex];
      headingIndex += 1;
      if (!heading) return full;

      const attributes = rawAttributes.replace(
        /\s+id=(?:"[^"]*"|'[^']*'|[^\s>]+)/gi,
        ""
      );

      return `<${tag}${attributes} id="${heading.id}">${inner}</${tag}>`;
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

function wrapBodyText(value: string, italic: boolean) {
  const safe = escapeHtml(value);
  return italic ? `<em>${safe}</em>` : safe;
}

function coloredText(value: string, color: string) {
  return `<span style="color: ${escapeAttribute(color)}">${escapeHtml(value)}</span>`;
}

export function legalPlainTextToHtml(
  value: string,
  options: LegalImportOptions = {}
) {
  const source = cleanPlainText(value);

  if (!source) return "<p></p>";

  const settings = {
    chapterColor: normalizeColor(
      options.chapterColor,
      DEFAULT_LEGAL_IMPORT_OPTIONS.chapterColor
    ),
    articleColor: normalizeColor(
      options.articleColor,
      DEFAULT_LEGAL_IMPORT_OPTIONS.articleColor
    ),
    listColor: normalizeColor(
      options.listColor,
      DEFAULT_LEGAL_IMPORT_OPTIONS.listColor
    ),
    italicizeArticleBody:
      options.italicizeArticleBody ??
      DEFAULT_LEGAL_IMPORT_OPTIONS.italicizeArticleBody,
  };

  const lines = source.split("\n");
  const html: string[] = [];
  let insideArticle = false;
  let hasStructuredHeading = false;
  let unorderedItems: string[] = [];
  let orderedItems: string[] = [];

  function flushLists() {
    if (unorderedItems.length > 0) {
      html.push(
        `<ul data-law-list-color="${settings.listColor}" style="--law-list-color: ${settings.listColor}">${unorderedItems
          .map((item) => `<li>${wrapBodyText(item, settings.italicizeArticleBody && insideArticle)}</li>`)
          .join("")}</ul>`
      );
      unorderedItems = [];
    }

    if (orderedItems.length > 0) {
      html.push(
        `<ol data-law-list-color="${settings.listColor}" style="--law-list-color: ${settings.listColor}">${orderedItems
          .map((item) => `<li>${wrapBodyText(item, settings.italicizeArticleBody && insideArticle)}</li>`)
          .join("")}</ol>`
      );
      orderedItems = [];
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      // Пустые строки внутри списка не должны начинать нумерацию заново.
      // Список закрывается только при появлении заголовка или обычного текста.
      continue;
    }

    if (isSectionTitle(line)) {
      flushLists();
      insideArticle = false;
      hasStructuredHeading = true;
      html.push(
        `<h2 data-law-kind="section" data-law-align="center">${coloredText(line, settings.chapterColor)}</h2>`
      );
      continue;
    }

    if (isChapterTitle(line)) {
      flushLists();
      insideArticle = false;
      hasStructuredHeading = true;
      html.push(
        `<h3 data-law-kind="chapter" data-law-align="center">${coloredText(line, settings.chapterColor)}</h3>`
      );
      continue;
    }

    if (isArticleTitle(line)) {
      flushLists();
      insideArticle = true;
      hasStructuredHeading = true;
      html.push(
        `<h4 data-law-kind="article" data-law-align="left">${coloredText(line, settings.articleColor)}</h4>`
      );
      continue;
    }

    if (/^(Примечание|Исключение)\s*:/i.test(line)) {
      flushLists();
      const [label, ...rest] = line.split(":");
      const body = rest.join(":").trim();
      html.push(
        `<blockquote data-law-kind="note"><strong>${escapeHtml(label)}:</strong>${
          body ? ` ${wrapBodyText(body, settings.italicizeArticleBody && insideArticle)}` : ""
        }</blockquote>`
      );
      continue;
    }

    const partMatch = line.match(/^(ч\.\s*\d+(?:\.\d+)?)(?:\s+|$)(.*)$/i);

    if (partMatch) {
      flushLists();
      html.push(
        `<p data-law-kind="part"><strong>${escapeHtml(partMatch[1])}</strong>${
          partMatch[2]
            ? ` ${wrapBodyText(partMatch[2], settings.italicizeArticleBody)}`
            : ""
        }</p>`
      );
      continue;
    }

    const letterMatch = line.match(/^([а-яёa-z]\))(?:\s+|$)(.*)$/i);

    if (letterMatch) {
      flushLists();
      html.push(
        `<p data-law-kind="subpoint" data-law-list-color="${settings.listColor}" style="--law-list-color: ${settings.listColor}"><span style="color: ${settings.listColor}"><strong>${escapeHtml(letterMatch[1])}</strong></span>${
          letterMatch[2]
            ? ` ${wrapBodyText(letterMatch[2], settings.italicizeArticleBody && insideArticle)}`
            : ""
        }</p>`
      );
      continue;
    }

    const bulletMatch = line.match(/^[-–—•*]\s+(.+)$/);
    if (bulletMatch) {
      if (orderedItems.length) flushLists();
      unorderedItems.push(bulletMatch[1]);
      continue;
    }

    const orderedMatch = line.match(/^\d+[.)]\s+(.+)$/);
    if (orderedMatch) {
      if (unorderedItems.length) flushLists();
      orderedItems.push(orderedMatch[1]);
      continue;
    }

    if (!hasStructuredHeading && /^Закон$/i.test(line)) {
      flushLists();
      html.push(
        `<p data-law-kind="title" data-law-align="center"><span style="color: ${settings.chapterColor}"><strong>${escapeHtml(line)}</strong></span></p>`
      );
      continue;
    }

    if (
      !hasStructuredHeading &&
      (/^[«“"].+[»”"]$/.test(line) || /^[A-ZА-ЯЁ0-9\s.,«»"“”()\-—]+$/.test(line))
    ) {
      flushLists();
      html.push(
        `<p data-law-kind="title" data-law-align="center"><span style="color: ${settings.chapterColor}"><strong>${escapeHtml(line)}</strong></span></p>`
      );
      continue;
    }

    flushLists();
    html.push(
      `<p data-law-kind="${insideArticle ? "article-body" : "body"}">${wrapBodyText(
        line,
        settings.italicizeArticleBody && insideArticle
      )}</p>`
    );
  }

  flushLists();
  return html.join("\n");
}
