"use client";

import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import { TextStyleKit } from "@tiptap/extension-text-style";
import styles from "./text-editor.module.css";

type TextEditorProps = {
  value: string;
  onChange: (value: string) => void;
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

export default function TextEditor({ value, onChange }: TextEditorProps) {
  const lastValueRef = useRef("");
  const [hasSelection, setHasSelection] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3],
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

  function clearFormatting() {
    if (!editor || !requireSelection()) return;

    editor.chain().focus().unsetAllMarks().clearNodes().run();
  }

  if (!editor) {
    return <div className={styles.loading}>Загрузка редактора...</div>;
  }

  return (
    <div className={styles.editorBox}>
      <div className={styles.toolbar}>
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
        Выдели текст и выбери цвет или фон. Кнопка «Клавиша» создаёт компактное выделение как у ESC. “• Список” — список с точками, “1. Список” — нумерованный.
      </div>
    </div>
  );
}