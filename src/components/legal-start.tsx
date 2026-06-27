"use client";

import { useState } from "react";
import styles from "@/app/home.module.css";

const SERVER_IP = "s1.notlegal-rp.ru:22005";

export default function LegalStart() {
  const [copied, setCopied] = useState(false);

  async function copyServerIp() {
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

  return (
    <section className={styles.legalStartSection}>
      <div className={styles.sectionTitleRed}>
        <span />
        <h2>ЛЕГАЛЬНОЕ НАЧАЛО ИГРЫ</h2>
      </div>

      <div className={styles.legalStartGrid}>
        <a
          href="https://www.rockstargames.com/gta-v"
          target="_blank"
          rel="noreferrer"
          className={styles.legalStartCard}
        >
          <div className={styles.cardBadge}>01</div>
          <div className={styles.cardIcon}>⌕</div>

          <div>
            <h3>Купить GTA V</h3>
            <p>Приобретите лицензионную копию Grand Theft Auto V.</p>
          </div>

          <strong>→</strong>
        </a>

        <a
          href="https://rage.mp/ru"
          target="_blank"
          rel="noreferrer"
          className={styles.legalStartCard}
        >
          <div className={styles.cardBadge}>02</div>
          <div className={styles.cardIcon}>A</div>

          <div>
            <h3>Скачать RAGE</h3>
            <p>Скачайте и установите RAGE Multiplayer.</p>
          </div>

          <strong>→</strong>
        </a>

        <button
          type="button"
          onClick={copyServerIp}
          className={styles.legalStartCard}
        >
          <div className={styles.cardBadge}>03</div>
          <div className={styles.cardIcon}>▦</div>

          <div>
            <h3>{copied ? "IP скопирован" : "Скопировать IP"}</h3>
            <p>
              {copied
                ? "IP сервера скопирован в буфер обмена."
                : `Скопируйте IP-адрес сервера: ${SERVER_IP}`}
            </p>
          </div>

          <strong>{copied ? "✓" : "→"}</strong>
        </button>
      </div>

      <button
  type="button"
  className={styles.fullGuideButton}
  data-start-guide-trigger
>
  Полная инструкция →
</button>
    </section>
  );
}