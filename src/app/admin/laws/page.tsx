"use client";

import Link from "next/link";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import LegalContent from "@/components/legal-content";
import LawForumExport from "@/components/law-forum-export";
import TextEditor from "@/components/text-editor";
import {
  getLawArticleCount,
  getLawHeadings,
  legalPlainTextToHtml,
  stripLawHtml,
} from "@/lib/laws-content";
import type { LawDocument } from "@/lib/laws-store";
import { formatMoscowDate } from "@/lib/moscow-time";
import styles from "./laws-admin.module.css";

function defaultLegalContent() {
  return `<h2>РАЗДЕЛ I. ОБЩИЕ ПОЛОЖЕНИЯ</h2>
<h3>ГЛАВА 1. ОСНОВНЫЕ ПОЛОЖЕНИЯ</h3>
<h4>Статья 1. Предмет регулирования</h4>
<p><strong>ч. 1</strong> Укажите текст первой части статьи.</p>
<p><strong>а)</strong> Укажите текст подпункта;</p>
<blockquote><strong>Примечание:</strong> добавьте необходимое разъяснение.</blockquote>`;
}

function nextOrder(documents: LawDocument[]) {
  if (documents.length === 0) return 10;
  return Math.max(...documents.map((item) => item.sortOrder || 0)) + 10;
}

function formatDate(value?: string) {
  if (!value) return "Ещё не сохранялся";
  return `${formatMoscowDate(value, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }, value)} МСК`;
}

