export type ArticleBlockType =
  | "heading"
  | "text"
  | "image"
  | "columns"
  | "table"
  | "quote"
  | "callout"
  | "divider"
  | "spacer";

export type ArticleBlockWidth = "narrow" | "normal" | "wide" | "full";
export type ArticleBlockAlign = "left" | "center" | "right";
export type ArticleBlockSurface = "none" | "panel" | "accent";
export type ArticleCalloutTone = "info" | "success" | "warning" | "danger";
export type ArticleTableStyle = "default" | "striped" | "minimal";

export type ArticleBlock = {
  id: string;
  type: ArticleBlockType;
  width: ArticleBlockWidth;
  align: ArticleBlockAlign;
  surface: ArticleBlockSurface;
  spaceTop: number;
  spaceBottom: number;
  anchor?: string;
  title?: string;
  level?: 2 | 3;
  html?: string;
  secondaryHtml?: string;
  imageUrl?: string;
  imageAlt?: string;
  caption?: string;
  imageHeight?: number;
  imageWidth?: number;
  imageFit?: "cover" | "contain";
  imagePosition?: string;
  tableCaption?: string;
  tableHeaders?: string[];
  tableRows?: string[][];
  tableStyle?: ArticleTableStyle;
  tableCompact?: boolean;
  tableFirstColumnStrong?: boolean;
  quoteAuthor?: string;
  tone?: ArticleCalloutTone;
  dividerStyle?: "solid" | "dashed" | "glow";
  spacerHeight?: number;
};

export type ArticleTocItem = {
  id: string;
  label: string;
  level: 2 | 3;
};

const widthValues = new Set<ArticleBlockWidth>([
  "narrow",
  "normal",
  "wide",
  "full",
]);
const alignValues = new Set<ArticleBlockAlign>(["left", "center", "right"]);
const surfaceValues = new Set<ArticleBlockSurface>([
  "none",
  "panel",
  "accent",
]);
const tableStyleValues = new Set<ArticleTableStyle>([
  "default",
  "striped",
  "minimal",
]);
const blockTypes = new Set<ArticleBlockType>([
  "heading",
  "text",
  "image",
  "columns",
  "table",
  "quote",
  "callout",
  "divider",
  "spacer",
]);

