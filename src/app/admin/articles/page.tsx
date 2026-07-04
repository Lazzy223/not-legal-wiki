"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
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
  { type: "table", icon: "▦", title: "Таблица", description: "Строки и колонки" },
  { type: "callout", icon: "!", title: "Врезка", description: "Важный блок" },
  { type: "quote", icon: "“", title: "Цитата", description: "Акцентный текст" },
  { type: "divider", icon: "—", title: "Разделитель", description: "Линия между блоками" },
  { type: "spacer", icon: "↕", title: "Отступ", description: "Свободное место" },
];
type UploadStorageStatus = {
  ready: boolean;
  storage: "vercel-blob" | "local";
  message: string;
  maxFileSize: number;
};

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

function articleToEditorBlocks(article: WikiArticle): ArticleBlock[] {
  const normalizedBlocks = normalizeArticleBlocks(article.blocks);
  const blocks =
    normalizedBlocks.length > 0
      ? normalizedBlocks
      : [
          {
            ...createArticleBlock("text"),
            html: article.content || "<p>Текст статьи.</p>",
          },
        ];

  const legacyCover = String(article.coverImage || "").trim();
  const alreadyUsed = blocks.some(
    (block) => block.type === "image" && block.imageUrl === legacyCover
  );

  if (!legacyCover || alreadyUsed) {
    return blocks;
  }

  return [
    {
      ...createArticleBlock("image"),
      imageUrl: legacyCover,
      imageAlt: article.title,
      imagePosition: article.coverPosition || "50% 50%",
      imageFit: "contain" as const,
      imageHeight: 720,
      imageWidth: 80,
    },
    ...blocks,
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
  const [showToc, setShowToc] = useState(true);
  const [featured, setFeatured] = useState(false);
  const [featuredOrder, setFeaturedOrder] = useState(999);
  const [featuredAnchor, setFeaturedAnchor] = useState("");
  const [published, setPublished] = useState(true);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const [loading, setLoading] = useState(false);
  const [uploadingBlockId, setUploadingBlockId] = useState<string | null>(null);
  const [uploadStorage, setUploadStorage] = useState<UploadStorageStatus | null>(null);
  const [checkingUploadStorage, setCheckingUploadStorage] = useState(false);
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

  const checkUploadStorage = useCallback(async (announce = false) => {
    setCheckingUploadStorage(true);

    try {
      const response = await fetch("/api/admin/articles/upload", {
        cache: "no-store",
      });
      const data = (await response.json()) as Partial<UploadStorageStatus> & {
        message?: string;
      };

      if (!response.ok) {
        throw new Error(data.message || "Не удалось проверить хранилище изображений");
      }

      const status: UploadStorageStatus = {
        ready: Boolean(data.ready),
        storage: data.storage === "vercel-blob" ? "vercel-blob" : "local",
        message: String(data.message || "Статус хранилища получен"),
        maxFileSize: Number(data.maxFileSize || 4 * 1024 * 1024),
      };

      setUploadStorage(status);

      if (announce) {
        setMessage(status.message);
        setMessageType(status.ready ? "success" : "error");
      }
    } catch (error) {
      const text =
        error instanceof Error
          ? error.message
          : "Не удалось проверить хранилище изображений";

      setUploadStorage({
        ready: false,
        storage: "vercel-blob",
        message: text,
        maxFileSize: 4 * 1024 * 1024,
      });

      if (announce) {
        setMessage(text);
        setMessageType("error");
      }
    } finally {
      setCheckingUploadStorage(false);
    }
  }, []);

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

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void checkUploadStorage();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [checkUploadStorage]);

  function resetForm() {
    setEditingId(null);
    setTitle("Новая статья");
    setSlug("new-article");
    setCategory("guides");
    setSortOrder(100);
    setDescription("");
    setBlocks(defaultBlocks());
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

  function updateTableHeader(block: ArticleBlock, columnIndex: number, value: string) {
    const headers = [...(block.tableHeaders || ["Колонка 1"])];
    headers[columnIndex] = value;
    updateBlock(block.id, { tableHeaders: headers });
  }

  function updateTableCell(
    block: ArticleBlock,
    rowIndex: number,
    columnIndex: number,
    value: string
  ) {
    const headers = block.tableHeaders || ["Колонка 1"];
    const rows = (block.tableRows || []).map((row) =>
      Array.from({ length: headers.length }, (_, index) => row[index] || "")
    );

    rows[rowIndex][columnIndex] = value;
    updateBlock(block.id, { tableRows: rows });
  }

  function addTableColumn(block: ArticleBlock) {
    const headers = [...(block.tableHeaders || ["Колонка 1"])];

    if (headers.length >= 12) {
      setMessage("В одной таблице можно создать не больше 12 колонок");
      setMessageType("error");
      return;
    }

    headers.push(`Колонка ${headers.length + 1}`);
    const rows = (block.tableRows || []).map((row) => [...row, ""]);
    updateBlock(block.id, { tableHeaders: headers, tableRows: rows });
  }

  function removeTableColumn(block: ArticleBlock, columnIndex: number) {
    const headers = block.tableHeaders || ["Колонка 1"];

    if (headers.length <= 1) {
      setMessage("В таблице должна остаться хотя бы одна колонка");
      setMessageType("error");
      return;
    }

    updateBlock(block.id, {
      tableHeaders: headers.filter((_, index) => index !== columnIndex),
      tableRows: (block.tableRows || []).map((row) =>
        row.filter((_, index) => index !== columnIndex)
      ),
    });
  }

  function addTableRow(block: ArticleBlock) {
    const columnCount = (block.tableHeaders || ["Колонка 1"]).length;
    const rows = block.tableRows || [];

    if (rows.length >= 250) {
      setMessage("В одной таблице можно создать не больше 250 строк");
      setMessageType("error");
      return;
    }

    updateBlock(block.id, {
      tableRows: [...rows, Array.from({ length: columnCount }, () => "")],
    });
  }

  function removeTableRow(block: ArticleBlock, rowIndex: number) {
    updateBlock(block.id, {
      tableRows: (block.tableRows || []).filter((_, index) => index !== rowIndex),
    });
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

  async function uploadImage(file: File, blockId: string) {
    const maxFileSize = uploadStorage?.maxFileSize || 4 * 1024 * 1024;
    const allowedTypes = new Set([
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ]);

    if (!allowedTypes.has(file.type)) {
      setMessage("Разрешены JPG, PNG, WEBP и GIF");
      setMessageType("error");
      return;
    }

    if (file.size > maxFileSize) {
      setMessage("Размер изображения не должен превышать 4 МБ");
      setMessageType("error");
      return;
    }

    if (uploadStorage && !uploadStorage.ready) {
      setMessage(uploadStorage.message);
      setMessageType("error");
      return;
    }

    setUploadingBlockId(blockId);
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/admin/articles/upload", {
        method: "POST",
        body: formData,
      });

      const contentType = response.headers.get("content-type") || "";
      const data = contentType.includes("application/json")
        ? await response.json()
        : { message: await response.text() };

      if (!response.ok) {
        if (response.status === 413) {
          throw new Error("Файл слишком большой для загрузки через Vercel");
        }

        throw new Error(data.message || "Не удалось загрузить изображение");
      }

      if (!data.url) {
        throw new Error("Сервер не вернул адрес загруженного изображения");
      }

      updateBlock(blockId, { imageUrl: data.url });
      setUploadStorage((current) => ({
        ready: true,
        storage: data.storage === "vercel-blob" ? "vercel-blob" : current?.storage || "local",
        message:
          data.storage === "vercel-blob"
            ? "Vercel Blob подключён и принимает изображения."
            : "Локальное хранилище принимает изображения.",
        maxFileSize,
      }));

      setMessage("Изображение загружено в блок статьи");
      setMessageType("success");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Ошибка загрузки");
      setMessageType("error");
      void checkUploadStorage();
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
          coverImage: "",
          coverPosition: "50% 50%",
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

              <div className={`${styles.fieldWide} ${styles.mediaNotice}`}>
                <div>
                  <span>Изображения внутри материала</span>
                  <b>Фото добавляются отдельными блоками статьи</b>
                  <p>Добавляйте изображения между текстом, заголовками и таблицами.</p>

                  <div
                    className={`${styles.uploadStorageStatus} ${
                      uploadStorage?.ready
                        ? styles.uploadStorageReady
                        : styles.uploadStorageError
                    }`}
                  >
                    <i aria-hidden="true" />
                    <strong>
                      {checkingUploadStorage
                        ? "Проверяем хранилище..."
                        : uploadStorage?.message || "Статус хранилища ещё не получен"}
                    </strong>
                    <button
                      disabled={checkingUploadStorage}
                      onClick={() => void checkUploadStorage(true)}
                      type="button"
                    >
                      Проверить
                    </button>
                  </div>
                </div>
                <button onClick={() => addBlock("image")} type="button">
                  + Добавить изображение
                </button>
              </div>

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

                  {block.type === "table" && (
                    <div className={styles.tableEditor}>
                      <div className={styles.tableSettingsGrid}>
                        <label className={styles.growField}>
                          <span>Подпись над таблицей</span>
                          <input
                            onChange={(event) => updateBlock(block.id, { tableCaption: event.target.value })}
                            placeholder="Например: Ассортимент магазина"
                            value={block.tableCaption || ""}
                          />
                        </label>

                        <label>
                          <span>Стиль</span>
                          <select
                            onChange={(event) => updateBlock(block.id, { tableStyle: event.target.value as ArticleBlock["tableStyle"] })}
                            value={block.tableStyle || "default"}
                          >
                            <option value="default">Обычная</option>
                            <option value="striped">Полосатая</option>
                            <option value="minimal">Минимальная</option>
                          </select>
                        </label>
                      </div>

                      <div className={styles.tableOptionRow}>
                        <label>
                          <input
                            checked={Boolean(block.tableCompact)}
                            onChange={(event) => updateBlock(block.id, { tableCompact: event.target.checked })}
                            type="checkbox"
                          />
                          <span>Компактные строки</span>
                        </label>
                        <label>
                          <input
                            checked={Boolean(block.tableFirstColumnStrong)}
                            onChange={(event) => updateBlock(block.id, { tableFirstColumnStrong: event.target.checked })}
                            type="checkbox"
                          />
                          <span>Выделять первую колонку</span>
                        </label>
                      </div>

                      <div className={styles.tableToolbar}>
                        <div>
                          <b>{(block.tableHeaders || []).length} колонок</b>
                          <span>{(block.tableRows || []).length} строк</span>
                        </div>
                        <button onClick={() => addTableColumn(block)} type="button">+ Колонка</button>
                        <button onClick={() => addTableRow(block)} type="button">+ Строка</button>
                      </div>

                      <div className={styles.tableEditorScroller}>
                        <table className={styles.tableEditorTable}>
                          <thead>
                            <tr>
                              <th className={styles.tableIndexCell}>#</th>
                              {(block.tableHeaders || ["Колонка 1"]).map((header, columnIndex) => (
                                <th key={`${block.id}-header-editor-${columnIndex}`}>
                                  <div className={styles.tableHeaderEditor}>
                                    <input
                                      onChange={(event) => updateTableHeader(block, columnIndex, event.target.value)}
                                      value={header}
                                    />
                                    <button
                                      aria-label={`Удалить колонку ${columnIndex + 1}`}
                                      onClick={() => removeTableColumn(block, columnIndex)}
                                      title="Удалить колонку"
                                      type="button"
                                    >
                                      ×
                                    </button>
                                  </div>
                                </th>
                              ))}
                              <th className={styles.tableRowActionCell}>Действия</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(block.tableRows || []).map((row, rowIndex) => (
                              <tr key={`${block.id}-row-editor-${rowIndex}`}>
                                <th className={styles.tableIndexCell} scope="row">{rowIndex + 1}</th>
                                {(block.tableHeaders || ["Колонка 1"]).map((_, columnIndex) => (
                                  <td key={`${block.id}-cell-editor-${rowIndex}-${columnIndex}`}>
                                    <textarea
                                      onChange={(event) => updateTableCell(block, rowIndex, columnIndex, event.target.value)}
                                      placeholder="Значение ячейки"
                                      rows={2}
                                      value={row[columnIndex] || ""}
                                    />
                                  </td>
                                ))}
                                <td className={styles.tableRowActionCell}>
                                  <button
                                    onClick={() => removeTableRow(block, rowIndex)}
                                    title="Удалить строку"
                                    type="button"
                                  >
                                    Удалить
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        {(block.tableRows || []).length === 0 && (
                          <div className={styles.tableEmptyEditor}>
                            В таблице нет строк. Нажмите «+ Строка».
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {block.type === "image" && (
                    <div className={styles.imageEditor}>
                      <p className={styles.imageEditorNote}>
                        Этот блок является отдельным элементом статьи. Его можно перемещать между текстом, заголовками и таблицами.
                      </p>
                      <div className={styles.imageFieldRow}>
                        <input value={block.imageUrl || ""} onChange={(event) => updateBlock(block.id, { imageUrl: event.target.value })} placeholder="URL изображения" />
                        <label className={styles.uploadButton}>
                          {uploadingBlockId === block.id ? "Загрузка..." : "Загрузить фото"}
                          <input accept="image/jpeg,image/png,image/webp,image/gif" disabled={uploadingBlockId === block.id} type="file" onChange={(event) => { const file = event.target.files?.[0]; if (file) uploadImage(file, block.id); event.target.value = ""; }} />
                        </label>
                      </div>
                      <div className={styles.inlineFields}>
                        <label className={styles.growField}><span>Alt-текст</span><input value={block.imageAlt || ""} onChange={(event) => updateBlock(block.id, { imageAlt: event.target.value })} /></label>
                        <label>
                          <span>Расположение</span>
                          <select value={block.align} onChange={(event) => updateBlock(block.id, { align: event.target.value as ArticleBlock["align"] })}>
                            <option value="left">Слева</option>
                            <option value="center">По центру</option>
                            <option value="right">Справа</option>
                          </select>
                        </label>
                        <label>
                          <span>Режим</span>
                          <select value={block.imageFit || "contain"} onChange={(event) => updateBlock(block.id, { imageFit: event.target.value as "cover" | "contain" })}>
                            <option value="contain">Показать целиком</option>
                            <option value="cover">Обрезать по рамке</option>
                          </select>
                        </label>
                        <label>
                          <span>Фокус кадра</span>
                          <select value={block.imagePosition || "50% 50%"} onChange={(event) => updateBlock(block.id, { imagePosition: event.target.value })}>
                            <option value="50% 50%">По центру</option>
                            <option value="50% 0%">Сверху</option>
                            <option value="50% 100%">Снизу</option>
                            <option value="0% 50%">Слева</option>
                            <option value="100% 50%">Справа</option>
                          </select>
                        </label>
                      </div>

                      <div className={styles.imageSizingGrid}>
                        <label>
                          <span>Ширина фото</span>
                          <select value={block.imageWidth || 80} onChange={(event) => updateBlock(block.id, { imageWidth: Number(event.target.value) })}>
                            <option value="25">25% — миниатюра</option>
                            <option value="40">40% — маленькая</option>
                            <option value="50">50% — половина</option>
                            <option value="60">60% — средняя</option>
                            <option value="70">70% — увеличенная</option>
                            <option value="80">80% — большая</option>
                            <option value="90">90% — почти вся</option>
                            <option value="100">100% — вся ширина</option>
                          </select>
                        </label>

                        <label className={styles.imageWidthRange}>
                          <span>Точная ширина: <b>{block.imageWidth || 80}%</b></span>
                          <input min="20" max="100" step="5" type="range" value={block.imageWidth || 80} onChange={(event) => updateBlock(block.id, { imageWidth: Number(event.target.value) })} />
                        </label>

                        <label>
                          <span>{(block.imageFit || "contain") === "cover" ? "Высота рамки" : "Максимальная высота"}</span>
                          <select value={block.imageHeight || 720} onChange={(event) => updateBlock(block.id, { imageHeight: Number(event.target.value) })}>
                            <option value="240">240 px</option>
                            <option value="360">360 px</option>
                            <option value="480">480 px</option>
                            <option value="600">600 px</option>
                            <option value="720">720 px</option>
                            <option value="900">900 px</option>
                            <option value="1200">1200 px</option>
                            <option value="1600">1600 px</option>
                          </select>
                        </label>
                      </div>

                      <p className={styles.imageSizeHint}>
                        Ширина считается от выбранной ширины блока выше. Выравнивание теперь двигает само изображение, а не только подпись.
                      </p>

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
            <div className={styles.previewHero}>
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
