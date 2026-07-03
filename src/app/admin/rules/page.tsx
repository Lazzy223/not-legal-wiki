"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import TextEditor from "@/components/text-editor";
import WikiContent from "@/components/wiki-content";
import {
  getRuleItemCount,
  stripRuleHtml,
} from "@/lib/rules-content";
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

function formatDate(value?: string) {
  if (!value) return "Ещё не сохранялся";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function nextSectionOrder(sections: RuleSection[]) {
  if (sections.length === 0) return 10;
  return Math.max(...sections.map((section) => section.sortOrder || 0)) + 10;
}

export default function AdminRulesPage() {
  const [sections, setSections] = useState<RuleSection[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [listSearch, setListSearch] = useState("");

  const [number, setNumber] = useState("01");
  const [icon, setIcon] = useState("📜");
  const [title, setTitle] = useState("Новый раздел правил");
  const [short, setShort] = useState("");
  const [description, setDescription] = useState("");
  const [sortOrder, setSortOrder] = useState(10);
  const [version, setVersion] = useState("1.0");
  const [updatedAt, setUpdatedAt] = useState("");
  const [contentHtml, setContentHtml] = useState(defaultRulesContent());

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">(
    "success"
  );
  const [loading, setLoading] = useState(false);
  const [sectionsLoading, setSectionsLoading] = useState(true);

  const sortedSections = useMemo(() => {
    return [...sections].sort((first, second) => {
      if (first.sortOrder !== second.sortOrder) {
        return first.sortOrder - second.sortOrder;
      }

      return first.number.localeCompare(second.number, "ru", {
        numeric: true,
      });
    });
  }, [sections]);

  const filteredSections = useMemo(() => {
    const query = listSearch.trim().toLowerCase();

    if (!query) {
      return sortedSections;
    }

    return sortedSections.filter((section) => {
      const haystack = [
        section.number,
        section.title,
        section.short,
        section.description,
        section.version,
        stripRuleHtml(section.contentHtml || ""),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [listSearch, sortedSections]);

  const totalRules = useMemo(() => {
    return sections.reduce(
      (total, section) => total + getRuleItemCount(section),
      0
    );
  }, [sections]);

  const latestUpdatedAt = useMemo(() => {
    return sections.reduce((latest, section) => {
      if (!section.updatedAt) return latest;
      if (!latest || section.updatedAt > latest) return section.updatedAt;
      return latest;
    }, "");
  }, [sections]);

  const currentRuleCount = useMemo(() => {
    return getRuleItemCount({ contentHtml, blocks: [] });
  }, [contentHtml]);

  const isFormReady = Boolean(
    title.trim() && contentHtml.trim() && contentHtml !== "<p></p>"
  );

  async function loadSections(preferredId?: string | null) {
    setSectionsLoading(true);

    try {
      const response = await fetch("/api/admin/rules", {
        cache: "no-store",
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || "Не удалось загрузить правила");
      }

      const loadedSections = Array.isArray(data?.sections)
        ? (data.sections as RuleSection[])
        : [];

      setSections(loadedSections);

      const selectedId = preferredId || editingId;
      const selectedSection = loadedSections.find(
        (section) => section.id === selectedId
      );

      if (selectedSection) {
        fillForm(selectedSection, false);
      }
    } catch (error) {
      setMessageType("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Не удалось загрузить правила"
      );
    } finally {
      setSectionsLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    fetch("/api/admin/rules", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(data?.message || "Не удалось загрузить правила");
        }

        return Array.isArray(data?.sections)
          ? (data.sections as RuleSection[])
          : [];
      })
      .then((loadedSections) => {
        if (!cancelled) {
          setSections(loadedSections);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setMessageType("error");
          setMessage(
            error instanceof Error
              ? error.message
              : "Не удалось загрузить правила"
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setSectionsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function resetForm() {
    setEditingId(null);
    setNumber(String(sections.length + 1).padStart(2, "0"));
    setIcon("📜");
    setTitle("Новый раздел правил");
    setShort("");
    setDescription("");
    setSortOrder(nextSectionOrder(sections));
    setVersion("1.0");
    setUpdatedAt("");
    setContentHtml(defaultRulesContent());
    setMessage("");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function fillForm(section: RuleSection, showMessage = true) {
    setEditingId(section.id);
    setNumber(section.number);
    setIcon(section.icon);
    setTitle(section.title);
    setShort(section.short);
    setDescription(section.description);
    setSortOrder(section.sortOrder || 0);
    setVersion(section.version || "1.0");
    setUpdatedAt(section.updatedAt || "");
    setContentHtml(section.contentHtml || defaultRulesContent());

    if (showMessage) {
      setMessageType("success");
      setMessage(`Открыт раздел: ${section.title}`);
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function duplicateSection() {
    setEditingId(null);
    setNumber(String(sections.length + 1).padStart(2, "0"));
    setTitle(`${title.trim() || "Раздел правил"} — копия`);
    setSortOrder(nextSectionOrder(sections));
    setUpdatedAt("");
    setMessageType("success");
    setMessage("Создана копия в редакторе. Нажми «Создать раздел». ");
  }

  async function saveSection() {
    if (!isFormReady) {
      setMessageType("error");
      setMessage("Укажи название и добавь текст правил");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/rules", {
        method: editingId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: editingId,
          number,
          icon,
          title: title.trim(),
          short: short.trim(),
          description: description.trim(),
          sortOrder,
          version: version.trim(),
          contentHtml,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || "Ошибка сохранения");
      }

      const savedSection = data?.section as RuleSection | undefined;
      const savedId = savedSection?.id || editingId;

      if (savedSection) {
        setEditingId(savedSection.id);
        setUpdatedAt(savedSection.updatedAt || "");
      }

      await loadSections(savedId);
      setMessageType("success");
      setMessage(editingId ? "Изменения сохранены" : "Раздел создан");
    } catch (error) {
      setMessageType("error");
      setMessage(error instanceof Error ? error.message : "Ошибка сохранения");
    } finally {
      setLoading(false);
    }
  }

  async function deleteSection() {
    if (!editingId) return;

    const accepted = window.confirm(
      `Удалить раздел «${title}»? Это действие нельзя отменить.`
    );

    if (!accepted) return;

    setLoading(true);

    try {
      const response = await fetch("/api/admin/rules", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: editingId }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || "Ошибка удаления");
      }

      const nextSections = sections.filter((section) => section.id !== editingId);
      setSections(nextSections);
      setEditingId(null);
      setNumber(String(nextSections.length + 1).padStart(2, "0"));
      setIcon("📜");
      setTitle("Новый раздел правил");
      setShort("");
      setDescription("");
      setSortOrder(nextSectionOrder(nextSections));
      setVersion("1.0");
      setUpdatedAt("");
      setContentHtml(defaultRulesContent());
      setMessageType("success");
      setMessage("Раздел удалён");
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
        <div className={styles.headerText}>
          <span>RULES MANAGER</span>
          <h1>Управление правилами</h1>
          <p>
            Создавай разделы, редактируй содержание и сразу проверяй, как они
            будут выглядеть на публичной странице.
          </p>
        </div>

        <div className={styles.headerActions}>
          <Link href="/wiki/rules" target="_blank" rel="noreferrer" className={styles.openButton}>
            Открыть страницу
            <span>↗</span>
          </Link>

          <Link href="/admin" className={styles.backButton}>
            ← Панель
          </Link>
        </div>
      </header>

      <section className={styles.statsGrid}>
        <article className={styles.statCard}>
          <div className={styles.statIcon}>▣</div>
          <div>
            <span>Разделов</span>
            <strong>{sections.length}</strong>
          </div>
          <small>на странице правил</small>
        </article>

        <article className={styles.statCard}>
          <div className={styles.statIcon}>≡</div>
          <div>
            <span>Пунктов</span>
            <strong>{totalRules}</strong>
          </div>
          <small>во всех разделах</small>
        </article>

        <article className={styles.statCard}>
          <div className={styles.statIcon}>◷</div>
          <div>
            <span>Последнее изменение</span>
            <strong className={styles.dateValue}>
              {formatDate(latestUpdatedAt)}
            </strong>
          </div>
          <small>обновляется автоматически</small>
        </article>
      </section>

      <section className={styles.workspace}>
        <aside className={styles.catalogPanel}>
          <div className={styles.panelHeading}>
            <div>
              <span>01 / CATALOG</span>
              <h2>Разделы правил</h2>
            </div>
            <b>{sections.length}</b>
          </div>

          <button type="button" onClick={resetForm} className={styles.newButton}>
            <span>＋</span>
            Новый раздел
          </button>

          <label className={styles.catalogSearch}>
            <span>⌕</span>
            <input
              value={listSearch}
              onChange={(event) => setListSearch(event.target.value)}
              placeholder="Найти раздел..."
            />
          </label>

          <div className={styles.sectionsList}>
            {sectionsLoading && (
              <div className={styles.emptyState}>Загрузка разделов...</div>
            )}

            {!sectionsLoading && filteredSections.length === 0 && (
              <div className={styles.emptyState}>
                {listSearch
                  ? "По запросу ничего не найдено."
                  : "Разделов пока нет."}
              </div>
            )}

            {filteredSections.map((section) => (
              <button
                type="button"
                key={section.id}
                onClick={() => fillForm(section)}
                className={`${styles.sectionButton} ${
                  editingId === section.id ? styles.sectionButtonActive : ""
                }`}
              >
                <div className={styles.sectionIcon}>{section.icon}</div>

                <div className={styles.sectionText}>
                  <span>
                    {section.number} · v{section.version || "1.0"}
                  </span>
                  <strong>{section.title}</strong>
                  <small>{section.short || "Без краткого описания"}</small>
                </div>

                <div className={styles.sectionMeta}>
                  <b>{getRuleItemCount(section)}</b>
                  <small>пунктов</small>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <section className={styles.editorPanel}>
          <div className={styles.editorHeader}>
            <div>
              <span>02 / EDITOR</span>
              <h2>{editingId ? "Редактирование раздела" : "Новый раздел"}</h2>
            </div>

            <div className={styles.editorStatus}>
              <span className={editingId ? styles.statusLive : styles.statusNew} />
              {editingId ? "Сохранён в базе" : "Новый материал"}
            </div>
          </div>

          <div className={styles.formSection}>
            <div className={styles.formSectionHead}>
              <span>Основная информация</span>
              <small>Название, описание и порядок вывода</small>
            </div>

            <div className={styles.compactGrid}>
              <label>
                <span>Номер</span>
                <input
                  value={number}
                  onChange={(event) => setNumber(event.target.value)}
                  placeholder="01"
                />
              </label>

              <label>
                <span>Иконка</span>
                <input
                  value={icon}
                  onChange={(event) => setIcon(event.target.value)}
                  placeholder="📜"
                />
              </label>

              <label>
                <span>Версия</span>
                <input
                  value={version}
                  onChange={(event) => setVersion(event.target.value)}
                  placeholder="1.0"
                />
              </label>

              <label>
                <span>Порядок</span>
                <input
                  value={sortOrder}
                  onChange={(event) => setSortOrder(Number(event.target.value))}
                  type="number"
                  placeholder="10"
                />
              </label>
            </div>

            <label className={styles.field}>
              <span>Название раздела</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Правила проекта"
              />
            </label>

            <label className={styles.field}>
              <span>Краткая подпись</span>
              <input
                value={short}
                onChange={(event) => setShort(event.target.value)}
                placeholder="Показывается в каталоге разделов"
              />
            </label>

            <label className={styles.field}>
              <span>Описание раздела</span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Коротко объясни, какие правила находятся внутри раздела"
              />
            </label>
          </div>

          <div className={styles.formSection}>
            <div className={styles.formSectionHead}>
              <span>Содержание правил</span>
              <small>{currentRuleCount} пунктов распознано редактором</small>
            </div>

            <TextEditor value={contentHtml} onChange={setContentHtml} />

            <div className={styles.editorHint}>
              <b>Совет:</b> названия групп оформляй через «Заголовок», а сами
              правила — через маркированный или нумерованный список. Эти
              заголовки автоматически появятся в навигации публичной страницы.
            </div>
          </div>

          {message && (
            <div
              className={`${styles.message} ${
                messageType === "error" ? styles.messageError : ""
              }`}
            >
              <span>{messageType === "error" ? "!" : "✓"}</span>
              {message}
            </div>
          )}

          <div className={styles.formActions}>
            <button
              type="button"
              onClick={saveSection}
              disabled={loading || !isFormReady}
              className={styles.saveButton}
            >
              {loading
                ? "Сохранение..."
                : editingId
                  ? "Сохранить изменения"
                  : "Создать раздел"}
            </button>

            {editingId && (
              <button
                type="button"
                onClick={duplicateSection}
                disabled={loading}
                className={styles.secondaryButton}
              >
                Создать копию
              </button>
            )}

            {editingId && (
              <button
                type="button"
                onClick={deleteSection}
                disabled={loading}
                className={styles.deleteButton}
              >
                Удалить
              </button>
            )}
          </div>
        </section>

        <aside className={styles.previewPanel}>
          <div className={styles.panelHeading}>
            <div>
              <span>03 / PREVIEW</span>
              <h2>Предпросмотр</h2>
            </div>
            <b>{currentRuleCount}</b>
          </div>

          <article className={styles.previewCard}>
            <div className={styles.previewCover}>
              <span>{number || "01"}</span>
              <b>{icon || "📜"}</b>
            </div>

            <div className={styles.previewBody}>
              <div className={styles.previewVersion}>Версия {version || "1.0"}</div>
              <h3>{title.trim() || "Название раздела"}</h3>
              <p>
                {description.trim() ||
                  short.trim() ||
                  "Описание раздела появится здесь."}
              </p>

              <div className={styles.previewMeta}>
                <div>
                  <span>Пунктов</span>
                  <b>{currentRuleCount}</b>
                </div>
                <div>
                  <span>Обновлено</span>
                  <b>{formatDate(updatedAt)}</b>
                </div>
              </div>
            </div>
          </article>

          <div className={styles.previewContent}>
            <WikiContent html={contentHtml} />
          </div>

          <div className={styles.previewNote}>
            Это компактный предпросмотр. Финальная страница дополнительно
            добавит меню разделов, поиск и навигацию по заголовкам.
          </div>
        </aside>
      </section>
    </main>
  );
}
