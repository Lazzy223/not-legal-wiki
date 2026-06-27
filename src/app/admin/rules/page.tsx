"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import TextEditor from "@/components/text-editor";
import WikiContent from "@/components/wiki-content";
import type { RuleSection } from "@/lib/rules-store";
import styles from "./rules-admin.module.css";

function defaultRulesContent() {
  return `<h2>Общие положения</h2>
<ul>
  <li>Первый пункт правила.</li>
  <li>Второй пункт правила.</li>
</ul>

<h2>Наказания</h2>
<ul>
  <li>За нарушение правила игрок может получить наказание.</li>
</ul>`;
}

export default function AdminRulesPage() {
  const [sections, setSections] = useState<RuleSection[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [number, setNumber] = useState("01");
  const [icon, setIcon] = useState("📜");
  const [title, setTitle] = useState("Новый раздел правил");
  const [short, setShort] = useState("");
  const [description, setDescription] = useState("");
  const [sortOrder, setSortOrder] = useState(100);
  const [contentHtml, setContentHtml] = useState(defaultRulesContent());

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadSections() {
    const response = await fetch("/api/admin/rules", {
      cache: "no-store",
    });

    const data = await response.json();

    if (response.ok) {
      setSections(data.sections || []);
    }
  }

  useEffect(() => {
    loadSections();
  }, []);

  function resetForm() {
    setEditingId(null);
    setNumber(String(sections.length + 1).padStart(2, "0"));
    setIcon("📜");
    setTitle("Новый раздел правил");
    setShort("");
    setDescription("");
    setSortOrder(100);
    setContentHtml(defaultRulesContent());
    setMessage("");
  }

  function selectSection(section: RuleSection) {
    setEditingId(section.id);
    setNumber(section.number);
    setIcon(section.icon);
    setTitle(section.title);
    setShort(section.short);
    setDescription(section.description);
    setSortOrder(section.sortOrder || 999);
    setContentHtml(section.contentHtml || defaultRulesContent());
    setMessage(`Редактируется: ${section.title}`);
  }

  async function saveSection() {
    setLoading(true);
    setMessage("");

    const method = editingId ? "PUT" : "POST";

    const response = await fetch("/api/admin/rules", {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: editingId,
        number,
        icon,
        title,
        short,
        description,
        sortOrder,
        contentHtml,
      }),
    });

    const data = await response.json();

    setLoading(false);

    if (!response.ok) {
      setMessage(data.message || "Ошибка сохранения");
      return;
    }

    await loadSections();

    if (editingId) {
      setMessage("Раздел правил обновлён");
    } else {
      setEditingId(data.section.id);
      setMessage("Раздел правил создан");
    }
  }

  async function deleteSection() {
    if (!editingId) {
      return;
    }

    const accept = confirm("Точно удалить этот раздел правил?");

    if (!accept) {
      return;
    }

    const response = await fetch("/api/admin/rules", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: editingId }),
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.message || "Ошибка удаления");
      return;
    }

    await loadSections();
    resetForm();
    setMessage("Раздел удалён");
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <span>ADMIN PANEL</span>
          <h1>Правила сервера</h1>
          <p>Создание, редактирование, удаление и сортировка разделов правил.</p>
        </div>

        <div className={styles.headerActions}>
          <Link href="/wiki/rules" className={styles.backButton}>
            Открыть правила
          </Link>

          <Link href="/admin" className={styles.backButton}>
            ← Назад
          </Link>
        </div>
      </header>

      <section className={styles.layout}>
        <aside className={styles.sectionsList}>
          <div className={styles.cardTitle}>
            <b>01</b>
            <h2>Разделы</h2>
          </div>

          <button type="button" onClick={resetForm} className={styles.newButton}>
            + Новый раздел
          </button>

          <div className={styles.sectionButtons}>
            {sections.length === 0 && (
              <div className={styles.emptyList}>Разделов пока нет.</div>
            )}

            {sections.map((section) => (
              <button
                type="button"
                key={section.id}
                onClick={() => selectSection(section)}
                className={`${styles.sectionButton} ${
                  editingId === section.id ? styles.sectionButtonActive : ""
                }`}
              >
                <span>
                  #{section.sortOrder} / {section.number}
                </span>

                <b>
                  {section.icon} {section.title}
                </b>

                <small>{section.short || "Без краткого описания"}</small>
              </button>
            ))}
          </div>
        </aside>

        <section className={styles.formCard}>
          <div className={styles.cardTitle}>
            <b>02</b>
            <h2>{editingId ? "Редактирование" : "Новый раздел"}</h2>
          </div>

          <div className={styles.formGrid}>
            <label>
              Номер
              <input
                value={number}
                onChange={(event) => setNumber(event.target.value)}
                placeholder="01"
              />
            </label>

            <label>
              Иконка
              <input
                value={icon}
                onChange={(event) => setIcon(event.target.value)}
                placeholder="📜"
              />
            </label>
          </div>

          <label>
            Название раздела
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Правила проекта"
            />
          </label>

          <label>
            Краткое описание
            <input
              value={short}
              onChange={(event) => setShort(event.target.value)}
              placeholder="Основные правила"
            />
          </label>

          <label>
            Полное описание
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className={styles.smallTextarea}
              placeholder="Описание раздела правил"
            />
          </label>

          <label>
            Порядок отображения
            <input
              value={sortOrder}
              onChange={(event) => setSortOrder(Number(event.target.value))}
              type="number"
              placeholder="10"
            />
          </label>

          <label>
            Текст правил
            <TextEditor value={contentHtml} onChange={setContentHtml} />
          </label>

          <div className={styles.helpBox}>
            Для обычных пунктов используй кнопку <b>• Список</b>. Для
            нумерованных пунктов используй <b>1. Список</b>.
          </div>

          {message && <div className={styles.message}>{message}</div>}

          <div className={styles.formActions}>
            <button type="button" onClick={saveSection} disabled={loading}>
              {loading
                ? "Сохранение..."
                : editingId
                  ? "Сохранить изменения"
                  : "Создать раздел"}
            </button>

            {editingId && (
              <button
                type="button"
                onClick={deleteSection}
                className={styles.deleteButton}
              >
                Удалить
              </button>
            )}
          </div>
        </section>

        <section className={styles.previewCard}>
          <div className={styles.cardTitle}>
            <b>03</b>
            <h2>Предпросмотр</h2>
          </div>

          <article className={styles.preview}>
            <div className={styles.previewTop}>
              <span>{number}</span>
              <b>{icon}</b>
            </div>

            <h2>{title || "Название раздела"}</h2>

            {description && <p className={styles.previewDesc}>{description}</p>}

            <div className={styles.previewContent}>
              <WikiContent html={contentHtml} />
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}