export default function AdminLawsPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [documents, setDocuments] = useState<LawDocument[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [listSearch, setListSearch] = useState("");
  const [catalogOpen, setCatalogOpen] = useState(false);

  const [number, setNumber] = useState("01");
  const [icon, setIcon] = useState("§");
  const [title, setTitle] = useState("Новый нормативный акт");
  const [subtitle, setSubtitle] = useState("");
  const [category, setCategory] = useState("Законы штата");
  const [description, setDescription] = useState("");
  const [sortOrder, setSortOrder] = useState(10);
  const [version, setVersion] = useState("1.0");
  const [adoptedAt, setAdoptedAt] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");
  const [published, setPublished] = useState(true);
  const [contentHtml, setContentHtml] = useState(defaultLegalContent());
  const [importText, setImportText] = useState("");
  const [legalChapterColor, setLegalChapterColor] = useState("#f4f4f5");
  const [legalArticleColor, setLegalArticleColor] = useState("#ef4444");
  const [legalListColor, setLegalListColor] = useState("#ef4444");
  const [italicizeImportedArticles, setItalicizeImportedArticles] = useState(true);
  const [updateUpdatedAt, setUpdateUpdatedAt] = useState(true);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const [loading, setLoading] = useState(false);
  const [documentsLoading, setDocumentsLoading] = useState(true);

  const sortedDocuments = useMemo(() => {
    return [...documents].sort((first, second) => {
      if (first.sortOrder !== second.sortOrder) {
        return first.sortOrder - second.sortOrder;
      }
      return first.number.localeCompare(second.number, "ru", { numeric: true });
    });
  }, [documents]);

  const filteredDocuments = useMemo(() => {
    const query = listSearch.trim().toLowerCase();
    if (!query) return sortedDocuments;

    return sortedDocuments.filter((item) =>
      [
        item.number,
        item.title,
        item.subtitle,
        item.category,
        item.description,
        item.version,
        stripLawHtml(item.contentHtml),
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [listSearch, sortedDocuments]);

  const articleCount = useMemo(
    () => getLawArticleCount(contentHtml),
    [contentHtml]
  );
  const headingCount = useMemo(
    () => getLawHeadings(contentHtml).length,
    [contentHtml]
  );
  const totalArticles = useMemo(
    () =>
      documents.reduce(
        (total, item) => total + getLawArticleCount(item.contentHtml),
        0
      ),
    [documents]
  );

  const isReady = Boolean(
    title.trim() && contentHtml.trim() && contentHtml !== "<p></p>"
  );

  async function loadDocuments(preferredId?: string | null) {
    setDocumentsLoading(true);

    try {
      const response = await fetch("/api/admin/laws", { cache: "no-store" });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || "Не удалось загрузить законодательство");
      }

      const loaded = Array.isArray(data?.documents)
        ? (data.documents as LawDocument[])
        : [];
      setDocuments(loaded);

      const selected = loaded.find(
        (item) => item.id === (preferredId || editingId)
      );
      if (selected) fillForm(selected, false);
    } catch (error) {
      setMessageType("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Не удалось загрузить законодательство"
      );
    } finally {
      setDocumentsLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    fetch("/api/admin/laws", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(data?.message || "Не удалось загрузить законодательство");
        }
        return Array.isArray(data?.documents)
          ? (data.documents as LawDocument[])
          : [];
      })
      .then((loaded) => {
        if (!cancelled) setDocuments(loaded);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setMessageType("error");
          setMessage(
            error instanceof Error
              ? error.message
              : "Не удалось загрузить законодательство"
          );
        }
      })
      .finally(() => {
        if (!cancelled) setDocumentsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "F2") {
        event.preventDefault();
        setCatalogOpen((current) => !current);
      }

      if (event.key === "Escape" && catalogOpen) {
        setCatalogOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [catalogOpen]);

  useEffect(() => {
    if (!catalogOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [catalogOpen]);

  function resetForm() {
    setEditingId(null);
    setNumber(String(documents.length + 1).padStart(2, "0"));
    setIcon("§");
    setTitle("Новый нормативный акт");
    setSubtitle("");
    setCategory("Законы штата");
    setDescription("");
    setSortOrder(nextOrder(documents));
    setVersion("1.0");
    setAdoptedAt("");
    setUpdatedAt("");
    setPublished(true);
    setContentHtml(defaultLegalContent());
    setImportText("");
    setMessage("");
    setCatalogOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function fillForm(item: LawDocument, showMessage = true) {
    setEditingId(item.id);
    setNumber(item.number);
    setIcon(item.icon);
    setTitle(item.title);
    setSubtitle(item.subtitle);
    setCategory(item.category);
    setDescription(item.description);
    setSortOrder(item.sortOrder);
    setVersion(item.version);
    setAdoptedAt(item.adoptedAt);
    setUpdatedAt(item.updatedAt);
    setPublished(item.published);
    setContentHtml(item.contentHtml || defaultLegalContent());
    setImportText("");

    if (showMessage) {
      setMessageType("success");
      setMessage(`Открыт документ: ${item.title}`);
    }

    setCatalogOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function duplicateDocument() {
    setEditingId(null);
    setNumber(String(documents.length + 1).padStart(2, "0"));
    setTitle(`${title.trim() || "Нормативный акт"} — копия`);
    setSortOrder(nextOrder(documents));
    setUpdatedAt("");
    setPublished(false);
    setMessageType("success");
    setMessage("Копия подготовлена как черновик. Нажми «Создать документ». ");
  }

  function applyPlainTextImport(source = importText) {
    if (!source.trim()) {
      setMessageType("error");
      setMessage("Вставь текст закона или выбери TXT-файл");
      return;
    }

    if (
      stripLawHtml(contentHtml).trim() &&
      !window.confirm("Заменить текущий текст документа импортированным?")
    ) {
      return;
    }

    setContentHtml(
      legalPlainTextToHtml(source, {
        chapterColor: legalChapterColor,
        articleColor: legalArticleColor,
        listColor: legalListColor,
        italicizeArticleBody: italicizeImportedArticles,
      })
    );
    setMessageType("success");
    setMessage(
      "Текст распознан и оформлен: названия и главы по центру, статьи слева, содержание построено только по главам."
    );
  }

  async function handleFileImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const text = await file.text();
      setImportText(text);
      applyPlainTextImport(text);
    } catch {
      setMessageType("error");
      setMessage("Не удалось прочитать TXT-файл");
    }
  }

  async function saveDocument() {
    if (!isReady) {
      setMessageType("error");
      setMessage("Укажи название и добавь текст нормативного акта");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/laws", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId,
          number,
          icon,
          title: title.trim(),
          subtitle: subtitle.trim(),
          category: category.trim(),
          description: description.trim(),
          sortOrder,
          version: version.trim(),
          adoptedAt,
          published,
          contentHtml,
          updateUpdatedAt,
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message || "Ошибка сохранения");

      const saved = data?.document as LawDocument | undefined;
      if (saved) {
        setEditingId(saved.id);
        setUpdatedAt(saved.updatedAt);
      }

      await loadDocuments(saved?.id || editingId);
      setMessageType("success");
      setMessage(editingId ? "Изменения сохранены" : "Документ создан");
    } catch (error) {
      setMessageType("error");
      setMessage(error instanceof Error ? error.message : "Ошибка сохранения");
    } finally {
      setLoading(false);
    }
  }

  async function deleteDocument() {
    if (!editingId) return;
    if (!window.confirm(`Удалить документ «${title}»?`)) return;

    setLoading(true);

    try {
      const response = await fetch("/api/admin/laws", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingId }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message || "Ошибка удаления");

      const remaining = documents.filter((item) => item.id !== editingId);
      setDocuments(remaining);
      resetForm();
      setMessageType("success");
      setMessage("Документ удалён");
    } catch (error) {
      setMessageType("error");
      setMessage(error instanceof Error ? error.message : "Ошибка удаления");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <span>LEGAL CONTROL</span>
          <h1>Редактор законодательства</h1>
          <p>
            Создание законов, кодексов и иных нормативных актов с автоматическим
            содержанием и юридической структурой.
          </p>
        </div>

        <div className={styles.headerActions}>
          <button type="button" onClick={() => setCatalogOpen(true)}>
            Каталог законов <kbd>F2</kbd>
          </button>
          <Link href="/wiki/laws" target="_blank">
            Открыть законку ↗
          </Link>
          <Link href="/admin">В админ-панель</Link>
        </div>
      </header>

      <button
        type="button"
        className={styles.catalogTrigger}
        onClick={() => setCatalogOpen(true)}
        aria-label="Открыть каталог законов"
      >
        <span>§</span>
        <b>Каталог законов</b>
        <kbd>F2</kbd>
      </button>

      <section className={styles.stats}>
        <article><span>Документов</span><b>{documents.length}</b></article>
        <article><span>Опубликовано</span><b>{documents.filter((item) => item.published).length}</b></article>
        <article><span>Всего статей</span><b>{totalArticles}</b></article>
        <article><span>Текущий документ</span><b>{articleCount} статей</b></article>
      </section>

      <section className={styles.workspace}>
        {catalogOpen && (
          <button
            type="button"
            className={styles.drawerBackdrop}
            onClick={() => setCatalogOpen(false)}
            aria-label="Закрыть каталог"
          />
        )}

        <aside
          className={`${styles.catalog} ${catalogOpen ? styles.catalogOpen : ""}`}
          aria-hidden={!catalogOpen}
        >
          <div className={styles.panelHead}>
            <div><span>01 / CATALOG</span><h2>Каталог законов</h2></div>
            <div className={styles.drawerHeadActions}>
              <b>{documents.length}</b>
              <button
                type="button"
                onClick={() => setCatalogOpen(false)}
                aria-label="Закрыть каталог"
              >
                ×
              </button>
            </div>
          </div>

          <button type="button" className={styles.newButton} onClick={resetForm}>
            ＋ Новый документ
          </button>

          <label className={styles.search}>
            <span>⌕</span>
            <input
              value={listSearch}
              onChange={(event) => setListSearch(event.target.value)}
              placeholder="Найти закон..."
            />
          </label>

          <div className={styles.documentList}>
            {documentsLoading && <div className={styles.empty}>Загрузка...</div>}
            {!documentsLoading && filteredDocuments.length === 0 && (
              <div className={styles.empty}>Документы не найдены.</div>
            )}

            {filteredDocuments.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => fillForm(item)}
                className={editingId === item.id ? styles.documentActive : ""}
              >
                <span>{item.icon || "§"}</span>
                <div>
                  <small>{item.category} · № {item.number}</small>
                  <strong>{item.title}</strong>
                  <em>{item.published ? "Опубликован" : "Черновик"}</em>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <section className={styles.editor}>
          <div className={styles.editorHead}>
            <div>
              <span>02 / EDITOR</span>
              <h2>{editingId ? "Редактирование документа" : "Новый документ"}</h2>
            </div>
            <div className={published ? styles.live : styles.draft}>
              {published ? "Опубликован" : "Черновик"}
            </div>
          </div>

          <div className={styles.formBlock}>
            <div className={styles.formTitle}>
              <b>Карточка нормативного акта</b>
              <span>Данные для каталога и публичной страницы</span>
            </div>

            <div className={styles.compactGrid}>
              <label><span>Номер</span><input value={number} onChange={(event) => setNumber(event.target.value)} /></label>
              <label><span>Символ</span><input value={icon} onChange={(event) => setIcon(event.target.value)} /></label>
              <label><span>Редакция</span><input value={version} onChange={(event) => setVersion(event.target.value)} /></label>
              <label><span>Порядок</span><input type="number" value={sortOrder} onChange={(event) => setSortOrder(Number(event.target.value))} /></label>
            </div>

            <label className={styles.field}><span>Название</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Закон о судебной системе" /></label>
            <label className={styles.field}><span>Подзаголовок</span><input value={subtitle} onChange={(event) => setSubtitle(event.target.value)} placeholder="О судебной системе штата Сан-Андреас" /></label>

            <div className={styles.twoColumns}>
              <label className={styles.field}><span>Категория</span><input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Конституционные законы" /></label>
              <label className={styles.field}><span>Дата принятия</span><input type="date" value={adoptedAt} onChange={(event) => setAdoptedAt(event.target.value)} /></label>
            </div>

            <label className={styles.field}><span>Краткое описание</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Кратко опиши предмет регулирования документа" /></label>

            <label className={styles.switchRow}>
              <input type="checkbox" checked={published} onChange={(event) => setPublished(event.target.checked)} />
              <span><b>Показывать на публичной странице</b><small>Выключи для сохранения документа как черновика</small></span>
            </label>
          </div>

          <div className={styles.importBlock}>
            <div className={styles.formTitle}>
              <b>Умный импорт текста</b>
              <span>Распознаёт разделы, главы, статьи, части, подпункты и примечания</span>
            </div>

            <div className={styles.importSettings}>
              <label>
                <span>Цвет глав и названий</span>
                <div>
                  <input
                    type="color"
                    value={legalChapterColor}
                    onChange={(event) => setLegalChapterColor(event.target.value)}
                  />
                  <code>{legalChapterColor}</code>
                </div>
              </label>

              <label>
                <span>Цвет статей</span>
                <div>
                  <input
                    type="color"
                    value={legalArticleColor}
                    onChange={(event) => setLegalArticleColor(event.target.value)}
                  />
                  <code>{legalArticleColor}</code>
                </div>
              </label>

              <label>
                <span>Цвет частей, списков и подпунктов</span>
                <div>
                  <input
                    type="color"
                    value={legalListColor}
                    onChange={(event) => setLegalListColor(event.target.value)}
                  />
                  <code>{legalListColor}</code>
                </div>
              </label>

              <label className={styles.importToggle}>
                <input
                  type="checkbox"
                  checked={italicizeImportedArticles}
                  onChange={(event) =>
                    setItalicizeImportedArticles(event.target.checked)
                  }
                />
                <span>Сразу сделать текст внутри статей курсивом</span>
              </label>
            </div>

            <div className={styles.importHint}>
              Умный импорт распознаёт главы, статьи, форматы «ч. 1.», «ч1»,
              нумерованные и маркированные списки. Номер части получает выбранный
              цвет, а её текст — курсив. Содержание создаётся только из глав.
            </div>

            <textarea
              value={importText}
              onChange={(event) => setImportText(event.target.value)}
              placeholder="Вставь сюда исходный текст закона из документа..."
            />

            <div className={styles.importActions}>
              <button type="button" onClick={() => applyPlainTextImport()}>
                Преобразовать текст
              </button>
              <button type="button" onClick={() => fileInputRef.current?.click()}>
                Загрузить TXT
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,text/plain"
                onChange={handleFileImport}
                hidden
              />
            </div>
          </div>

          <div className={styles.formBlock}>
            <div className={styles.formTitle}>
              <b>Текст нормативного акта</b>
              <span>{articleCount} статей · {headingCount} глав в содержании</span>
            </div>

            <TextEditor
              mode="legal"
              value={contentHtml}
              onChange={setContentHtml}
              legalChapterColor={legalChapterColor}
              legalArticleColor={legalArticleColor}
              legalListColor={legalListColor}
              onLegalChapterColorChange={setLegalChapterColor}
              onLegalArticleColorChange={setLegalArticleColor}
              onLegalListColorChange={setLegalListColor}
            />

            <div className={styles.forumExportRow}>
              <div>
                <b>Перенос на форум</b>
                <span>
                  Копирует текущую версию документа вместе с цветами, курсивом,
                  выравниванием и списками — сохранять закон перед экспортом не обязательно.
                </span>
              </div>
              <LawForumExport
                title={title}
                subtitle={subtitle}
                number={number}
                version={version}
                contentHtml={contentHtml}
              />
            </div>
          </div>

          {message && (
            <div className={`${styles.message} ${messageType === "error" ? styles.messageError : ""}`}>
              {messageType === "error" ? "!" : "✓"} {message}
            </div>
          )}

          <div className={styles.saveBar}>
            <label>
              <input type="checkbox" checked={updateUpdatedAt} onChange={(event) => setUpdateUpdatedAt(event.target.checked)} />
              Обновить дату редакции
            </label>

            <div>
              <button type="button" onClick={saveDocument} disabled={loading || !isReady} className={styles.saveButton}>
                {loading ? "Сохранение..." : editingId ? "Сохранить изменения" : "Создать документ"}
              </button>
              {editingId && <button type="button" onClick={duplicateDocument} disabled={loading}>Создать копию</button>}
              {editingId && <button type="button" onClick={deleteDocument} disabled={loading} className={styles.deleteButton}>Удалить</button>}
            </div>
          </div>
        </section>

        <aside className={styles.preview}>
          <div className={styles.panelHead}>
            <div><span>03 / PREVIEW</span><h2>Предпросмотр</h2></div>
            <b>{articleCount}</b>
          </div>

          <article className={styles.previewCard}>
            <div className={styles.previewHeader}>
              <span>{icon || "§"}</span>
              <div><small>{category || "Категория"}</small><h3>{title || "Название документа"}</h3></div>
            </div>
            {subtitle && <p>{subtitle}</p>}
            <div className={styles.previewMeta}>
              <span>№ {number || "—"}</span>
              <span>Редакция {version || "1.0"}</span>
            </div>
          </article>

          <div className={styles.previewContent}>
            <LegalContent html={contentHtml} compact />
          </div>

          <div className={styles.previewFoot}>
            <span>Последнее сохранение</span>
            <b>{formatDate(updatedAt)}</b>
          </div>
        </aside>
      </section>
    </main>
  );
}
