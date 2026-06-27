"use client";

import { useEffect, useState } from "react";
import styles from "./start-guide-modal.module.css";

const SERVER_IP = "s1.notlegal-rp.ru:22005";

export default function StartGuideModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    function handleOpen(event: MouseEvent) {
      const target = event.target as HTMLElement | null;

      if (!target) return;

      const trigger = target.closest("[data-start-guide-trigger]");

      if (!trigger) return;

      event.preventDefault();
      setIsOpen(true);
    }

    document.addEventListener("click", handleOpen);

    return () => {
      document.removeEventListener("click", handleOpen);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  async function copyIp() {
    try {
      await navigator.clipboard.writeText(SERVER_IP);
      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 1800);
    } catch {
      alert(`IP сервера: ${SERVER_IP}`);
    }
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div className={styles.overlay} onMouseDown={() => setIsOpen(false)}>
      <div
        className={styles.modal}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className={styles.closeButton}
        >
          ×
        </button>

        <div className={styles.head}>
          <span>START GUIDE</span>

          <h2>
            Начало <br />
            <b>игры</b>
          </h2>

          <p>
            Быстрая инструкция для нового игрока: купи GTA V, установи RAGE
            Multiplayer и подключись к серверу Not Legal RP.
          </p>
        </div>

        <div className={styles.steps}>
          <a
            href="https://www.rockstargames.com/gta-v"
            target="_blank"
            rel="noreferrer"
            className={styles.step}
          >
            <div className={styles.number}>01</div>

            <div>
              <h3>Купить GTA V</h3>
              <p>
                Перейди на официальный сайт Rockstar Games и приобрети
                лицензионную версию Grand Theft Auto V.
              </p>
            </div>

            <strong>→</strong>
          </a>

          <a
            href="https://rage.mp/ru"
            target="_blank"
            rel="noreferrer"
            className={styles.step}
          >
            <div className={styles.number}>02</div>

            <div>
              <h3>Скачать RAGE</h3>
              <p>
                Скачай официальный клиент RAGE Multiplayer и укажи путь к
                установленной GTA V.
              </p>
            </div>

            <strong>→</strong>
          </a>

          <button type="button" onClick={copyIp} className={styles.step}>
            <div className={styles.number}>03</div>

            <div>
              <h3>{copied ? "IP скопирован" : "Скопировать IP"}</h3>
              <p>
                {copied
                  ? "Теперь вставь IP в клиент RAGE Multiplayer."
                  : `IP сервера: ${SERVER_IP}`}
              </p>
            </div>

            <strong>{copied ? "✓" : "→"}</strong>
          </button>
        </div>
      </div>
    </div>
  );
}