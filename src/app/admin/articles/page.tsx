"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import ArticleRenderer from "@/components/article-renderer";
import TextEditor from "@/components/text-editor";
import {
  createArticleBlock,
  getArticlePrimaryAnchor,
  getArticleTableOfContents,
  normalizeArticleBlocks,
  slugifyAnchor,
  type ArticleBlock,
  type ArticleBlockType,
} from "@/lib/article-types";
import type { WikiArticle } from "@/lib/articles-store";
import styles from "./articles-admin.module.css";

const blockPalette: Array<{
  type: ArticleBlockType;
  icon: string;
  title: string;
  description: string;
}> = [
  { type: "heading", icon: "H", title: "Заголовок", description: "Пункт содержания" },
  { type: "text", icon: "¶", title: "Текст", description: "Полный редактор" },
  { type: "image", icon: "▧", title: "Фото", description: "Загрузка или URL" },
  { type: "columns", icon: "▥", title: "2 колонки", description: "Два текста рядом" },
  { type: "callout", icon: "!", title: "Врезка", description: "Важный блок" },
  { type: "quote", icon: "“", title: "Цитата", description: "Акцентный текст" },
  { type: "divider", icon: "—", title: "Разделитель", description: "Линия между блоками" },
  { type: "spacer", icon: "↕", title: "Отступ", description: "Свободное место" },
];

function defaultBlocks() {
  return [
    {
      ...createArticleBlock("heading"),
      title: "Основная информация",
      anchor: "main-information",
    },
    {
      ...createArticleBlock("text"),
      html: "<p>Добавьте описание механики, инструкции или правила.</p><p>Текст можно форматировать, разбивать на списки и дополнять ссылками.</p>",
    },
  ];
}

function articleToEditorBlocks(article: WikiArticle) {
  const blocks = normalizeArticleBlocks(article.blocks);

  if (blocks.length > 0) {
    return blocks;
  }

  return [
    {
      ...createArticleBlock("text"),
      html: article.content || "<p>Текст статьи.</p>",
    },
  ];
}

function blockLabel(type: ArticleBlockType) {
  return blockPalette.find((item) => item.type === type)?.title || type;
}

function copyBlock(block: ArticleBlock) {
  return {
    ...block,
    id: createArticleBlock(block.type).id,
    anchor:
      block.type === "heading"
        ? `${slugifyAnchor(block.anchor || block.title || "section")}-copy`
        : block.anchor,
  };
}

