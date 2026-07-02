"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import TextEditor from "@/components/text-editor";
import DevBlogPostCard from "@/components/devblog-post-card";
import type { ChangelogPost } from "@/lib/changelog-store";
import styles from "./changelog-admin.module.css";

type EditorTab = "updates" | "fixes";

type AdminChangelogPost = ChangelogPost & {
  description?: string;
  updatesHtml?: string;
  fixesHtml?: string;
};

function getNowInputValue() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60 * 1000);

  return local.toISOString().slice(0, 16);
}

function toDateTimeLocalValue(value: string) {
  if (!value) {
    return getNowInputValue();
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 16);
  }

  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);

  return local.toISOString().slice(0, 16);
}

function formatPostDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value ? value.replace("T", " ") : "Без даты";
  }

  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function arrayToHtmlList(value: string[]) {
  if (!value || value.length === 0) {
    return "<p></p>";
  }

  return `<ul>${value.map((item) => `<li>${item}</li>`).join("")}</ul>`;
}

function htmlToLines(html: string): string[] {
  if (!html) return [];

  if (typeof document === "undefined") {
    return html
      .replace(/<\/?(li|p|div|h1|h2|h3|h4|h5|h6)[^>]*>/gi, "\n")
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .split(/\n+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  const div = document.createElement("div");
  div.innerHTML = html;

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
  const [messageType, setMessageType] = useState<"success" | "error">(
    "success"
  );
  const [loading, setLoading] = useState(false);
  const [postsLoading, setPostsLoading] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const updatesCount = useMemo(
    () => countHtmlItems(updatesHtml),
    [updatesHtml]
  );

  const fixesCount = useMemo(
    () => countHtmlItems(fixesHtml),
    [fixesHtml]
  );

  const sortedPosts = useMemo(() => {
    return [...posts].sort((first, second) => {
      return String(second.publishedAt || "").localeCompare(
        String(first.publishedAt || "")
      );
    });
  }, [posts]);

  const totalUpdates = useMemo(() => {
    return posts.reduce((total, post) => {
      return total + (post.updates?.length || 0);
    }, 0);
  }, [posts]);

  const totalFixes = useMemo(() => {
    return posts.reduce((total, post) => {
      return total + (post.fixes?.length || 0);
    }, 0);
  }, [posts]);

  const previewPost = useMemo<AdminChangelogPost>(() => {
    return {
      id: editingId || "preview",
      title: title.trim() || "Без названия",
      description:
        description.trim() || "Краткое описание обновления не заполнено.",
      publishedAt: publishedAt || getNowInputValue(),
      updates: htmlToLines(updatesHtml),
      fixes: htmlToLines(fixesHtml),
      updatesHtml,
      fixesHtml,
    };
  }, [
    editingId,
    title,
    description,
    publishedAt,
    updatesHtml,
    fixesHtml,
  ]);

  const isFormReady = Boolean(title.trim() && publishedAt);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!previewOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setPreviewOpen(false);
      }
    }

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleEscape);
    };
  }, [previewOpen]);

  async function loadPosts() {
    setPostsLoading(true);

    try {
      const response = await fetch("/api/admin/changelog", {
        cache: "no-store",
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || "Не удалось загрузить публикации");
      }

      setPosts(Array.isArray(data?.posts) ? data.posts : []);
    } catch (error) {
      setMessageType("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Не удалось загрузить публикации"
      );
    } finally {
      setPostsLoading(false);
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
    setPublishedAt(toDateTimeLocalValue(post.publishedAt));
    setUpdatesHtml(post.updatesHtml || arrayToHtmlList(post.updates || []));
    setFixesHtml(post.fixesHtml || arrayToHtmlList(post.fixes || []));
    setActiveTab("updates");
    setMessageType("success");
    setMessage(`Открыт пост: ${post.title}`);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function savePost() {
    if (!isFormReady) {
      setMessageType("error");
      setMessage("Заполни заголовок и дату публикации");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const method = editingId ? "PUT" : "POST";

      const response = await fetch("/api/admin/changelog", {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: editingId,
          title: title.trim(),
          description: description.trim(),
          publishedAt,
          updates: htmlToLines(updatesHtml),
          fixes: htmlToLines(fixesHtml),
          updatesHtml,
          fixesHtml,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || "Ошибка сохранения");
      }

      await loadPosts();

      setMessageType("success");

      if (editingId) {
        setMessage("Изменения сохранены");
      } else {
        setMessage("Пост создан");
        setEditingId(data?.post?.id || null);
      }
    } catch (error) {
      setMessageType("error");
      setMessage(
        error instanceof Error ? error.message : "Ошибка сохранения"
      );
    } finally {
      setLoading(false);
    }
  }

  async function deletePost(id: string) {
    const accept = confirm("Точно удалить этот пост?");

    if (!accept) {
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/changelog", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || "Ошибка удаления");
      }

      await loadPosts();

      if (editingId === id) {
        resetForm();
      }

      setMessageType("success");
      setMessage("Пост удалён");
    } catch (error) {
      setMessageType("error");
      setMessage(
        error instanceof Error ? error.message : "Ошибка удаления"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <span>CONTENT STUDIO</span>
          <h1>Dev Blog</h1>
          <p>
            Создание и редактирование обновлений, исправлений и Patch Note.
          </p>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.previewButton}
            onClick={() => setPreviewOpen(true)}
          >
            <span>◉</span>
            Предпросмотр поста
          </button>

          <Link href="/wiki/changelog" className={styles.openBlogButton}>
            Открыть Dev Blog
            <span>↗</span>
          </Link>

          <Link href="/admin" className={styles.backButton}>
            ← В обзор
          </Link>
        </div>
      </header>

      <section className={styles.stats}>
        <article>
          <span>Публикаций</span>
          <strong>{posts.length}</strong>
          <small>всего в Dev Blog</small>
        </article>

        <article>
          <span>Обновлений</span>
          <strong>{totalUpdates}</strong>
          <small>пунктов добавлено</small>
        </article>

        <article>
          <span>Исправлений</span>
          <strong>{totalFixes}</strong>
          <small>пунктов исправлено</small>
        </article>

        <article>
          <span>Сейчас в редакторе</span>
          <strong>{updatesCount + fixesCount}</strong>
          <small>пунктов публикации</small>
        </article>
      </section>

      <section className={styles.layout}>
        <aside className={styles.postsList}>
          <div className={styles.panelHeading}>
            <div>
              <span>ПУБЛИКАЦИИ</span>
              <h2>Все посты</h2>
            </div>

            <b>{posts.length}</b>
          </div>

          <button
            type="button"
            onClick={resetForm}
            className={styles.newButton}
          >
            <span>＋</span>
            Создать новый пост
          </button>

          <div className={styles.postButtons}>
            {postsLoading && (
              <div className={styles.emptyList}>Загрузка публикаций...</div>
            )}

            {!postsLoading && posts.length === 0 && (
              <div className={styles.emptyList}>
                Публикаций пока нет.
              </div>
            )}

            {sortedPosts.map((post) => {
              const postUpdates =
                post.updates?.length ||
                countHtmlItems(post.updatesHtml || "");

              const postFixes =
                post.fixes?.length ||
                countHtmlItems(post.fixesHtml || "");

              return (
                <button
                  type="button"
                  key={post.id}
                  onClick={() => selectPost(post)}
                  className={`${styles.postButton} ${
                    editingId === post.id
                      ? styles.postButtonActive
                      : ""
                  }`}
                >
                  <div className={styles.postButtonTop}>
                    <span>{formatPostDate(post.publishedAt)}</span>

                    {editingId === post.id && <b>ОТКРЫТ</b>}
                  </div>

                  <strong>{post.title}</strong>

                  <div className={styles.postMeta}>
                    <small>＋ {postUpdates}</small>
                    <small>✓ {postFixes}</small>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <section className={styles.editorCard}>
          <div className={styles.editorHeader}>
            <div>
              <span>
                {editingId ? "РЕДАКТИРОВАНИЕ" : "НОВАЯ ПУБЛИКАЦИЯ"}
              </span>

              <h2>
                {editingId ? title || "Без названия" : "Создание поста"}
              </h2>
            </div>

            <div className={styles.draftStatus}>
              <i />
              {editingId ? "Сохранённый пост" : "Новый черновик"}
            </div>
          </div>

          <div className={styles.generalFields}>
            <label className={styles.titleField}>
              <span>Заголовок публикации</span>

              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Например: Patch Note 0.0.7"
              />
            </label>

            <label>
              <span>Дата и время</span>

              <input
                value={publishedAt}
                onChange={(event) => setPublishedAt(event.target.value)}
                type="datetime-local"
              />
            </label>
          </div>

          <label className={styles.descriptionField}>
            <span>Краткое описание</span>

            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Коротко расскажи, что изменилось в этом обновлении."
              rows={4}
            />

            <small>
              Этот текст отображается в основной информации о публикации.
            </small>
          </label>

          <div className={styles.editorTabs}>
            <button
              type="button"
              onClick={() => setActiveTab("updates")}
              className={
                activeTab === "updates"
                  ? styles.editorTabActive
                  : ""
              }
            >
              <div>
                <span>＋</span>
                <strong>Обновления</strong>
              </div>

              <b>{updatesCount}</b>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("fixes")}
              className={
                activeTab === "fixes"
                  ? styles.editorTabActive
                  : ""
              }
            >
              <div>
                <span>✓</span>
                <strong>Исправления</strong>
              </div>

              <b>{fixesCount}</b>
            </button>
          </div>

          <div className={styles.editorPanel}>
            <div className={styles.editorPanelHead}>
              <div>
                <span>
                  {activeTab === "updates" ? "НОВОВВЕДЕНИЯ" : "ФИКСЫ"}
                </span>

                <h3>
                  {activeTab === "updates"
                    ? "Что добавлено и изменено"
                    : "Что было исправлено"}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setPreviewOpen(true)}
              >
                ◉ Проверить в предпросмотре
              </button>
            </div>

            <div className={styles.editorHint}>
              {activeTab === "updates"
                ? "Добавляй новые функции, изменения механик и другой новый контент."
                : "Добавляй исправленные ошибки, технические правки и улучшения стабильности."}
            </div>

            {activeTab === "updates" && (
              <TextEditor
                value={updatesHtml}
                onChange={setUpdatesHtml}
              />
            )}

            {activeTab === "fixes" && (
              <TextEditor
                value={fixesHtml}
                onChange={setFixesHtml}
              />
            )}
          </div>

          {message && (
            <div
              className={`${styles.message} ${
                messageType === "error" ? styles.messageError : ""
              }`}
            >
              {message}
            </div>
          )}

          <div className={styles.formActions}>
            <div className={styles.formActionsInfo}>
              <span>
                {editingId
                  ? "Изменения применятся к существующей публикации."
                  : "После сохранения публикация появится в Dev Blog."}
              </span>

              <small>
                {updatesCount} обновлений · {fixesCount} исправлений
              </small>
            </div>

            <div className={styles.formActionButtons}>
              <button
                type="button"
                className={styles.mobilePreviewButton}
                onClick={() => setPreviewOpen(true)}
              >
                Предпросмотр
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={() => deletePost(editingId)}
                  className={styles.deleteButton}
                  disabled={loading}
                >
                  Удалить
                </button>
              )}

              <button
                type="button"
                onClick={savePost}
                disabled={loading || !isFormReady}
                className={styles.saveButton}
              >
                {loading
                  ? "Сохранение..."
                  : editingId
                    ? "Сохранить изменения"
                    : "Опубликовать пост"}
              </button>
            </div>
          </div>
        </section>
      </section>

      {mounted &&
        previewOpen &&
        createPortal(
          <div className={styles.previewPortal}>
            <button
              type="button"
              className={styles.previewOverlay}
              onClick={() => setPreviewOpen(false)}
              aria-label="Закрыть предпросмотр"
            />

            <section className={styles.previewModal}>
              <header className={styles.previewModalHeader}>
                <div>
                  <span>ПРЕДПРОСМОТР ПУБЛИКАЦИИ</span>
                  <h2>{previewPost.title}</h2>
                  <p>
                    Ниже используется тот же компонент поста, что и на
                    публичной странице Dev Blog.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setPreviewOpen(false)}
                  aria-label="Закрыть предпросмотр"
                >
                  ×
                </button>
              </header>

              <div className={styles.previewStage}>
                <DevBlogPostCard post={previewPost} />
              </div>

              <footer className={styles.previewModalFooter}>
                <span>
                  Для закрытия нажми на фон, крестик или клавишу Escape.
                </span>

                <button
                  type="button"
                  onClick={() => setPreviewOpen(false)}
                >
                  Вернуться к редактированию
                </button>
              </footer>
            </section>
          </div>,
          document.body
        )}
    </main>
  );
}
