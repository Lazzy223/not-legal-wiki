"use client";

import { useEffect, useRef, useState } from "react";
import { Extension } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { Transaction } from "@tiptap/pm/state";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import { TextStyleKit } from "@tiptap/extension-text-style";
import styles from "./text-editor.module.css";


const LEGAL_ALIGNABLE_NODES = [
  "paragraph",
  "heading",
  "blockquote",
  "bulletList",
  "orderedList",
  "horizontalRule",
];

type LegalBlockAlignment =
  | "left"
  | "left-indent"
  | "center"
  | "right-indent"
  | "right";

type LegalBlockKind =
  | "title"
  | "section"
  | "chapter"
  | "article"
  | "article-body"
  | "body"
  | "part"
  | "subpoint"
  | "note"
  | "divider";

const LegalBlockAlignmentExtension = Extension.create({
  name: "legalBlockAlignment",

  addGlobalAttributes() {
    return [
      {
        types: LEGAL_ALIGNABLE_NODES,
        attributes: {
          lawAlign: {
            default: null,
            parseHTML: (element) => element.getAttribute("data-law-align"),
            renderHTML: (attributes) =>
              attributes.lawAlign
                ? { "data-law-align": attributes.lawAlign }
                : {},
          },
          lawKind: {
            default: null,
            parseHTML: (element) => element.getAttribute("data-law-kind"),
            renderHTML: (attributes) =>
              attributes.lawKind
                ? { "data-law-kind": attributes.lawKind }
                : {},
          },
          lawToc: {
            default: null,
            parseHTML: (element) => element.getAttribute("data-law-toc"),
            renderHTML: (attributes) =>
              attributes.lawToc
                ? { "data-law-toc": attributes.lawToc }
                : {},
          },
          lawListColor: {
            default: null,
            parseHTML: (element) => element.getAttribute("data-law-list-color"),
            renderHTML: (attributes) =>
              attributes.lawListColor
                ? {
                    "data-law-list-color": attributes.lawListColor,
                    style: `--law-list-color: ${attributes.lawListColor}`,
                  }
                : {},
          },
        },
      },
    ];
  },
});

function getCurrentLegalAlignment(editor: Editor): LegalBlockAlignment | null {
  const { $from } = editor.state.selection;

  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const node = $from.node(depth);
    if (!LEGAL_ALIGNABLE_NODES.includes(node.type.name)) continue;
    return (node.attrs.lawAlign as LegalBlockAlignment | null) || null;
  }

  return null;
}

function setLegalBlockAlignment(
  editor: Editor,
  alignment: LegalBlockAlignment
) {
  const { state, view } = editor;
  const { from, to, $from, $to } = state.selection;
  const positions = new Set<number>();

  state.doc.nodesBetween(from, to, (node, position) => {
    if (LEGAL_ALIGNABLE_NODES.includes(node.type.name)) {
      positions.add(position);
    }
  });

  for (const resolved of [$from, $to]) {
    for (let depth = resolved.depth; depth > 0; depth -= 1) {
      const node = resolved.node(depth);
      if (!LEGAL_ALIGNABLE_NODES.includes(node.type.name)) continue;
      positions.add(resolved.before(depth));
    }
  }

  const transaction = state.tr;

  [...positions]
    .sort((first, second) => first - second)
    .forEach((position) => {
      const node = transaction.doc.nodeAt(position);
      if (!node || !LEGAL_ALIGNABLE_NODES.includes(node.type.name)) return;

      transaction.setNodeMarkup(position, undefined, {
        ...node.attrs,
        lawAlign: alignment,
      });
    });

  if (transaction.docChanged) {
    view.dispatch(transaction);
    view.focus();
  }
}

type TextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  mode?: "default" | "legal";
  legalChapterColor?: string;
  legalArticleColor?: string;
  legalListColor?: string;
  onLegalChapterColorChange?: (value: string) => void;
  onLegalArticleColorChange?: (value: string) => void;
  onLegalListColorChange?: (value: string) => void;
};

