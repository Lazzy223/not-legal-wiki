"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "./startguide.module.css";

const SERVER_HOST = "s1.notlegal-rp.ru";
const SERVER_PORT = "22005";
const SERVER_DISPLAY_IP = "http://s1.notlegal-rp.ru";
const SERVER_COPY_VALUE = `${SERVER_HOST}:${SERVER_PORT}`;

export default function StartGuide() {
  const [copied, setCopied] = useState(false);

  async function copyServerAddress() {
    try {
      await navigator.clipboard.writeText(SERVER_COPY_VALUE);
      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 1800);
    } catch {
      setCopied(false);
      alert(`Скопируй вручную: ${SERVER_COPY_VALUE}`);
    }
  }

  return (
    <section className={styles.section}>
      <div className={styles.heading}>
        <b>03</b>
        <span>МАРШРУТ НОВИЧКА</span>
      </div>

      <div className={styles.heroBox}>
        <div className={styles.heroText}>
          <span className={styles.badge}>START GUIDE</span>

          <h2>
            Как начать играть <br />
            <span>на Not Legal RP</span>
          </h2>

          <p>
            Чтобы зайти на сервер, тебе понадобится лицензионная GTA V,
            установленный RAGE Multiplayer и адрес подключения к серверу.
            Ниже — быстрый маршрут в 3 шага без лишней воды.
          </p>
        </div>

        <div className={styles.serverCard}>
          <span>SERVER CONNECT</span>
          <b>NOT LEGAL RP</b>

          <div className={styles.serverLine}>
            <small>IP</small>
            <p>{SERVER_DISPLAY_IP}</p>
          </div>

          <div className={styles.serverLine}>
            <small>PORT</small>
            <p>{SERVER_PORT}</p>
          </div>
        </div>
      </div>

      <div className={styles.steps}>
        <article className={styles.stepCard}>
          <div className={styles.stepNumber}>01</div>

          <div className={styles.icon}>🎮</div>

          <h3>Купить и скачать лицензионную GTA V</h3>

          <p>
            Для игры на RAGE MP нужна лицензионная версия Grand Theft Auto V.
            После покупки полностью установи игру и запусти обычную GTA V хотя
            бы один раз, чтобы все файлы корректно создались.
          </p>

          <ul>
            <li>Подойдёт версия Rockstar Games Launcher, Steam или Epic Games.</li>
            <li>Игра должна быть полностью скачана и обновлена.</li>
            <li>Перед запуском RAGE MP желательно один раз открыть GTA V.</li>
          </ul>

          <Link
            href="https://store.rockstargames.com/game/buy-gta-v"
            target="_blank"
            rel="noreferrer"
            className={styles.button}
          >
            Купить GTA V →
          </Link>
        </article>

        <article className={styles.stepCard}>
          <div className={styles.stepNumber}>02</div>

          <div className={styles.icon}>⚡</div>

          <h3>Скачать лаунчер RAGE MP</h3>

          <p>
            RAGE Multiplayer — это отдельный клиент для подключения к RP-серверам
            GTA V. Скачай лаунчер с официального сайта, установи его и укажи
            путь к GTA V, если программа попросит.
          </p>

          <ul>
            <li>Скачивай RAGE MP только с официального сайта.</li>
            <li>Если появляются ошибки, попробуй запуск от администратора.</li>
            <li>Убедись, что лаунчер видит установленную GTA V.</li>
          </ul>

          <Link
            href="https://rage.mp/"
            target="_blank"
            rel="noreferrer"
            className={styles.button}
          >
            Скачать RAGE MP →
          </Link>
        </article>

        <article className={styles.stepCard}>
          <div className={styles.stepNumber}>03</div>

          <div className={styles.icon}>🌐</div>

          <h3>Подключиться к серверу</h3>

          <p>
            Открой RAGE Multiplayer, выбери прямое подключение или поиск сервера
            и используй данные Not Legal RP. Для подключения в лаунчере обычно
            нужен адрес без <b>http://</b>.
          </p>

          <div className={styles.connectBox}>
            <div>
              <span>IP на сайте</span>
              <b>{SERVER_DISPLAY_IP}</b>
            </div>

            <div>
              <span>Адрес для RAGE MP</span>
              <b>{SERVER_HOST}</b>
            </div>

            <div>
              <span>Port</span>
              <b>{SERVER_PORT}</b>
            </div>
          </div>

          <button onClick={copyServerAddress} className={styles.button}>
            {copied ? "IP скопирован ✓" : "Скопировать IP"}
          </button>
        </article>
      </div>
    </section>
  );
}