export default function AdminArticlesPage() {
  const [articles, setArticles] = useState<WikiArticle[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("Новая статья");
  const [slug, setSlug] = useState("new-article");
  const [category, setCategory] = useState("guides");
  const [sortOrder, setSortOrder] = useState(100);
  const [description, setDescription] = useState("");
  const [blocks, setBlocks] = useState<ArticleBlock[]>(defaultBlocks);
  const [coverImage, setCoverImage] = useState("");
  const [coverPosition, setCoverPosition] = useState("50% 50%");
  const [showToc, setShowToc] = useState(true);
  const [featured, setFeatured] = useState(false);
  const [featuredOrder, setFeaturedOrder] = useState(999);
  const [featuredAnchor, setFeaturedAnchor] = useState("");
  const [published, setPublished] = useState(true);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const [loading, setLoading] = useState(false);
  const [uploadingBlockId, setUploadingBlockId] = useState<string | null>(null);
  const [catalogSearch, setCatalogSearch] = useState("");

  const toc = useMemo(() => getArticleTableOfContents(blocks), [blocks]);
  const primaryAnchor = useMemo(
    () => getArticlePrimaryAnchor(blocks, featuredAnchor),
    [blocks, featuredAnchor]
  );

  const filteredArticles = useMemo(() => {
    const query = catalogSearch.trim().toLowerCase();

    if (!query) {
      return articles;
    }

    return articles.filter((article) =>
      `${article.title} ${article.slug} ${article.category}`
        .toLowerCase()
        .includes(query)
    );
  }, [articles, catalogSearch]);

  async function loadArticles() {
    try {
      const response = await fetch("/api/admin/articles", { cache: "no-store" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Не удалось загрузить статьи");
      }

      setArticles(Array.isArray(data.articles) ? data.articles : []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Ошибка загрузки");
      setMessageType("error");
    }
  }

  useEffect(() => {
    let active = true;

    fetch("/api/admin/articles", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Не удалось загрузить статьи");
        }

        if (active) {
          setArticles(Array.isArray(data.articles) ? data.articles : []);
        }
      })
      .catch((error: unknown) => {
        if (!active) return;
        setMessage(error instanceof Error ? error.message : "Ошибка загрузки");
        setMessageType("error");
      });

    return () => {
      active = false;
    };
  }, []);

  function resetForm() {
    setEditingId(null);
    setTitle("Новая статья");
    setSlug("new-article");
    setCategory("guides");
    setSortOrder(100);
    setDescription("");
    setBlocks(defaultBlocks());
    setCoverImage("");
    setCoverPosition("50% 50%");
    setShowToc(true);
    setFeatured(false);
    setFeaturedOrder(999);
    setFeaturedAnchor("");
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
    setBlocks(articleToEditorBlocks(article));
    setCoverImage(article.coverImage || "");
    setCoverPosition(article.coverPosition || "50% 50%");
    setShowToc(article.showToc !== false);
    setFeatured(Boolean(article.featured));
    setFeaturedOrder(article.featuredOrder || 999);
    setFeaturedAnchor(article.featuredAnchor || "");
    setPublished(article.published);
    setMessage(`Открыта статья «${article.title}»`);
    setMessageType("success");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function updateBlock(id: string, patch: Partial<ArticleBlock>) {
    setBlocks((current) =>
      current.map((block) => (block.id === id ? { ...block, ...patch } : block))
    );
  }

  function addBlock(type: ArticleBlockType) {
    const nextBlock = createArticleBlock(type);
    setBlocks((current) => [...current, nextBlock]);
    setMessage(`Добавлен блок «${blockLabel(type)}»`);
    setMessageType("success");
  }

  function moveBlock(index: number, direction: -1 | 1) {
    const target = index + direction;

    if (target < 0 || target >= blocks.length) {
      return;
    }

    setBlocks((current) => {
      const next = [...current];
      const [block] = next.splice(index, 1);
      next.splice(target, 0, block);
      return next;
    });
  }

  function duplicateBlock(index: number) {
    setBlocks((current) => {
      const next = [...current];
      next.splice(index + 1, 0, copyBlock(current[index]));
      return next;
    });
  }

  function removeBlock(index: number) {
    if (!confirm("Удалить этот блок из статьи?")) {
      return;
    }

    setBlocks((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  async function uploadImage(file: File, blockId?: string) {
    const uploadId = blockId || "cover";
    setUploadingBlockId(uploadId);
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/admin/articles/upload", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Не удалось загрузить изображение");
      }

      if (blockId) {
        updateBlock(blockId, { imageUrl: data.url });
      } else {
        setCoverImage(data.url);
      }

      setMessage("Изображение загружено");
      setMessageType("success");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Ошибка загрузки");
      setMessageType("error");
    } finally {
      setUploadingBlockId(null);
    }
  }

  async function saveArticle() {
    if (!title.trim() || !slug.trim()) {
      setMessage("Укажите заголовок и slug");
      setMessageType("error");
      return;
    }

    if (blocks.length === 0) {
      setMessage("Добавьте хотя бы один блок");
      setMessageType("error");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/articles", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId,
          title,
          slug,
          category,
          sortOrder,
          description,
          content: "",
          blocks,
          coverImage,
          coverPosition,
          showToc,
          featured,
          featuredOrder,
          featuredAnchor,
          published,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Ошибка сохранения");
      }

      setEditingId(data.article.id);
      await loadArticles();
      setMessage(editingId ? "Статья обновлена" : "Статья создана");
      setMessageType("success");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Ошибка сохранения");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  }

  async function deleteSelectedArticle() {
    if (!editingId || !confirm("Точно удалить эту статью?")) {
      return;
    }

    try {
      const response = await fetch("/api/admin/articles", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingId }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Ошибка удаления");
      }

      await loadArticles();
      resetForm();
      setMessage("Статья удалена");
      setMessageType("success");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Ошибка удаления");
      setMessageType("error");
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <span>ADMIN / WIKI BUILDER</span>
          <h1>Конструктор статей</h1>
          <p>
            Собирайте страницы из блоков, управляйте отступами, содержанием,
            изображениями и популярными переходами.
          </p>
        </div>

        <div className={styles.headerActions}>
          {editingId && (
            <Link
              href={`/wiki/${slug}#${encodeURIComponent(primaryAnchor)}`}
              className={styles.openButton}
              target="_blank"
            >
              Открыть статью ↗
            </Link>
          )}
          <Link href="/wiki" className={styles.secondaryHeaderButton}>
            Открыть Wiki
          </Link>
        </div>
      </header>

      <section className={styles.workspace}>
        <aside className={styles.catalogPanel}>
          <div className={styles.panelHeading}>
            <div>
              <span>01 / ARTICLES</span>
              <h2>Статьи</h2>
            </div>
            <b>{articles.length}</b>
          </div>

          <button className={styles.newButton} onClick={resetForm} type="button">
            + Новая страница
          </button>

          <label className={styles.catalogSearch}>
            <span>⌕</span>
            <input
              onChange={(event) => setCatalogSearch(event.target.value)}
              placeholder="Поиск статьи..."
              value={catalogSearch}
            />
          </label>

          <div className={styles.articleButtons}>
            {filteredArticles.length === 0 && (
              <div className={styles.emptyList}>Статьи не найдены.</div>
            )}

            {filteredArticles.map((article) => (
              <button
                className={`${styles.articleButton} ${
                  editingId === article.id ? styles.articleButtonActive : ""
                }`}
                key={article.id}
                onClick={() => selectArticle(article)}
                type="button"
              >
                <span>{article.published ? "Опубликовано" : "Черновик"}</span>
                <b>{article.title}</b>
                <small>
                  {article.category} · /wiki/{article.slug}
                </small>
              </button>
            ))}
          </div>
        </aside>

        <section className={styles.builderColumn}>
          <section className={styles.settingsCard}>
            <div className={styles.panelHeading}>
              <div>
                <span>02 / PAGE SETTINGS</span>
                <h2>{editingId ? "Настройки страницы" : "Новая страница"}</h2>
              </div>
              <div className={styles.statusBadge}>
                <span className={published ? styles.liveDot : styles.draftDot} />
                {published ? "LIVE" : "DRAFT"}
              </div>
            </div>

            <div className={styles.formGrid}>
              <label className={styles.fieldWide}>
                <span>Заголовок страницы</span>
                <input
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Например: Телефон — FiveBets"
                  value={title}
                />
              </label>

              <label>
                <span>Slug</span>
                <input
                  onChange={(event) => setSlug(slugifyAnchor(event.target.value))}
                  placeholder="fivebets"
                  value={slug}
                />
              </label>

              <label>
                <span>Категория</span>
                <input
                  list="article-categories"
                  onChange={(event) => setCategory(event.target.value)}
                  placeholder="phone"
                  value={category}
                />
                <datalist id="article-categories">
                  <option value="start" />
                  <option value="guides" />
                  <option value="phone" />
                  <option value="jobs" />
                  <option value="factions" />
                  <option value="government" />
                  <option value="crime" />
                  <option value="systems" />
                </datalist>
              </label>

              <label>
                <span>Сортировка</span>
                <input
                  min="1"
                  onChange={(event) => setSortOrder(Number(event.target.value))}
                  type="number"
                  value={sortOrder}
                />
              </label>

              <label className={styles.fieldWide}>
                <span>Краткое описание</span>
                <textarea
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Коротко объясните, чему посвящена статья."
                  value={description}
                />
              </label>

              <label className={styles.fieldWide}>
                <span>Обложка</span>
                <div className={styles.imageFieldRow}>
                  <input
                    onChange={(event) => setCoverImage(event.target.value)}
                    placeholder="URL изображения или загрузите файл"
                    value={coverImage}
                  />
                  <label className={styles.uploadButton}>
                    {uploadingBlockId === "cover" ? "Загрузка..." : "Загрузить"}
                    <input
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      disabled={uploadingBlockId === "cover"}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) uploadImage(file);
                        event.target.value = "";
                      }}
                      type="file"
                    />
                  </label>
                </div>
              </label>

              <label>
                <span>Позиция обложки</span>
                <input
                  onChange={(event) => setCoverPosition(event.target.value)}
                  placeholder="50% 50%"
                  value={coverPosition}
                />
              </label>

              <label>
                <span>Пункт для популярных</span>
                <select
                  onChange={(event) => setFeaturedAnchor(event.target.value)}
                  value={featuredAnchor}
                >
                  <option value="">Первый пункт автоматически</option>
                  {toc.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.level === 3 ? "↳ " : ""}{item.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className={styles.switchGrid}>
              <label>
                <input
                  checked={published}
                  onChange={(event) => setPublished(event.target.checked)}
                  type="checkbox"
                />
                <span><b>Опубликована</b><small>Страница доступна игрокам</small></span>
              </label>

              <label>
                <input
                  checked={showToc}
                  onChange={(event) => setShowToc(event.target.checked)}
                  type="checkbox"
                />
                <span><b>Показывать содержание</b><small>Быстрая навигация по пунктам</small></span>
              </label>

              <label>
                <input
                  checked={featured}
                  onChange={(event) => setFeatured(event.target.checked)}
                  type="checkbox"
                />
                <span><b>Закрепить в популярных</b><small>Показывать выше обычных статей</small></span>
              </label>

              <label className={styles.orderSwitch}>
                <span><b>Порядок в популярных</b><small>Меньше — выше</small></span>
                <input
                  min="1"
                  onChange={(event) => setFeaturedOrder(Number(event.target.value))}
                  type="number"
                  value={featuredOrder}
                />
              </label>
            </div>
          </section>

          <section className={styles.paletteCard}>
            <div className={styles.panelHeading}>
              <div>
                <span>03 / BLOCKS</span>
                <h2>Добавить элемент</h2>
              </div>
              <b>{blocks.length}</b>
            </div>

            <div className={styles.paletteGrid}>
              {blockPalette.map((item) => (
                <button key={item.type} onClick={() => addBlock(item.type)} type="button">
                  <i>{item.icon}</i>
                  <span><b>{item.title}</b><small>{item.description}</small></span>
                </button>
              ))}
            </div>
          </section>

          <section className={styles.blocksList}>
            {blocks.length === 0 && (
              <div className={styles.emptyBuilder}>
                Добавьте первый элемент из панели выше.
              </div>
            )}

            {blocks.map((block, index) => (
              <article className={styles.blockEditor} key={block.id}>
                <header className={styles.blockHeader}>
                  <div>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <b>{blockLabel(block.type)}</b>
                    <small>{block.type}</small>
                  </div>

                  <div className={styles.blockActions}>
                    <button disabled={index === 0} onClick={() => moveBlock(index, -1)} title="Поднять" type="button">↑</button>
                    <button disabled={index === blocks.length - 1} onClick={() => moveBlock(index, 1)} title="Опустить" type="button">↓</button>
                    <button onClick={() => duplicateBlock(index)} title="Создать копию" type="button">⧉</button>
                    <button className={styles.removeBlockButton} onClick={() => removeBlock(index)} title="Удалить" type="button">×</button>
                  </div>
                </header>

                {block.type !== "spacer" && block.type !== "divider" && (
                  <div className={styles.blockLayoutControls}>
                    <label>
                      <span>Ширина</span>
                      <select value={block.width} onChange={(event) => updateBlock(block.id, { width: event.target.value as ArticleBlock["width"] })}>
                        <option value="narrow">Узкая</option>
                        <option value="normal">Обычная</option>
                        <option value="wide">Широкая</option>
                        <option value="full">На всю ширину</option>
                      </select>
                    </label>
                    <label>
                      <span>Выравнивание</span>
                      <select value={block.align} onChange={(event) => updateBlock(block.id, { align: event.target.value as ArticleBlock["align"] })}>
                        <option value="left">Слева</option>
                        <option value="center">По центру</option>
                        <option value="right">Справа</option>
                      </select>
                    </label>
                    <label>
                      <span>Фон</span>
                      <select value={block.surface} onChange={(event) => updateBlock(block.id, { surface: event.target.value as ArticleBlock["surface"] })}>
                        <option value="none">Без фона</option>
                        <option value="panel">Панель</option>
                        <option value="accent">Акцент</option>
                      </select>
                    </label>
                    <label>
                      <span>Сверху, px</span>
                      <input min="0" max="240" type="number" value={block.spaceTop} onChange={(event) => updateBlock(block.id, { spaceTop: Number(event.target.value) })} />
                    </label>
                    <label>
                      <span>Снизу, px</span>
                      <input min="0" max="240" type="number" value={block.spaceBottom} onChange={(event) => updateBlock(block.id, { spaceBottom: Number(event.target.value) })} />
                    </label>
                  </div>
                )}

                <div className={styles.blockBody}>
                  {block.type === "heading" && (
                    <div className={styles.inlineFields}>
                      <label className={styles.growField}>
                        <span>Название пункта</span>
                        <input value={block.title || ""} onChange={(event) => updateBlock(block.id, { title: event.target.value, anchor: slugifyAnchor(event.target.value) })} />
                      </label>
                      <label>
                        <span>Уровень</span>
                        <select value={block.level || 2} onChange={(event) => updateBlock(block.id, { level: Number(event.target.value) === 3 ? 3 : 2 })}>
                          <option value="2">Главный H2</option>
                          <option value="3">Подпункт H3</option>
                        </select>
                      </label>
                      <label>
                        <span>Якорь</span>
                        <input value={block.anchor || ""} onChange={(event) => updateBlock(block.id, { anchor: slugifyAnchor(event.target.value) })} />
                      </label>
                    </div>
                  )}

                  {block.type === "text" && (
                    <TextEditor value={block.html || ""} onChange={(html) => updateBlock(block.id, { html })} />
                  )}

                  {block.type === "columns" && (
                    <div className={styles.columnsEditors}>
                      <div><span>Левая колонка</span><TextEditor value={block.html || ""} onChange={(html) => updateBlock(block.id, { html })} /></div>
                      <div><span>Правая колонка</span><TextEditor value={block.secondaryHtml || ""} onChange={(secondaryHtml) => updateBlock(block.id, { secondaryHtml })} /></div>
                    </div>
                  )}

                  {block.type === "image" && (
                    <div className={styles.imageEditor}>
                      <div className={styles.imageFieldRow}>
                        <input value={block.imageUrl || ""} onChange={(event) => updateBlock(block.id, { imageUrl: event.target.value })} placeholder="URL изображения" />
                        <label className={styles.uploadButton}>
                          {uploadingBlockId === block.id ? "Загрузка..." : "Загрузить фото"}
                          <input accept="image/jpeg,image/png,image/webp,image/gif" disabled={uploadingBlockId === block.id} type="file" onChange={(event) => { const file = event.target.files?.[0]; if (file) uploadImage(file, block.id); event.target.value = ""; }} />
                        </label>
                      </div>
                      <div className={styles.inlineFields}>
                        <label className={styles.growField}><span>Alt-текст</span><input value={block.imageAlt || ""} onChange={(event) => updateBlock(block.id, { imageAlt: event.target.value })} /></label>
                        <label><span>Высота</span><input min="140" max="1200" type="number" value={block.imageHeight || 440} onChange={(event) => updateBlock(block.id, { imageHeight: Number(event.target.value) })} /></label>
                        <label><span>Режим</span><select value={block.imageFit || "cover"} onChange={(event) => updateBlock(block.id, { imageFit: event.target.value as "cover" | "contain" })}><option value="cover">Заполнить</option><option value="contain">Целиком</option></select></label>
                        <label><span>Позиция</span><input value={block.imagePosition || "50% 50%"} onChange={(event) => updateBlock(block.id, { imagePosition: event.target.value })} /></label>
                      </div>
                      <label className={styles.fullField}><span>Подпись под фото</span><input value={block.caption || ""} onChange={(event) => updateBlock(block.id, { caption: event.target.value })} /></label>
                    </div>
                  )}

                  {block.type === "quote" && (
                    <div className={styles.stackFields}>
                      <TextEditor value={block.html || ""} onChange={(html) => updateBlock(block.id, { html })} />
                      <label><span>Автор или источник</span><input value={block.quoteAuthor || ""} onChange={(event) => updateBlock(block.id, { quoteAuthor: event.target.value })} /></label>
                    </div>
                  )}

                  {block.type === "callout" && (
                    <div className={styles.stackFields}>
                      <div className={styles.inlineFields}>
                        <label className={styles.growField}><span>Заголовок</span><input value={block.title || ""} onChange={(event) => updateBlock(block.id, { title: event.target.value })} /></label>
                        <label><span>Тип</span><select value={block.tone || "info"} onChange={(event) => updateBlock(block.id, { tone: event.target.value as ArticleBlock["tone"] })}><option value="info">Информация</option><option value="success">Успех</option><option value="warning">Предупреждение</option><option value="danger">Важно</option></select></label>
                      </div>
                      <TextEditor value={block.html || ""} onChange={(html) => updateBlock(block.id, { html })} />
                    </div>
                  )}

                  {block.type === "divider" && (
                    <label className={styles.fullField}><span>Стиль линии</span><select value={block.dividerStyle || "glow"} onChange={(event) => updateBlock(block.id, { dividerStyle: event.target.value as ArticleBlock["dividerStyle"] })}><option value="solid">Обычная</option><option value="dashed">Пунктир</option><option value="glow">Красное свечение</option></select></label>
                  )}

                  {block.type === "spacer" && (
                    <label className={styles.rangeField}><span>Высота свободного места: <b>{block.spacerHeight || 48}px</b></span><input min="8" max="320" type="range" value={block.spacerHeight || 48} onChange={(event) => updateBlock(block.id, { spacerHeight: Number(event.target.value) })} /></label>
                  )}
                </div>
              </article>
            ))}
          </section>

          {message && (
            <div className={`${styles.message} ${messageType === "error" ? styles.messageError : ""}`}>
              <span>{messageType === "error" ? "!" : "✓"}</span>{message}
            </div>
          )}

          <div className={styles.saveBar}>
            <div>
              <b>{blocks.length} блоков</b>
              <span>{toc.length} пунктов содержания</span>
            </div>
            <button disabled={loading} onClick={saveArticle} type="button">
              {loading ? "Сохранение..." : editingId ? "Сохранить изменения" : "Создать страницу"}
            </button>
            {editingId && <button className={styles.deleteButton} onClick={deleteSelectedArticle} type="button">Удалить статью</button>}
          </div>
        </section>

        <aside className={styles.previewPanel}>
          <div className={styles.panelHeading}>
            <div>
              <span>04 / LIVE PREVIEW</span>
              <h2>Предпросмотр</h2>
            </div>
            <b>{toc.length}</b>
          </div>

          <article className={styles.previewArticle}>
            <div
              className={styles.previewHero}
              style={coverImage ? { backgroundImage: `linear-gradient(180deg, rgba(4,5,7,.3), rgba(4,5,7,.96)), url("${coverImage}")`, backgroundPosition: coverPosition } : undefined}
            >
              <span>{category || "general"}</span>
              <h2>{title || "Без названия"}</h2>
              {description && <p>{description}</p>}
            </div>

            {showToc && toc.length > 0 && (
              <nav className={styles.previewToc}>
                <div><b>Содержание</b><span>{toc.length}</span></div>
                {toc.map((item, index) => (
                  <a className={item.level === 3 ? styles.previewTocChild : ""} href={`#${item.id}`} key={item.id}>
                    <span>{index + 1}</span>{item.label}
                  </a>
                ))}
              </nav>
            )}

            <div className={styles.previewContent}>
              <ArticleRenderer blocks={blocks} compact />
            </div>
          </article>

          <div className={styles.previewHint}>
            Популярная карточка откроет страницу по адресу:
            <b>/wiki/{slug || "article"}#{primaryAnchor}</b>
          </div>
        </aside>
      </section>
    </main>
  );
}
