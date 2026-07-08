"use client";

import { useEffect, useMemo, useState } from "react";
import {
  copyPlainLawToClipboard,
  copyRichLawToClipboard,
  downloadLawAsHtml,
  downloadLawAsText,
  type LawForumExportInput,
} from "@/lib/law-forum-export";
import styles from "./law-forum-export.module.css";

type LawForumExportProps = Omit<LawForumExportInput, "includeHeader"> & {
  buttonLabel?: string;
};

export default function LawForumExport({
  title,
  subtitle,
  number,
  version,
  contentHtml,
  buttonLabel = "Перенести на форум",
}: LawForumExportProps) {
  const [open, setOpen] = useState(false);
  const [includeHeader, setIncludeHeader] = useState(false);
  const [status, setStatus] = useState("");
  const [statusError, setStatusError] = useState(false);

  const exportInput = useMemo<LawForumExportInput>(
    () => ({
      title,
      subtitle,
      number,
      version,
      contentHtml,
      includeHeader,
    }),
    [contentHtml, includeHeader, number, subtitle, title, version]
  );

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function showStatus(message: string, error = false) {
    setStatus(message);
    setStatusError(error);
    window.setTimeout(() => setStatus(""), 2600);
  }

  async function copyForForum() {
    try {
      await copyRichLawToClipboard(exportInput);
      showStatus("Форматированный текст скопирован. Вставь его в редактор форума через Ctrl + V.");
    } catch (error) {
      showStatus(
        error instanceof Error
          ? error.message
          : "Не удалось скопировать форматированный текст",
        true
      );
    }
  }

  async function copyPlain() {
    try {
      await copyPlainLawToClipboard(exportInput);
      showStatus("Обычный текст скопирован без оформления.");
    } catch {
      showStatus("Не удалось скопировать обычный текст", true);
    }
  }

  return (
    <div className={styles.wrapper}>
      <button
        type="button"
        className={styles.openButton}
        onClick={() => {
          setStatus("");
          setOpen(true);
        }}
      >
        <span>↗</span>
        {buttonLabel}
      </button>

      {open && (
        <>
          <button
            type="button"
            className={styles.backdrop}
            onClick={() => setOpen(false)}
            aria-label="Закрыть экспорт для форума"
          />

          <section
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-label="Перенос закона на форум"
          >
            <header className={styles.modalHead}>
              <div>
                <span>FORUM EXPORT</span>
                <h2>Перенос на форум Not Legal RP</h2>
              </div>
              <button
                type="button"
                className={styles.closeButton}
                onClick={() => setOpen(false)}
                aria-label="Закрыть"
              >
                ×
              </button>
            </header>

            <div className={styles.body}>
              <p className={styles.notice}>
                <b>Основной способ:</b> кнопка ниже копирует не простой текст, а
                форматированный HTML. Сохраняются жирный и курсивный текст,
                цвета, размеры, выравнивание, ссылки и списки.
              </p>

              <label className={styles.option}>
                <input
                  type="checkbox"
                  checked={includeHeader}
                  onChange={(event) => setIncludeHeader(event.target.checked)}
                />
                <span>
                  <b>Добавить карточку документа в начало</b>
                  <small>
                    Название, подзаголовок, номер и редакция будут добавлены перед
                    основным текстом.
                  </small>
                </span>
              </label>

              <button
                type="button"
                className={styles.primaryAction}
                onClick={copyForForum}
              >
                Скопировать с оформлением
              </button>

              <div className={styles.actionGrid}>
                <button type="button" onClick={() => downloadLawAsHtml(exportInput)}>
                  Скачать HTML
                </button>
                <button type="button" onClick={() => downloadLawAsText(exportInput)}>
                  Скачать TXT без оформления
                </button>
                <button type="button" onClick={copyPlain}>
                  Копировать обычный текст
                </button>
                <a
                  href="https://forum.notlegal-rp.ru/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Открыть форум ↗
                </a>
              </div>

              <p
                className={`${styles.status} ${
                  statusError ? styles.statusError : ""
                }`}
                aria-live="polite"
              >
                {status}
              </p>

              <ol className={styles.steps}>
                <li>Нажми <strong>«Скопировать с оформлением»</strong>.</li>
                <li>Открой создание или редактирование темы на форуме.</li>
                <li>Поставь курсор в визуальный редактор и нажми <strong>Ctrl + V</strong>.</li>
                <li>Если редактор предложит сохранить оформление — выбери сохранение.</li>
              </ol>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