function normalizeContent(value: string) {
  if (!value || !value.trim()) {
    return "<p></p>";
  }

  const hasHtmlTags = /<\/?[a-z][\s\S]*>/i.test(value);

  if (hasHtmlTags) {
    return value;
  }

  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => `<p>${item}</p>`)
    .join("");
}

export default function TextEditor({
  value,
  onChange,
  mode = "default",
  legalChapterColor = "#f4f4f5",
  legalArticleColor = "#ef4444",
  legalListColor = "#ef4444",
  onLegalChapterColorChange,
  onLegalArticleColorChange,
  onLegalListColorChange,
}: TextEditorProps) {
  const lastValueRef = useRef("");
  const lastTextSelectionRef = useRef<{ from: number; to: number } | null>(null);
  const [hasSelection, setHasSelection] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3, 4],
        },
      }),

      Underline,

      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: {
          target: "_blank",
          rel: "noreferrer",
        },
      }),

      TextStyleKit,
      ...(mode === "legal" ? [LegalBlockAlignmentExtension] : []),
    ],

    content: normalizeContent(value),
    immediatelyRender: false,

    onCreate({ editor }) {
      lastValueRef.current = editor.getHTML();
      const { from, to } = editor.state.selection;
      if (from !== to) lastTextSelectionRef.current = { from, to };
      setHasSelection(from !== to);
    },

    onUpdate({ editor }) {
      const html = editor.getHTML();

      lastValueRef.current = html;
      onChange(html);
      const { from, to } = editor.state.selection;
      if (from !== to) lastTextSelectionRef.current = { from, to };
      setHasSelection(from !== to);
    },

    onSelectionUpdate({ editor }) {
      const { from, to } = editor.state.selection;
      if (from !== to) lastTextSelectionRef.current = { from, to };
      setHasSelection(from !== to);
    },
  });

  useEffect(() => {
    if (!editor) return;

    const normalizedValue = normalizeContent(value);

    if (normalizedValue !== lastValueRef.current) {
      editor.commands.setContent(normalizedValue);
      lastValueRef.current = normalizedValue;
    }
  }, [editor, value]);

  function restoreLastTextSelection() {
    if (!editor) return false;
    if (!editor.state.selection.empty) return true;

    const saved = lastTextSelectionRef.current;
    if (!saved) return false;

    const maximumPosition = editor.state.doc.content.size;
    const from = Math.max(1, Math.min(saved.from, maximumPosition));
    const to = Math.max(from, Math.min(saved.to, maximumPosition));

    if (from === to) return false;

    editor.commands.setTextSelection({ from, to });
    return !editor.state.selection.empty;
  }

  function requireSelection() {
    if (!editor) return false;

    if (!restoreLastTextSelection()) {
      alert("Сначала выдели текст, потом нажми кнопку.");
      return false;
    }

    return true;
  }

  function toggleBold() {
    if (!editor || !requireSelection()) return;

    editor.chain().focus().toggleBold().run();
  }

  function toggleItalic() {
    if (!editor || !requireSelection()) return;

    editor.chain().focus().toggleItalic().run();
  }

  function toggleUnderline() {
    if (!editor || !requireSelection()) return;

    editor.chain().focus().toggleUnderline().run();
  }

  function toggleHeading() {
    if (!editor || !requireSelection()) return;

    editor.chain().focus().toggleHeading({ level: 2 }).run();
  }

  function setParagraph() {
    if (!editor || !requireSelection()) return;

    editor.chain().focus().setParagraph().run();
  }

  function toggleBulletList() {
    if (!editor || !requireSelection()) return;

    editor.chain().focus().toggleBulletList().run();
    if (mode === "legal") setSelectedListColor(legalListColor);
  }

  function toggleOrderedList() {
    if (!editor || !requireSelection()) return;

    editor.chain().focus().toggleOrderedList().run();
    if (mode === "legal") setSelectedListColor(legalListColor);
  }

  function toggleLink() {
    if (!editor || !requireSelection()) return;

    if (editor.isActive("link")) {
      editor.chain().focus().unsetLink().run();
      return;
    }

    const url = prompt("Вставь ссылку:");

    if (!url) return;

    editor.chain().focus().setLink({ href: url }).run();
  }

  function setFontSize(size: string) {
    if (!editor || !requireSelection()) return;

    const chain = editor.chain().focus();

    if (editor.isActive("textStyle", { fontSize: size })) {
      chain.unsetFontSize().run();
      return;
    }

    chain.setFontSize(size).run();
  }

  function setFontFamily(fontFamily: string) {
    if (!editor || !requireSelection()) return;

    const chain = editor.chain().focus();

    if (editor.isActive("textStyle", { fontFamily })) {
      chain.unsetFontFamily().run();
      return;
    }

    chain.setFontFamily(fontFamily).run();
  }

  function setTextColor(color: string) {
    if (!editor || !requireSelection()) return;

    const chain = editor.chain().focus();

    if (color === "reset") {
      chain.unsetColor().run();
      return;
    }

    chain.setColor(color).run();
  }

  function setTextBackground(color: string) {
    if (!editor || !requireSelection()) return;

    const chain = editor.chain().focus();

    if (color === "reset") {
      chain.unsetBackgroundColor().run();
      return;
    }

    chain.setBackgroundColor(color).run();
  }

  function applyKeyStyle() {
    if (!editor || !requireSelection()) return;

    const chain = editor.chain().focus();
    chain.setColor("#f4f4f5").setBackgroundColor("#4a171b").run();
  }

  function applyLegalAlignment(alignment: LegalBlockAlignment) {
    if (!editor || !requireSelection()) return;
    setLegalBlockAlignment(editor, alignment);

    const { from, to } = editor.state.selection;
    if (from !== to) lastTextSelectionRef.current = { from, to };
  }

  function clearFormatting() {
    if (!editor || !requireSelection()) return;

    editor.chain().focus().unsetAllMarks().clearNodes().run();
  }

  function getSelectedLegalTextBlocks() {
    if (!editor) return [];

    const { state } = editor;
    const { from, to, $from, $to } = state.selection;
    const positions = new Set<number>();

    state.doc.nodesBetween(from, to, (node, position) => {
      if (node.isTextblock && ["paragraph", "heading"].includes(node.type.name)) {
        positions.add(position);
      }
    });

    for (const resolved of [$from, $to]) {
      for (let depth = resolved.depth; depth > 0; depth -= 1) {
        const node = resolved.node(depth);
        if (!node.isTextblock) continue;
        if (!["paragraph", "heading"].includes(node.type.name)) continue;
        positions.add(resolved.before(depth));
        break;
      }
    }

    return [...positions].sort((first, second) => first - second);
  }

  function setKindOnSelectedNodes(
    nodeNames: string[],
    kind: LegalBlockKind
  ) {
    if (!editor) return;

    const { state, view } = editor;
    const { from, to, $from, $to } = state.selection;
    const positions = new Set<number>();

    state.doc.nodesBetween(from, to, (node, position) => {
      if (nodeNames.includes(node.type.name)) positions.add(position);
    });

    for (const resolved of [$from, $to]) {
      for (let depth = resolved.depth; depth > 0; depth -= 1) {
        const node = resolved.node(depth);
        if (!nodeNames.includes(node.type.name)) continue;
        positions.add(resolved.before(depth));
        break;
      }
    }

    const transaction = state.tr;

    [...positions]
      .sort((first, second) => first - second)
      .forEach((position) => {
        const node = transaction.doc.nodeAt(position);
        if (!node || !nodeNames.includes(node.type.name)) return;

        transaction.setNodeMarkup(position, undefined, {
          ...node.attrs,
          lawKind: kind,
        });
      });

    if (transaction.docChanged) {
      view.dispatch(transaction.scrollIntoView());
      view.focus();
    }
  }

  function applyColorToNodeContent(
    transaction: Transaction,
    node: ProseMirrorNode,
    position: number,
    color: string
  ) {
    const textStyle = transaction.doc.type.schema.marks.textStyle;
    if (!textStyle || node.content.size === 0) return;

    transaction.addMark(
      position + 1,
      position + node.nodeSize - 1,
      textStyle.create({ color })
    );
  }

  function applyChapterHeadingColors(
    transaction: Transaction,
    node: ProseMirrorNode,
    position: number,
    prefixColor: string
  ) {
    const textStyle = transaction.doc.type.schema.marks.textStyle;
    if (!textStyle || node.content.size === 0) return;

    const contentFrom = position + 1;
    const contentTo = position + node.nodeSize - 1;

    transaction.addMark(
      contentFrom,
      contentTo,
      textStyle.create({ color: "#f4f4f5" })
    );

    const prefix = node.textContent.match(
      /^\s*(ГЛАВА\s+[IVXLCDM\d]+(?:\.\d+)?\.?)/i
    );
    if (!prefix) return;

    const prefixStart = contentFrom + node.textContent.indexOf(prefix[1]);
    transaction.addMark(
      prefixStart,
      prefixStart + prefix[1].length,
      textStyle.create({ color: prefixColor })
    );
  }

  function applyArticleHeadingColors(
    transaction: Transaction,
    node: ProseMirrorNode,
    position: number,
    prefixColor: string
  ) {
    const textStyle = transaction.doc.type.schema.marks.textStyle;
    if (!textStyle || node.content.size === 0) return;

    const contentFrom = position + 1;
    const contentTo = position + node.nodeSize - 1;

    transaction.addMark(
      contentFrom,
      contentTo,
      textStyle.create({ color: "#f4f4f5" })
    );

    const prefix = node.textContent.match(
      /^\s*(Статья\s+\d+(?:\.\d+)?\.?)/i
    );
    if (!prefix) return;

    const prefixStart = contentFrom + node.textContent.indexOf(prefix[1]);
    transaction.addMark(
      prefixStart,
      prefixStart + prefix[1].length,
      textStyle.create({ color: prefixColor })
    );
  }

  function applyPrefixColor(
    transaction: Transaction,
    node: ProseMirrorNode,
    position: number,
    color: string
  ) {
    const prefix = node.textContent.match(/^\s*((?:[а-яёa-z]\)|\d+[.)]))/i);
    const textStyle = transaction.doc.type.schema.marks.textStyle;
    if (!prefix || !textStyle) return;

    const prefixStart = position + 1 + node.textContent.indexOf(prefix[1]);
    transaction.addMark(
      prefixStart,
      prefixStart + prefix[1].length,
      textStyle.create({ color })
    );
  }

  function setSelectedListColor(color: string) {
    if (!editor) return;

    const { state, view } = editor;
    const { from, to, $from, $to } = state.selection;
    const positions = new Set<number>();

    state.doc.nodesBetween(from, to, (node, position) => {
      if (["bulletList", "orderedList"].includes(node.type.name)) {
        positions.add(position);
      }
    });

    for (const resolved of [$from, $to]) {
      for (let depth = resolved.depth; depth > 0; depth -= 1) {
        const node = resolved.node(depth);
        if (!["bulletList", "orderedList"].includes(node.type.name)) continue;
        positions.add(resolved.before(depth));
      }
    }

    const transaction = state.tr;
    positions.forEach((position) => {
      const node = transaction.doc.nodeAt(position);
      if (!node) return;
      transaction.setNodeMarkup(position, undefined, {
        ...node.attrs,
        lawListColor: color,
      });
    });

    if (transaction.docChanged) {
      view.dispatch(transaction);
      view.focus();
    }
  }

  function toggleLegalToc() {
    if (!editor) return;

    restoreLastTextSelection();
    const positions = getSelectedLegalTextBlocks();
    if (!positions.length) return;

    const { state, view } = editor;
    const shouldRemove = positions.every((position) => {
      const node = state.doc.nodeAt(position);
      return node?.attrs.lawToc === "true" || node?.attrs.lawToc === true;
    });
    const transaction = state.tr;

    positions.forEach((position) => {
      const node = transaction.doc.nodeAt(position);
      if (!node) return;
      transaction.setNodeMarkup(position, undefined, {
        ...node.attrs,
        lawToc: shouldRemove ? null : "true",
      });
    });

    if (transaction.docChanged) {
      view.dispatch(transaction.scrollIntoView());
      view.focus();
    }
  }

  function applyLegalStructure(kind: LegalBlockKind) {
    if (!editor) return;

    restoreLastTextSelection();

    if (kind === "note") {
      editor.chain().focus().setParagraph().setBlockquote().run();
      setKindOnSelectedNodes(["blockquote"], "note");
      return;
    }

    const positions = getSelectedLegalTextBlocks();
    if (!positions.length) return;

    const { state, view } = editor;
    const transaction = state.tr;

    for (const position of positions) {
      const node = transaction.doc.nodeAt(position);
      if (!node || !node.isTextblock) continue;

      const commonAttributes = {
        lawToc: node.attrs.lawToc || null,
        lawListColor: node.attrs.lawListColor || null,
      };

      if (kind === "section" || kind === "chapter" || kind === "article") {
        const level = kind === "section" ? 2 : kind === "chapter" ? 3 : 4;
        const lawAlign = kind === "article" ? "left" : "center";
        transaction.setNodeMarkup(position, state.schema.nodes.heading, {
          level,
          lawAlign,
          lawKind: kind,
          ...commonAttributes,
        });
        if (kind === "chapter") {
          applyChapterHeadingColors(
            transaction,
            node,
            position,
            legalChapterColor
          );
        } else if (kind === "article") {
          applyArticleHeadingColors(
            transaction,
            node,
            position,
            legalArticleColor
          );
        } else {
          applyColorToNodeContent(
            transaction,
            node,
            position,
            legalChapterColor
          );
        }
        continue;
      }

      if (kind === "part" || kind === "subpoint") {
        transaction.setNodeMarkup(position, state.schema.nodes.paragraph, {
          lawAlign: node.attrs.lawAlign || "left",
          lawKind: kind,
          lawToc: node.attrs.lawToc || null,
          lawListColor: kind === "subpoint" ? legalListColor : null,
        });
        if (kind === "subpoint") {
          applyPrefixColor(transaction, node, position, legalListColor);
        }
        continue;
      }

      transaction.setNodeMarkup(position, undefined, {
        ...node.attrs,
        lawKind: "divider",
      });
    }

    if (transaction.docChanged) {
      view.dispatch(transaction.scrollIntoView());
      view.focus();
    }

    const { from, to } = editor.state.selection;
    if (from !== to) lastTextSelectionRef.current = { from, to };
  }

  function applyLegalDocumentFormatting(colors?: {
    chapterColor?: string;
    articleColor?: string;
    listColor?: string;
  }) {
    if (!editor) return;

    const activeChapterColor = colors?.chapterColor || legalChapterColor;
    const activeArticleColor = colors?.articleColor || legalArticleColor;
    const activeListColor = colors?.listColor || legalListColor;
    const { state, view } = editor;
    const transaction = state.tr;

    state.doc.descendants((node, position) => {
      if (!["heading", "paragraph", "bulletList", "orderedList"].includes(node.type.name)) {
        return;
      }

      const title = node.textContent.trim();
      const kind = node.attrs.lawKind as LegalBlockKind | null;
      const isSection = kind === "section" || /^РАЗДЕЛ\s+/i.test(title);
      const isChapter = kind === "chapter" || /^ГЛАВА\s+/i.test(title);
      const isArticle = kind === "article" || /^Статья\s+\d/i.test(title);
      const isSubpoint =
        kind === "subpoint" || /^[а-яёa-z]\)(?:\s+|$)/i.test(title);

      if (isSection || isChapter || isArticle) {
        const lawKind = isSection ? "section" : isChapter ? "chapter" : "article";
        const level = isSection ? 2 : isChapter ? 3 : 4;
        transaction.setNodeMarkup(position, state.schema.nodes.heading, {
          ...node.attrs,
          level,
          lawKind,
          lawAlign: isArticle ? "left" : "center",
        });
        if (isChapter) {
          applyChapterHeadingColors(
            transaction,
            node,
            position,
            activeChapterColor
          );
        } else if (isArticle) {
          applyArticleHeadingColors(
            transaction,
            node,
            position,
            activeArticleColor
          );
        } else {
          applyColorToNodeContent(
            transaction,
            node,
            position,
            activeChapterColor
          );
        }
        return false;
      }

      if (["bulletList", "orderedList"].includes(node.type.name)) {
        transaction.setNodeMarkup(position, undefined, {
          ...node.attrs,
          lawListColor: activeListColor,
        });
        return;
      }

      if (isSubpoint && node.type.name === "paragraph") {
        transaction.setNodeMarkup(position, undefined, {
          ...node.attrs,
          lawKind: "subpoint",
          lawListColor: activeListColor,
        });
        applyPrefixColor(transaction, node, position, activeListColor);
      }
    });

    if (transaction.docChanged) {
      view.dispatch(transaction.scrollIntoView());
      view.focus();
    }
  }

  function toggleAllArticleBodyItalic() {
    if (!editor) return;

    const { state, view } = editor;
    const italic = state.schema.marks.italic;
    if (!italic) return;

    const ranges: Array<{ from: number; to: number; italic: boolean }> = [];
    let insideArticle = false;

    state.doc.forEach((node, offset) => {
      const title = node.textContent.trim();
      const kind = node.attrs.lawKind as LegalBlockKind | null;
      const startsArticle = kind === "article" || /^Статья\s+\d/i.test(title);
      const closesArticle =
        kind === "section" ||
        kind === "chapter" ||
        /^РАЗДЕЛ\s+/i.test(title) ||
        /^ГЛАВА\s+/i.test(title);

      if (startsArticle) {
        insideArticle = true;
        return;
      }

      if (closesArticle) {
        insideArticle = false;
        return;
      }

      const semanticBody = [
        "article-body",
        "part",
        "subpoint",
        "note",
      ].includes(kind || "");

      if (!insideArticle && !semanticBody) return;
      if (node.type.name === "heading") return;

      node.descendants((child, childOffset) => {
        if (!child.isText || !child.text) return;
        if (child.marks.some((mark) => mark.type.name === "bold")) return;
        ranges.push({
          from: offset + 1 + childOffset,
          to: offset + 1 + childOffset + child.nodeSize,
          italic: child.marks.some((mark) => mark.type === italic),
        });
      });
    });

    if (!ranges.length) {
      alert("В документе не найдены статьи с текстом.");
      return;
    }

    const removeItalic = ranges.every((range) => range.italic);
    const transaction = state.tr;

    ranges.forEach((range) => {
      if (removeItalic) {
        transaction.removeMark(range.from, range.to, italic);
      } else {
        transaction.addMark(range.from, range.to, italic.create());
      }
    });

    view.dispatch(transaction.scrollIntoView());
    view.focus();
  }

  if (!editor) {
    return <div className={styles.loading}>Загрузка редактора...</div>;
  }

  return (
    <div className={styles.editorBox}>
      <div className={styles.toolbar}>
        {mode === "legal" && (
          <div
            className={styles.legalTools}
            onMouseDown={(event) => {
              if ((event.target as HTMLElement).closest("button")) {
                event.preventDefault();
              }
            }}
          >
            <div className={styles.legalToolGroup}>
              <span>Структура закона</span>

              <button
                type="button"
                onClick={() => applyLegalStructure("section")}
              >
                Раздел
              </button>

              <button
                type="button"
                onClick={() => applyLegalStructure("chapter")}
              >
                Глава
              </button>

              <button
                type="button"
                onClick={() => applyLegalStructure("article")}
              >
                Статья
              </button>

              <button
                type="button"
                onClick={() => applyLegalStructure("part")}
              >
                Часть
              </button>

              <button
                type="button"
                onClick={() => applyLegalStructure("subpoint")}
              >
                Подпункт
              </button>

              <button type="button" onClick={() => applyLegalStructure("note")}>
                Примечание
              </button>

              <button
                type="button"
                onClick={() => applyLegalStructure("divider")}
              >
                Разделитель
              </button>

              <button type="button" onClick={toggleLegalToc}>
                В содержание
              </button>
            </div>

            <div className={styles.legalToolGroup}>
              <span>Автоматизация</span>

              <label className={styles.legalColorControl}>
                <b>Главы</b>
                <input
                  type="color"
                  value={legalChapterColor}
                  onChange={(event) => {
                    const color = event.target.value;
                    onLegalChapterColorChange?.(color);
                    applyLegalDocumentFormatting({ chapterColor: color });
                  }}
                />
              </label>

              <label className={styles.legalColorControl}>
                <b>Статьи</b>
                <input
                  type="color"
                  value={legalArticleColor}
                  onChange={(event) => {
                    const color = event.target.value;
                    onLegalArticleColorChange?.(color);
                    applyLegalDocumentFormatting({ articleColor: color });
                  }}
                />
              </label>

              <label className={styles.legalColorControl}>
                <b>Списки</b>
                <input
                  type="color"
                  value={legalListColor}
                  onChange={(event) => {
                    const color = event.target.value;
                    onLegalListColorChange?.(color);
                    applyLegalDocumentFormatting({ listColor: color });
                  }}
                />
              </label>

              <button type="button" onClick={() => applyLegalDocumentFormatting()}>
                Автооформить весь документ
              </button>

              <button type="button" onClick={toggleAllArticleBodyItalic}>
                Курсив текста статей
              </button>
            </div>

            <div className={styles.legalToolGroup}>
              <span>Положение блока</span>
              {([
                ["left", "К левому краю", "⇤"],
                ["left-indent", "Слева с отступом", "↤"],
                ["center", "По центру", "↔"],
                ["right-indent", "Справа с отступом", "↦"],
                ["right", "К правому краю", "⇥"],
              ] as const).map(([alignment, label, icon]) => (
                <button
                  type="button"
                  key={alignment}
                  title={label}
                  aria-label={label}
                  onClick={() => applyLegalAlignment(alignment)}
                  className={
                    getCurrentLegalAlignment(editor) === alignment
                      ? styles.activeButton
                      : ""
                  }
                >
                  <b>{icon}</b> {label}
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          type="button"
          disabled={!hasSelection}
          onClick={setParagraph}
          className={editor.isActive("paragraph") ? styles.activeButton : ""}
        >
          Текст
        </button>

        <button
          type="button"
          disabled={!hasSelection}
          onClick={toggleHeading}
          className={
            editor.isActive("heading", { level: 2 }) ? styles.activeButton : ""
          }
        >
          Заголовок
        </button>

        <button
          type="button"
          disabled={!hasSelection}
          onClick={toggleBold}
          className={editor.isActive("bold") ? styles.activeButton : ""}
        >
          Жирный
        </button>

        <button
          type="button"
          disabled={!hasSelection}
          onClick={toggleItalic}
          className={editor.isActive("italic") ? styles.activeButton : ""}
        >
          Курсив
        </button>

        <button
          type="button"
          disabled={!hasSelection}
          onClick={toggleUnderline}
          className={editor.isActive("underline") ? styles.activeButton : ""}
        >
          Подчеркнуть
        </button>

        <button
          type="button"
          disabled={!hasSelection}
          onClick={toggleBulletList}
          className={editor.isActive("bulletList") ? styles.activeButton : ""}
        >
          • Список
        </button>

        <button
          type="button"
          disabled={!hasSelection}
          onClick={toggleOrderedList}
          className={editor.isActive("orderedList") ? styles.activeButton : ""}
        >
          1. Список
        </button>

        <button
          type="button"
          disabled={!hasSelection}
          onClick={toggleLink}
          className={editor.isActive("link") ? styles.activeButton : ""}
        >
          Ссылка
        </button>

        <select
          disabled={!hasSelection}
          defaultValue=""
          onChange={(event) => {
            if (!event.target.value) return;
            setFontSize(event.target.value);
            event.target.value = "";
          }}
        >
          <option value="">Размер</option>
          <option value="13px">Маленький</option>
          <option value="16px">Обычный</option>
          <option value="20px">Средний</option>
          <option value="26px">Большой</option>
          <option value="34px">Огромный</option>
        </select>

        <select
          disabled={!hasSelection}
          defaultValue=""
          onChange={(event) => {
            if (!event.target.value) return;
            setFontFamily(event.target.value);
            event.target.value = "";
          }}
        >
          <option value="">Шрифт</option>
          <option value="Arial">Arial</option>
          <option value="Georgia">Georgia</option>
          <option value="Times New Roman">Times</option>
          <option value="Consolas">Consolas</option>
        </select>

        <select
          disabled={!hasSelection}
          defaultValue=""
          onChange={(event) => {
            if (!event.target.value) return;
            setTextColor(event.target.value);
            event.target.value = "";
          }}
        >
          <option value="">Цвет текста</option>
          <option value="reset">Обычный</option>
          <option value="#f4f4f5">Белый</option>
          <option value="#ef4444">Красный</option>
          <option value="#f97316">Оранжевый</option>
          <option value="#facc15">Жёлтый</option>
          <option value="#22c55e">Зелёный</option>
          <option value="#60a5fa">Синий</option>
          <option value="#a1a1aa">Серый</option>
        </select>

        <select
          disabled={!hasSelection}
          defaultValue=""
          onChange={(event) => {
            if (!event.target.value) return;
            setTextBackground(event.target.value);
            event.target.value = "";
          }}
        >
          <option value="">Фон текста</option>
          <option value="reset">Без фона</option>
          <option value="#4a171b">Красный</option>
          <option value="#4a2b12">Оранжевый</option>
          <option value="#443a12">Жёлтый</option>
          <option value="#123823">Зелёный</option>
          <option value="#172f4a">Синий</option>
          <option value="#303036">Серый</option>
        </select>

        <button type="button" disabled={!hasSelection} onClick={applyKeyStyle}>
          Клавиша
        </button>

        <button type="button" disabled={!hasSelection} onClick={clearFormatting}>
          Убрать стиль
        </button>
      </div>

      <EditorContent editor={editor} className={styles.editor} />

      <div className={styles.help}>
        {mode === "legal"
          ? "«Автооформить весь документ» центрирует главы, оставляет статьи слева и применяет выбранные цвета. «Курсив текста статей» меняет весь текст внутри всех статей одним нажатием. «В содержание» добавляет выделенный абзац в правую панель без изменения его текста."
          : "Выдели текст и выбери цвет или фон. Кнопка «Клавиша» создаёт компактное выделение как у ESC. “• Список” — список с точками, “1. Список” — нумерованный."}
      </div>
    </div>
  );
}