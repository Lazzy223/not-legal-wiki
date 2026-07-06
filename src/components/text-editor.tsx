"use client";

import { useEffect, useRef, useState } from "react";
import { Extension } from "@tiptap/core";
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
}: TextEditorProps) {
  const lastValueRef = useRef("");
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
      setHasSelection(!editor.state.selection.empty);
    },

    onUpdate({ editor }) {
      const html = editor.getHTML();

      lastValueRef.current = html;
      onChange(html);
      setHasSelection(!editor.state.selection.empty);
    },

    onSelectionUpdate({ editor }) {
      setHasSelection(!editor.state.selection.empty);
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

  function requireSelection() {
    if (!editor) return false;

    if (editor.state.selection.empty) {
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
  }

  function toggleOrderedList() {
    if (!editor || !requireSelection()) return;

    editor.chain().focus().toggleOrderedList().run();
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
    if (!editor) return;
    setLegalBlockAlignment(editor, alignment);
  }

  function clearFormatting() {
    if (!editor || !requireSelection()) return;

    editor.chain().focus().unsetAllMarks().clearNodes().run();
  }

  function insertLegalTemplate(html: string) {
    if (!editor) return;
    editor.chain().focus().insertContent(html).run();
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

    return [...positions].sort((first, second) => second - first);
  }

  function applyLegalStructureToSelection({
    nodeType,
    level,
    prefix,
    prefixPattern,
  }: {
    nodeType: "paragraph" | "heading";
    level?: 2 | 3 | 4;
    prefix?: string;
    prefixPattern?: RegExp;
  }) {
    if (!editor) return false;

    const positions = getSelectedLegalTextBlocks();
    if (!positions.length) return false;

    const { state, view } = editor;
    const transaction = state.tr;
    const targetType = state.schema.nodes[nodeType];
    const boldMark = state.schema.marks.bold?.create();

    for (const position of positions) {
      const node = transaction.doc.nodeAt(position);
      if (!node || !node.isTextblock) continue;

      const lawAlign = node.attrs.lawAlign || null;
      const attributes =
        nodeType === "heading"
          ? { level: level || 2, lawAlign }
          : { lawAlign };

      if (node.type !== targetType || (level && node.attrs.level !== level)) {
        transaction.setNodeMarkup(
          position,
          targetType,
          attributes,
          node.marks
        );
      }

      const currentNode = transaction.doc.nodeAt(position);
      if (!currentNode || !prefix) continue;

      const plainText = currentNode.textContent.trimStart();
      const existingPrefix = prefixPattern?.exec(plainText)?.[0];

      if (existingPrefix) {
        if (boldMark) {
          const leadingWhitespace = currentNode.textContent.length - plainText.length;
          const markFrom = position + 1 + leadingWhitespace;
          transaction.addMark(
            markFrom,
            markFrom + existingPrefix.length,
            boldMark
          );
        }
        continue;
      }

      const insertPosition = position + 1;
      const prefixNode = state.schema.text(
        prefix,
        boldMark ? [boldMark] : undefined
      );

      transaction.insert(insertPosition, prefixNode);
      transaction.insertText(" ", insertPosition + prefix.length);
    }

    if (!transaction.docChanged) return false;

    view.dispatch(transaction.scrollIntoView());
    view.focus();
    return true;
  }

  function applyLegalStructure(
    type: "section" | "chapter" | "article" | "part" | "subpoint" | "note"
  ) {
    if (!editor) return;

    const hasSelectedText = !editor.state.selection.empty;

    if (!hasSelectedText) {
      const templates = {
        section: "<h2>РАЗДЕЛ I. НАЗВАНИЕ РАЗДЕЛА</h2>",
        chapter: "<h3>ГЛАВА 1. НАЗВАНИЕ ГЛАВЫ</h3>",
        article: "<h4>Статья 1. Название статьи</h4>",
        part: "<p><strong>ч. 1</strong> Текст части.</p>",
        subpoint: "<p><strong>а)</strong> Текст подпункта;</p>",
        note: "<blockquote><strong>Примечание:</strong> Текст примечания.</blockquote>",
      } as const;

      insertLegalTemplate(templates[type]);
      return;
    }

    if (type === "section") {
      applyLegalStructureToSelection({
        nodeType: "heading",
        level: 2,
        prefix: "РАЗДЕЛ I.",
        prefixPattern: /^РАЗДЕЛ\s+[IVXLCDM\d]+(?:\.|\s)/i,
      });
      return;
    }

    if (type === "chapter") {
      applyLegalStructureToSelection({
        nodeType: "heading",
        level: 3,
        prefix: "ГЛАВА 1.",
        prefixPattern: /^ГЛАВА\s+\d+(?:\.\d+)?(?:\.|\s)/i,
      });
      return;
    }

    if (type === "article") {
      applyLegalStructureToSelection({
        nodeType: "heading",
        level: 4,
        prefix: "Статья 1.",
        prefixPattern: /^Статья\s+\d+(?:\.\d+)?(?:\.|\s)/i,
      });
      return;
    }

    if (type === "part") {
      applyLegalStructureToSelection({
        nodeType: "paragraph",
        prefix: "ч. 1",
        prefixPattern: /^ч\.\s*\d+(?:\.\d+)?/i,
      });
      return;
    }

    if (type === "subpoint") {
      applyLegalStructureToSelection({
        nodeType: "paragraph",
        prefix: "а)",
        prefixPattern: /^[а-яёa-z]\)/i,
      });
      return;
    }

    const changed = applyLegalStructureToSelection({
      nodeType: "paragraph",
      prefix: "Примечание:",
      prefixPattern: /^(?:Примечание|Исключение)\s*:/i,
    });

    if (changed) {
      editor.chain().focus().setBlockquote().run();
    }
  }

  function insertDivider() {
    if (!editor) return;

    const insertionPosition = editor.state.selection.to;

    editor
      .chain()
      .focus()
      .setTextSelection(insertionPosition)
      .setHorizontalRule()
      .run();
  }

  if (!editor) {
    return <div className={styles.loading}>Загрузка редактора...</div>;
  }

  return (
    <div className={styles.editorBox}>
      <div className={styles.toolbar}>
        {mode === "legal" && (
          <div className={styles.legalTools}>
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

              <button type="button" onClick={insertDivider}>
                Разделитель
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
          ? "При выделенном тексте кнопки структуры сохраняют его и превращают в раздел, главу, статью, часть, подпункт или примечание. Без выделения вставляется готовая заготовка. «Разделитель» добавляется после выделенного текста. Пять кнопок положения применяются к текущему блоку или ко всем выделенным абзацам."
          : "Выдели текст и выбери цвет или фон. Кнопка «Клавиша» создаёт компактное выделение как у ESC. “• Список” — список с точками, “1. Список” — нумерованный."}
      </div>
    </div>
  );
}