export type LawForumExportInput = {
  title: string;
  subtitle?: string;
  number?: string;
  version?: string;
  contentHtml: string;
  includeHeader?: boolean;
};

const FORUM_TEXT_COLOR = "#f4f4f5";
const FORUM_MUTED_COLOR = "#a1a1aa";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeWhitespace(value: string) {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function applyStyle(element: HTMLElement, property: string, value: string) {
  if (!value) return;
  element.style.setProperty(property, value);
}

function preserveAllowedInlineStyles(element: HTMLElement) {
  const source = element.getAttribute("style") || "";
  if (!source) return;

  const parsed = document.createElement("span");
  parsed.setAttribute("style", source);

  const allowed = [
    "color",
    "background-color",
    "font-size",
    "font-family",
    "font-weight",
    "font-style",
    "text-decoration",
    "text-align",
    "line-height",
    "letter-spacing",
    "margin-left",
    "margin-right",
    "padding-left",
    "border-left",
  ];

  element.removeAttribute("style");
  allowed.forEach((property) => {
    const value = parsed.style.getPropertyValue(property);
    if (value) applyStyle(element, property, value);
  });
}

function applyLawAlignment(element: HTMLElement) {
  const alignment = element.getAttribute("data-law-align") || "";

  if (alignment === "center") {
    applyStyle(element, "text-align", "center");
  } else if (alignment === "right" || alignment === "right-indent") {
    applyStyle(element, "text-align", "right");
  } else {
    applyStyle(element, "text-align", "left");
  }

  if (alignment === "left-indent") {
    applyStyle(element, "margin-left", "48px");
  }

  if (alignment === "right-indent") {
    applyStyle(element, "margin-right", "48px");
  }
}

function normalizeForumElement(element: HTMLElement) {
  preserveAllowedInlineStyles(element);
  applyLawAlignment(element);

  const tag = element.tagName.toLowerCase();
  const kind = element.getAttribute("data-law-kind") || "";

  if (tag === "h1") {
    applyStyle(element, "font-size", "28px");
    applyStyle(element, "font-weight", "700");
    applyStyle(element, "line-height", "1.25");
    applyStyle(element, "text-align", "center");
    applyStyle(element, "margin", "0 0 20px");
  }

  if (tag === "h2" || kind === "section") {
    applyStyle(element, "font-size", "22px");
    applyStyle(element, "font-weight", "700");
    applyStyle(element, "line-height", "1.35");
    applyStyle(element, "text-align", "center");
    applyStyle(element, "margin", "28px 0 14px");
  }

  if (tag === "h3" || kind === "chapter") {
    applyStyle(element, "font-size", "20px");
    applyStyle(element, "font-weight", "700");
    applyStyle(element, "line-height", "1.35");
    applyStyle(element, "text-align", "center");
    applyStyle(element, "margin", "26px 0 14px");
  }

  if (tag === "h4" || kind === "article") {
    applyStyle(element, "font-size", "17px");
    applyStyle(element, "font-weight", "700");
    applyStyle(element, "line-height", "1.45");
    applyStyle(element, "text-align", "left");
    applyStyle(element, "margin", "22px 0 10px");
  }

  if (tag === "p") {
    applyStyle(element, "line-height", "1.65");
    applyStyle(element, "margin", "0 0 10px");
  }

  if (tag === "ol" || tag === "ul") {
    applyStyle(element, "margin", "8px 0 14px 30px");
    applyStyle(element, "padding-left", "24px");
  }

  if (tag === "li") {
    applyStyle(element, "line-height", "1.6");
    applyStyle(element, "margin", "0 0 6px");
  }

  if (tag === "blockquote" || kind === "note") {
    applyStyle(element, "border-left", "3px solid #ef4444");
    applyStyle(element, "padding-left", "14px");
    applyStyle(element, "margin", "14px 0");
    applyStyle(element, "font-style", "italic");
  }

  if (tag === "img") {
    applyStyle(element, "max-width", "100%");
    applyStyle(element, "height", "auto");
  }

  if (element.hasAttribute("data-law-chapter-title")) {
    applyStyle(element, "color", FORUM_TEXT_COLOR);
  }

  if (element.hasAttribute("data-law-article-title")) {
    applyStyle(element, "color", FORUM_TEXT_COLOR);
  }

  [
    "class",
    "id",
    "contenteditable",
    "data-law-kind",
    "data-law-align",
    "data-law-toc",
    "data-law-chapter-prefix",
    "data-law-chapter-title",
    "data-law-article-prefix",
    "data-law-article-title",
  ].forEach((attribute) => element.removeAttribute(attribute));

  Array.from(element.children).forEach((child) => {
    if (child instanceof HTMLElement) normalizeForumElement(child);
  });
}

function buildHeaderHtml(input: LawForumExportInput) {
  if (!input.includeHeader) return "";

  const details = [
    input.number ? `№ ${escapeHtml(input.number)}` : "",
    input.version ? `Редакция ${escapeHtml(input.version)}` : "",
  ].filter(Boolean);

  return `
    <div style="text-align:center;margin:0 0 28px">
      <div style="font-size:28px;line-height:1.25;font-weight:700;color:${FORUM_TEXT_COLOR}">${escapeHtml(
        input.title || "Нормативный акт"
      )}</div>
      ${
        input.subtitle
          ? `<div style="margin-top:8px;font-size:16px;line-height:1.5;color:${FORUM_MUTED_COLOR}">${escapeHtml(
              input.subtitle
            )}</div>`
          : ""
      }
      ${
        details.length
          ? `<div style="margin-top:8px;font-size:13px;color:${FORUM_MUTED_COLOR}">${details.join(
              " · "
            )}</div>`
          : ""
      }
    </div>`;
}

export function buildForumRichHtml(input: LawForumExportInput) {
  if (typeof document === "undefined") return input.contentHtml;

  const parser = new DOMParser();
  const parsed = parser.parseFromString(
    `<div data-export-root="true">${input.contentHtml || ""}</div>`,
    "text/html"
  );
  const root = parsed.querySelector<HTMLElement>("[data-export-root='true']");

  if (!root) return input.contentHtml;

  Array.from(root.children).forEach((child) => {
    if (child instanceof HTMLElement) normalizeForumElement(child);
  });

  root.removeAttribute("data-export-root");
  root.setAttribute(
    "style",
    `font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:${FORUM_TEXT_COLOR}`
  );

  root.insertAdjacentHTML("afterbegin", buildHeaderHtml(input));
  return root.outerHTML;
}

export function forumHtmlToPlainText(html: string) {
  if (typeof document === "undefined") {
    return normalizeWhitespace(html.replace(/<[^>]+>/g, " "));
  }

  const parser = new DOMParser();
  const parsed = parser.parseFromString(html, "text/html");

  parsed.querySelectorAll("br").forEach((element) =>
    element.replaceWith(document.createTextNode("\n"))
  );

  parsed
    .querySelectorAll("p,h1,h2,h3,h4,h5,h6,li,blockquote,div,hr")
    .forEach((element) => {
      element.append(document.createTextNode("\n"));
    });

  return normalizeWhitespace(parsed.body.textContent || "");
}

export async function copyRichLawToClipboard(input: LawForumExportInput) {
  const html = buildForumRichHtml(input);
  const plain = forumHtmlToPlainText(html);

  if (
    navigator.clipboard?.write &&
    typeof ClipboardItem !== "undefined" &&
    window.isSecureContext
  ) {
    const item = new ClipboardItem({
      "text/html": new Blob([html], { type: "text/html" }),
      "text/plain": new Blob([plain], { type: "text/plain" }),
    });

    await navigator.clipboard.write([item]);
    return;
  }

  const holder = document.createElement("div");
  holder.contentEditable = "true";
  holder.setAttribute("aria-hidden", "true");
  holder.style.position = "fixed";
  holder.style.left = "-100000px";
  holder.style.top = "0";
  holder.innerHTML = html;
  document.body.appendChild(holder);

  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(holder);
  selection?.removeAllRanges();
  selection?.addRange(range);

  const copied = document.execCommand("copy");
  selection?.removeAllRanges();
  holder.remove();

  if (!copied) throw new Error("Браузер не разрешил копирование");
}

export async function copyPlainLawToClipboard(input: LawForumExportInput) {
  const plain = forumHtmlToPlainText(buildForumRichHtml(input));
  await navigator.clipboard.writeText(plain);
}

function safeFilename(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-zа-яё0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return normalized || "law-document";
}

function triggerDownload(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function downloadLawAsHtml(input: LawForumExportInput) {
  const body = buildForumRichHtml(input);
  const page = `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(input.title || "Нормативный акт")}</title>
</head>
<body style="margin:32px;background:#111827">${body}</body>
</html>`;

  triggerDownload(
    page,
    `${safeFilename(input.title)}-forum.html`,
    "text/html;charset=utf-8"
  );
}

export function downloadLawAsText(input: LawForumExportInput) {
  const plain = forumHtmlToPlainText(buildForumRichHtml(input));
  triggerDownload(
    plain,
    `${safeFilename(input.title)}.txt`,
    "text/plain;charset=utf-8"
  );
}