function createId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `block-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function slugifyAnchor(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replaceAll("ё", "е")
    .replace(/[^a-z0-9а-я\s_-]/gi, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return normalized || "section";
}

function clampNumber(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.round(parsed)));
}

function normalizeTableHeaders(value: unknown, fallback: string[]) {
  const headers = Array.isArray(value)
    ? value.map((item) => String(item ?? "").slice(0, 180)).slice(0, 12)
    : fallback;

  return headers.length > 0 ? headers : ["Колонка 1"];
}

function normalizeTableRows(value: unknown, columnCount: number, fallback: string[][]) {
  const source = Array.isArray(value) ? value : fallback;

  return source.slice(0, 250).map((row) => {
    const cells = Array.isArray(row) ? row : [];

    return Array.from({ length: columnCount }, (_, index) =>
      String(cells[index] ?? "").slice(0, 4000)
    );
  });
}

export function createArticleBlock(type: ArticleBlockType): ArticleBlock {
  const base: ArticleBlock = {
    id: createId(),
    type,
    width: "normal",
    align: "left",
    surface: "none",
    spaceTop: 12,
    spaceBottom: 12,
  };

  switch (type) {
    case "heading":
      return {
        ...base,
        title: "Новый раздел",
        level: 2,
        anchor: "new-section",
        spaceTop: 26,
        spaceBottom: 12,
      };
    case "text":
      return {
        ...base,
        html: "<p>Добавьте текст, ссылки, списки и форматирование.</p>",
      };
    case "image":
      return {
        ...base,
        width: "wide",
        imageUrl: "",
        imageAlt: "",
        caption: "",
        imageHeight: 720,
        imageWidth: 80,
        imageFit: "contain",
        imagePosition: "50% 50%",
      };
    case "columns":
      return {
        ...base,
        width: "wide",
        surface: "panel",
        html: "<h3>Левая колонка</h3><p>Основная информация.</p>",
        secondaryHtml: "<h3>Правая колонка</h3><p>Дополнительная информация.</p>",
      };
    case "table":
      return {
        ...base,
        width: "wide",
        tableCaption: "",
        tableHeaders: ["Название", "Цена", "Описание"],
        tableRows: [
          ["Новый элемент", "0$", "Описание элемента"],
          ["Новый элемент", "0$", "Описание элемента"],
        ],
        tableStyle: "default",
        tableCompact: false,
        tableFirstColumnStrong: false,
      };
    case "quote":
      return {
        ...base,
        width: "narrow",
        surface: "accent",
        html: "<p>Важная цитата или примечание.</p>",
        quoteAuthor: "",
      };
    case "callout":
      return {
        ...base,
        surface: "panel",
        title: "Обратите внимание",
        html: "<p>Важная информация для читателя.</p>",
        tone: "info",
      };
    case "divider":
      return {
        ...base,
        dividerStyle: "glow",
        spaceTop: 22,
        spaceBottom: 22,
      };
    case "spacer":
      return {
        ...base,
        spacerHeight: 48,
        spaceTop: 0,
        spaceBottom: 0,
      };
  }
}

export function normalizeArticleBlock(
  value: Partial<ArticleBlock>,
  index = 0
): ArticleBlock {
  const type = blockTypes.has(value.type as ArticleBlockType)
    ? (value.type as ArticleBlockType)
    : "text";
  const fallback = createArticleBlock(type);
  const fallbackHeaders = fallback.tableHeaders || ["Колонка 1"];
  const tableHeaders = normalizeTableHeaders(value.tableHeaders, fallbackHeaders);
  const tableRows = normalizeTableRows(
    value.tableRows,
    tableHeaders.length,
    fallback.tableRows || []
  );

  return {
    ...fallback,
    ...value,
    id: String(value.id || `legacy-${index}-${createId()}`),
    type,
    width: widthValues.has(value.width as ArticleBlockWidth)
      ? (value.width as ArticleBlockWidth)
      : fallback.width,
    align: alignValues.has(value.align as ArticleBlockAlign)
      ? (value.align as ArticleBlockAlign)
      : fallback.align,
    surface: surfaceValues.has(value.surface as ArticleBlockSurface)
      ? (value.surface as ArticleBlockSurface)
      : fallback.surface,
    spaceTop: clampNumber(value.spaceTop, fallback.spaceTop, 0, 240),
    spaceBottom: clampNumber(value.spaceBottom, fallback.spaceBottom, 0, 240),
    level: value.level === 3 ? 3 : 2,
    imageHeight: clampNumber(value.imageHeight, 720, 100, 1800),
    imageWidth: clampNumber(value.imageWidth, fallback.imageWidth || 80, 20, 100),
    spacerHeight: clampNumber(value.spacerHeight, 48, 8, 320),
    tableCaption: String(value.tableCaption || "").slice(0, 300),
    tableHeaders,
    tableRows,
    tableStyle: tableStyleValues.has(value.tableStyle as ArticleTableStyle)
      ? (value.tableStyle as ArticleTableStyle)
      : "default",
    tableCompact: Boolean(value.tableCompact),
    tableFirstColumnStrong: Boolean(value.tableFirstColumnStrong),
  };
}

export function normalizeArticleBlocks(value: unknown): ArticleBlock[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((block, index) =>
    normalizeArticleBlock((block || {}) as Partial<ArticleBlock>, index)
  );
}

function decodeHtml(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractHtmlHeadings(html: string, blockId: string): ArticleTocItem[] {
  const items: ArticleTocItem[] = [];
  const pattern = /<h([23])(?:\s[^>]*)?>([\s\S]*?)<\/h\1>/gi;
  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = pattern.exec(html))) {
    const label = decodeHtml(match[2]);

    if (label) {
      items.push({
        id: `${blockId}-${index}-${slugifyAnchor(label)}`,
        label,
        level: Number(match[1]) === 3 ? 3 : 2,
      });
      index += 1;
    }
  }

  return items;
}

export function getHeadingBlockAnchorMap(blocks: ArticleBlock[]) {
  const used = new Map<string, number>();
  const anchors = new Map<string, string>();

  for (const block of blocks) {
    if (block.type !== "heading") continue;

    const label = String(block.title || "Раздел").trim();
    const base = slugifyAnchor(block.anchor || label);
    const duplicateIndex = used.get(base) || 0;
    used.set(base, duplicateIndex + 1);
    anchors.set(
      block.id,
      duplicateIndex === 0 ? base : `${base}-${duplicateIndex + 1}`
    );
  }

  return anchors;
}

export function getArticleTableOfContents(blocks: ArticleBlock[]) {
  const used = new Map<string, number>();
  const headingAnchors = getHeadingBlockAnchorMap(blocks);
  const items: ArticleTocItem[] = [];

  for (const block of blocks) {
    if (block.type === "heading") {
      const label = String(block.title || "Раздел").trim();

      items.push({
        id: headingAnchors.get(block.id) || slugifyAnchor(label),
        label,
        level: block.level === 3 ? 3 : 2,
      });
      continue;
    }

    if (block.type === "text" || block.type === "columns") {
      const richHeadings = [
        ...extractHtmlHeadings(block.html || "", block.id),
        ...extractHtmlHeadings(block.secondaryHtml || "", `${block.id}-secondary`),
      ];

      for (const item of richHeadings) {
        const duplicateIndex = used.get(item.id) || 0;
        used.set(item.id, duplicateIndex + 1);
        items.push({
          ...item,
          id:
            duplicateIndex === 0
              ? item.id
              : `${item.id}-${duplicateIndex + 1}`,
        });
      }
    }
  }

  return items;
}

export function getArticlePrimaryAnchor(
  blocks: ArticleBlock[],
  preferredAnchor?: string
) {
  const toc = getArticleTableOfContents(blocks);

  if (preferredAnchor && toc.some((item) => item.id === preferredAnchor)) {
    return preferredAnchor;
  }

  return toc[0]?.id || "article-start";
}

export function injectRichTextHeadingAnchors(
  html: string,
  blockId: string,
  secondary = false
) {
  let index = 0;
  const prefix = secondary ? `${blockId}-secondary` : blockId;

  return html.replace(
    /<h([23])(?:\s[^>]*)?>([\s\S]*?)<\/h\1>/gi,
    (full, level: string, inner: string) => {
      const label = decodeHtml(inner);
      const id = `${prefix}-${index}-${slugifyAnchor(label)}`;
      index += 1;
      return `<h${level} id="${id}">${inner}</h${level}>`;
    }
  );
}

export function getArticleSearchText(blocks: ArticleBlock[]) {
  return blocks
    .map((block) =>
      [
        block.title,
        block.html,
        block.secondaryHtml,
        block.imageAlt,
        block.caption,
        block.tableCaption,
        ...(block.tableHeaders || []),
        ...(block.tableRows || []).flat(),
        block.quoteAuthor,
      ]
        .filter(Boolean)
        .join(" ")
    )
    .join(" ")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/\s*(p|li|div|h[1-6])>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}
