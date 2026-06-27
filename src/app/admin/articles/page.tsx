"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import TextEditor from "@/components/text-editor";
import WikiContent from "@/components/wiki-content";
import type { WikiArticle } from "@/lib/articles-store";
import styles from "./articles-admin.module.css";

function getDefaultContent() {
  return `<h2>Заголовок раздела</h2>
<p>Здесь будет текст статьи. Можно писать правила, инструкции, пояснения и обучающие материалы.</p>
<p>Выделяй текст, добавляй ссылки, списки и заголовки через редактор.</p>`;
}

function prepareContentForEditor(value: string) {
  if (!value) {
    return getDefaultContent();
  }

  if (value.includes("<p") || value.includes("<h") || value.includes("<ul")) {
    return value;
  }

  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => `<p>${item}</p>`)
    .join("");
}

export default function AdminArticlesPage() {
  const [articles, setArticles] = useState<WikiArticle[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [title, setTitle] = useState("Новая статья");
  const [slug, setSlug] = useState("new-article");
  const [category, setCategory] = useState("start");
  const [sortOrder, setSortOrder] = useState(100);
  const [description, setDescription] = useState("");
  const [content, setContent] = useState(getDefaultContent());
  const [published, setPublished] = useState(true);

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadArticles() {
    const response = await fetch("/api/admin/articles", {
      cache: "no-store",
    });

    const data = await response.json();

    if (response.ok) {
      setArticles(data.articles || []);
    }
  }

  useEffect(() => {
    loadArticles();
  }, []);

  function resetForm() {
    setEditingId(null);
    setTitle("Новая статья");
    setSlug("new-article");
    setCategory("start");
    setSortOrder(100);
    setDescription("");
    setContent(getDefaultContent());
    setPublished(true);
    setMessage("");
  }

  function selectArticle(article: WikiArticle) {
    setEditingId(article.id);
    setTitle(article.title);
    setSlug(article.slug);
    setCategory(article.category);
    setSortOrder(article.sortOrder || 999);
    setDescription(article.description);
    setContent(prepareContentForEditor(article.content));
    setPublished(article.published);
    setMessage(`Редактируется: ${article.title}`);
  }

  async function saveArticle() {
    setLoading(true);
    setMessage("");

    const method = editingId ? "PUT" : "POST";

    const response = await fetch("/api/admin/articles", {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: editingId,
        title,
        slug,
        category,
        sortOrder,
        description,
        content,
        published,
      }),
    });

    const data = await response.json();

    setLoading(false);

    if (!response.ok) {
      setMessage(data.message || "Ошибка сохранения");
      return;
    }

    await loadArticles();

    if (editingId) {
      setMessage("Статья обновлена");
    } else {
      setEditingId(data.article.id);
      setMessage("Статья создана");
    }
  }

  async function deleteSelectedArticle() {
    if (!editingId) {
      return;
    }

    const accept = confirm("Точно удалить эту статью?");

    if (!accept) {
      return;
    }

    const response = await fetch("/api/admin/articles", {
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

    await loadArticles();
    resetForm();
    setMessage("Статья удалена");
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <span>ADMIN PANEL</span>
          <h1>Статьи Wiki</h1>
          <p>Создание, редактирование, удаление и сортировка статей.</p>
        </div>

        <div className={styles.headerActions}>
          <Link href="/wiki" className={styles.backButton}>
            Открыть Wiki
          </Link>

          <Link href="/admin" className={styles.backButton}>
            ← Назад
          </Link>
        </div>
      </header>

      <section className={styles.layout}>
        <aside className={styles.articlesList}>
          <div className={styles.cardTitle}>
            <b>01</b>
            <h2>Все статьи</h2>
          </div>

          <button type="button" onClick={resetForm} className={styles.newButton}>
            + Новая статья
          </button>

          <div className={styles.articleButtons}>
            {articles.length === 0 && (
              <div className={styles.emptyList}>Статей пока нет.</div>
            )}

            {articles.map((article) => (
              <button
                type="button"
                key={article.id}
                onClick={() => selectArticle(article)}
                className={`${styles.articleButton} ${
                  editingId === article.id ? styles.articleButtonActive : ""
                }`}
              >
                <span>{article.published ? "Опубликовано" : "Черновик"}</span>
                <b>{article.title}</b>
                <small>
                  #{article.sortOrder || 999} / {article.category} /wiki/
                  {article.slug}
                </small>
              </button>
            ))}
          </div>
        </aside>

        <section className={styles.formCard}>
          <div className={styles.cardTitle}>
            <b>02</b>
            <h2>{editingId ? "Редактирование" : "Новая статья"}</h2>
          </div>

          <label>
            Заголовок
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Например: Создание персонажа"
            />
          </label>

          <label>
            Slug для ссылки
            <input
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              placeholder="Например: create-character"
            />
          </label>

          <label>
            Категория
            <input
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              placeholder="Например: start, guides, jobs, factions"
            />
          </label>

          <label>
            Порядок отображения
            <input
              value={sortOrder}
              onChange={(event) => setSortOrder(Number(event.target.value))}
              type="number"
              placeholder="Например: 10"
            />
          </label>

          <label>
            Краткое описание
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Короткое описание статьи"
              className={styles.smallTextarea}
            />
          </label>

          <label>
            Текст статьи
            <TextEditor value={content} onChange={setContent} />
          </label>

          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={published}
              onChange={(event) => setPublished(event.target.checked)}
            />
            Опубликовать статью
          </label>

          {message && <div className={styles.message}>{message}</div>}

          <div className={styles.formActions}>
            <button type="button" onClick={saveArticle} disabled={loading}>
              {loading
                ? "Сохранение..."
                : editingId
                  ? "Сохранить изменения"
                  : "Создать статью"}
            </button>

            {editingId && (
              <button
                type="button"
                onClick={deleteSelectedArticle}
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

          <article className={styles.previewArticle}>
            <div className={styles.previewTop}>
              <span>{category || "general"}</span>
              <b>{published ? "PUBLISHED" : "DRAFT"}</b>
            </div>

            <h2>{title || "Без названия"}</h2>

            {description && <p className={styles.previewDesc}>{description}</p>}

            <div className={styles.previewContent}>
              <WikiContent html={content} />
            </div>

            <div className={styles.previewLink}>
              Порядок: #{sortOrder || 999} /wiki/{slug || "article"}
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}