"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import TextEditor from "@/components/text-editor";
import DevBlogPostCard from "@/components/devblog-post-card";
import type { ChangelogPost } from "@/lib/changelog-store";
import styles from "./changelog-admin.module.css";

type EditorTab = "updates" | "fixes";

type AdminChangelogPost = ChangelogPost & {
  description?: string;
};

function getNowInputValue() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60 * 1000);

  return local.toISOString().slice(0, 16);
}

function arrayToHtmlList(value: string[]) {
  if (!value || value.length === 0) {
    return "<p></p>";
  }

  return `<ul>${value.map((item) => `<li>${item}</li>`).join("")}</ul>`;
}

function htmlToLines(html: string) {
  if (!html) return [];

  const div = document.createElement("div");
  div.innerHTML = html;

  div.querySelectorAll("br").forEach((br) => {
    br.replaceWith("\n");
  });

  div
    .querySelectorAll("li, p, div, h1, h2, h3, h4, h5, h6")
    .forEach((element) => {
      element.append(document.createTextNode("\n"));
    });

  const text = div.textContent || "";

  return text
    .replace(/\u00a0/g, " ")
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function countHtmlItems(html: string) {
  return htmlToLines(html).length;
}

export default function AdminChangelogPage() {
  const [posts, setPosts] = useState<AdminChangelogPost[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<EditorTab>("updates");

  const [title, setTitle] = useState("Patch Note 0.0.6");
  const [description, setDescription] = useState(
    "Краткое описание обновления для страницы Dev Blog."
  );
  const [publishedAt, setPublishedAt] = useState(getNowInputValue());

  const [updatesHtml, setUpdatesHtml] = useState(
    "<ul><li>Добавлено новое обновление.</li></ul>"
  );
  const [fixesHtml, setFixesHtml] = useState(
    "<ul><li>Исправлена ошибка.</li></ul>"
  );

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const updatesCount = useMemo(() => countHtmlItems(updatesHtml), [updatesHtml]);
  const fixesCount = useMemo(() => countHtmlItems(fixesHtml), [fixesHtml]);

  const previewPost = useMemo<AdminChangelogPost>(() => {
    return {
      id: editingId || "preview",
      title: title || "Без названия",
      description,
      publishedAt,
      updates: htmlToLines(updatesHtml),
      fixes: htmlToLines(fixesHtml),
      updatesHtml,
      fixesHtml,
    };
  }, [editingId, title, description, publishedAt, updatesHtml, fixesHtml]);

  async function loadPosts() {
    const response = await fetch("/api/admin/changelog", {
      cache: "no-store",
    });

    const data = await response.json();

    if (response.ok) {
      setPosts(data.posts || []);
    }
  }

  useEffect(() => {
    loadPosts();
  }, []);

  function resetForm() {
    setEditingId(null);
    setTitle("Patch Note 0.0.6");
    setDescription("Краткое описание обновления для страницы Dev Blog.");
    setPublishedAt(getNowInputValue());
    setUpdatesHtml("<ul><li>Добавлено новое обновление.</li></ul>");
    setFixesHtml("<ul><li>Исправлена ошибка.</li></ul>");
    setActiveTab("updates");
    setMessage("");
  }

  function selectPost(post: AdminChangelogPost) {
    setEditingId(post.id);
    setTitle(post.title);
    setDescription(post.description || "");
    setPublishedAt(post.publishedAt);
    setUpdatesHtml(post.updatesHtml || arrayToHtmlList(post.updates || []));
    setFixesHtml(post.fixesHtml || arrayToHtmlList(post.fixes || []));
    setActiveTab("updates");
    setMessage(`Редактируется: ${post.title}`);
  }

  async function savePost() {
    setLoading(true);
    setMessage("");

    const method = editingId ? "PUT" : "POST";

    const response = await fetch("/api/admin/changelog", {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: editingId,
        title,
        description,
        publishedAt,
        updates: htmlToLines(updatesHtml),
        fixes: htmlToLines(fixesHtml),
        updatesHtml,
        fixesHtml,
      }),
    });

    const data = await response.json();

    setLoading(false);

    if (!response.ok) {
      setMessage(data.message || "Ошибка сохранения");
      return;
    }

    await loadPosts();

    if (editingId) {
      setMessage("Пост обновлён");
    } else {
      setMessage("Пост создан");
      setEditingId(data.post.id);
    }
  }

  async function deletePost(id: string) {
    const accept = confirm("Точно удалить этот пост?");

    if (!accept) {
      return;
    }

    const response = await fetch("/api/admin/changelog", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id }),
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.message || "Ошибка удаления");
      return;
    }

    await loadPosts();

    if (editingId === id) {
      resetForm();
    }

    setMessage("Пост удалён");
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <span>ADMIN PANEL</span>
          <h1>Dev Blog</h1>
          <p>Создание, редактирование и удаление постов обновлений проекта.</p>
        </div>

        <div className={styles.headerActions}>
          <Link href="/wiki/changelog" className={styles.backButton}>
            Открыть Dev Blog
          </Link>

          <Link href="/admin" className={styles.backButton}>
            ← Назад
          </Link>
        </div>
      </header>

      <section className={styles.layout}>
        <aside className={styles.postsList}>
          <div className={styles.cardTitle}>
            <b>01</b>
            <h2>Все посты</h2>
          </div>

          <button type="button" onClick={resetForm} className={styles.newButton}>
            + Новый пост
          </button>

          <div className={styles.postButtons}>
            {posts.length === 0 && (
              <div className={styles.emptyList}>Постов пока нет.</div>
            )}

            {posts.map((post) => (
              <button
                type="button"
                key={post.id}
                onClick={() => selectPost(post)}
                className={`${styles.postButton} ${
                  editingId === post.id ? styles.postButtonActive : ""
                }`}
              >
                <span>{post.publishedAt.replace("T", " ")}</span>
                <b>{post.title}</b>
                <small>
                  {(post.updates?.length || 0)} updates /{" "}
                  {(post.fixes?.length || 0)} fixes
                </small>
              </button>
            ))}
          </div>
        </aside>

        <section className={styles.formCard}>
          <div className={styles.cardTitle}>
            <b>02</b>
            <h2>{editingId ? "Редактирование" : "Новый пост"}</h2>
          </div>

          <div className={styles.formGrid}>
            <label>
              Заголовок
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Например: Patch Note 0.0.6"
              />
            </label>

            <label>
              Дата и время
              <input
                value={publishedAt}
                onChange={(event) => setPublishedAt(event.target.value)}
                type="datetime-local"
              />
            </label>
          </div>

          <label className={styles.descriptionField}>
            Описание поста
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Например: Добавлены новые бизнесы, переработана система налогов и улучшена производительность экономической системы."
              rows={4}
            />
          </label>

          <div className={styles.editorTabs}>
            <button
              type="button"
              onClick={() => setActiveTab("updates")}
              className={activeTab === "updates" ? styles.editorTabActive : ""}
            >
              Обновления
              <span>{updatesCount}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("fixes")}
              className={activeTab === "fixes" ? styles.editorTabActive : ""}
            >
              Исправления
              <span>{fixesCount}</span>
            </button>
          </div>

          <div className={styles.editorPanel}>
            <div className={styles.editorHint}>
              {activeTab === "updates"
                ? "Здесь пиши новые функции, изменения и добавления."
                : "Здесь пиши исправленные баги, фиксы и технические правки."}
            </div>

            {activeTab === "updates" && (
              <TextEditor value={updatesHtml} onChange={setUpdatesHtml} />
            )}

            {activeTab === "fixes" && (
              <TextEditor value={fixesHtml} onChange={setFixesHtml} />
            )}
          </div>

          {message && <div className={styles.message}>{message}</div>}

          <div className={styles.formActions}>
            <button type="button" onClick={savePost} disabled={loading}>
              {loading
                ? "Сохранение..."
                : editingId
                  ? "Сохранить изменения"
                  : "Создать пост"}
            </button>

            {editingId && (
              <button
                type="button"
                onClick={() => deletePost(editingId)}
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

          <DevBlogPostCard post={previewPost} />
        </section>
      </section>
    </main>
  );
}