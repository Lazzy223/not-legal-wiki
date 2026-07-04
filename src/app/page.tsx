import Image from "next/image";
import Link from "next/link";
import SecretAuth from "@/components/secret-auth";
import StartGuideModal from "@/components/start-guide-modal";
import LegalStart from "@/components/legal-start";
import HomeAdminButton from "@/components/home-admin-button";
import styles from "./home.module.css";

type SocialIconName = "vk" | "telegram" | "discord" | "youtube";

const socialLinks: Array<{
  title: string;
  text: string;
  href: string;
  icon: SocialIconName;
  className: string;
}> = [
  {
    title: "Группа ВКонтакте",
    text: "Новости проекта, публикации и важные объявления.",
    href: "https://vk.com/notlegal_rp",
    icon: "vk",
    className: styles.vkCard,
  },
  {
    title: "Telegram-канал",
    text: "Быстрые новости, события и уведомления проекта.",
    href: "https://t.me/notlegalrp",
    icon: "telegram",
    className: styles.telegramCard,
  },
  {
    title: "Discord-сервер",
    text: "Общение с игроками, поддержка и жизнь сообщества.",
    href: "https://discord.com/invite/notlegal",
    icon: "discord",
    className: styles.discordCard,
  },
  {
    title: "YouTube-канал",
    text: "Видео, демонстрации обновлений и материалы проекта.",
    href: "https://www.youtube.com/@notlegal5rp",
    icon: "youtube",
    className: styles.youtubeCard,
  },
];

function SocialIcon({ name }: { name: SocialIconName }) {
  if (name === "vk") {
    return (
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path d="M7.2 12.5h7.3c.4 0 .8.3.9.7 1.8 6.2 4.1 9.2 6.9 9.8.8.2 1.1-.2 1.1-1.2V13.1c0-.4.3-.7.7-.7h6.8c.4 0 .7.3.7.7v6.1c0 1 .4 1.3 1.1.8 2.7-1.8 4.9-4.9 6.5-7 .2-.3.6-.5.9-.5h7.4c1.1 0 1.5.6.9 1.5-1.8 2.8-3.8 5.5-6.3 8-1 .9-1 1.4 0 2.3 2.7 2.5 5.4 5.1 7.4 8.4.5.8.1 1.5-.9 1.5h-7.2c-.5 0-.9-.2-1.2-.6-1.7-2.4-3.6-4.6-5.8-6.5-.7-.6-1.2-.3-1.2.6v5.7c0 .5-.4.9-.9.9h-3.5C13.9 34.2 8.8 27.7 6.3 14c-.2-.8.2-1.5.9-1.5Z" />
      </svg>
    );
  }

  if (name === "telegram") {
    return (
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path d="M40.8 8.1 6.9 21.2c-2.3.9-2.3 2.2-.4 2.8l8.7 2.7 3.3 10.1c.4 1.2.2 1.7 1.5 1.7 1 0 1.5-.5 2-1l4.2-4.1 8.8 6.5c1.6.9 2.8.4 3.2-1.5L44 11c.6-2.5-1-3.7-3.2-2.9ZM18.7 26.1l16.9-10.7c.8-.5 1.6-.2 1 .4L22.7 28.3l-.5 5.6-3.5-7.8Z" />
      </svg>
    );
  }

  if (name === "discord") {
    return (
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path d="M38.4 10.1A35 35 0 0 0 30 7.5l-1.1 2.3a31 31 0 0 0-9.8 0L18 7.5a35 35 0 0 0-8.4 2.6C4.3 17.9 2.9 25.5 3.6 33a34 34 0 0 0 10.3 5.2l2.5-3.4a22 22 0 0 1-3.9-1.9l1-.8c7.5 3.4 15.6 3.4 23 0l1 .8a25 25 0 0 1-3.9 1.9l2.5 3.4A34 34 0 0 0 46.4 33c.9-8.7-1.5-16.2-8-22.9ZM17.4 29.1c-2.3 0-4.1-2.1-4.1-4.7s1.8-4.7 4.1-4.7 4.2 2.1 4.1 4.7c0 2.6-1.8 4.7-4.1 4.7Zm13.2 0c-2.3 0-4.1-2.1-4.1-4.7s1.8-4.7 4.1-4.7 4.2 2.1 4.1 4.7c0 2.6-1.8 4.7-4.1 4.7Z" />
      </svg>
    );
  }

  if (name === "youtube") {
    return (
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path d="M44.6 15.2a5.6 5.6 0 0 0-4-4C37 10.2 24 10.2 24 10.2s-13 0-16.6 1a5.6 5.6 0 0 0-4 4C2.4 18.8 2.4 24 2.4 24s0 5.2 1 8.8a5.6 5.6 0 0 0 4 4C11 37.8 24 37.8 24 37.8s13 0 16.6-1a5.6 5.6 0 0 0 4-4c1-3.6 1-8.8 1-8.8s0-5.2-1-8.8ZM19.7 30V18l10.4 6-10.4 6Z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M7 7h34v27H22.6L14 41.2V34H7V7Zm5 5v17h7v5.4l5.5-5.4H36V12H12Zm4 4h16v4H16v-4Zm0 7h12v4H16v-4Z" />
    </svg>
  );
}

export default function HomePage() {
  return (
    <main className={styles.page}>
      <SecretAuth />
      <StartGuideModal />

      <header className={styles.header}>
        <Link href="/" className={styles.logo} aria-label="Not Legal RP">
          <span>NOT LEGAL</span>
          <b>RP</b>
        </Link>

        <nav className={styles.headerCenter} aria-label="Навигация по главной странице">
          <a href="#about">О проекте</a>
          <button
            type="button"
            className={styles.headerStartButton}
            data-start-guide-trigger
          >
            Начать играть
          </button>
          <a href="#community">Соцсети</a>
        </nav>

        <div className={styles.headerRight} aria-label="Разделы проекта">
          <Link href="/donate" className={styles.headerDonateButton}>
            Пополнить
          </Link>
          <Link href="/wiki/rules">Правила</Link>
          <Link href="/wiki">Wiki</Link>
          <HomeAdminButton className={styles.headerAdminButton}>
            Админ-панель
          </HomeAdminButton>
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroOverlay} />

        <div className={styles.heroContent}>
          <div className={styles.heroText}>
            <span className={styles.heroEyebrow}>RAGE MULTIPLAYER PROJECT</span>
            <h1>
              Твоя история
              <br />
              начинается здесь
            </h1>

            <p>
              Современный Role Play проект с живой экономикой, организациями,
              работами и собственным миром. Создай персонажа и выбери свой путь
              в <span>Not Legal RP</span>.
            </p>

            <div className={styles.actions}>
              <button type="button" className={styles.primaryButton} data-start-guide-trigger>
                Начать играть
                <span>→</span>
              </button>

              <Link href="/wiki" className={styles.secondaryButton}>
                Открыть Wiki
              </Link>
            </div>
          </div>
        </div>

        <Link href="/wiki/rules" className={styles.rulesCharacter} aria-label="Правила проекта">
          <span className={`${styles.dangerMark} ${styles.dangerOne}`}>!</span>
          <span className={`${styles.dangerMark} ${styles.dangerTwo}`}>!</span>
          <span className={`${styles.dangerMark} ${styles.dangerThree}`}>!</span>
          <span className={`${styles.dangerMark} ${styles.dangerFour}`}>!</span>

          <img
            src="/rules-character.png"
            alt=""
            className={styles.characterBase}
          />
          <img
            src="/rules-character-hover.png"
            alt=""
            className={styles.characterHover}
          />
        </Link>
      </section>

      <LegalStart />

      <section className={styles.aboutSection} id="about">
        <div className={styles.aboutCopy}>
          <span className={styles.sectionEyebrow}>NOT LEGAL RP</span>
          <h2>
            О нашем <em>проекте</em>
          </h2>
          <p>
            Not Legal RP — это место, где игрок сам определяет направление своей
            истории. Развивайте персонажа, стройте карьеру, открывайте бизнес,
            вступайте в организацию или создавайте собственное окружение.
          </p>
          <p>
            Мы делаем упор на понятные игровые механики, удобную Wiki,
            регулярные обновления и единое пространство для общения игроков.
          </p>

          <div className={styles.aboutFacts}>
            <div>
              <strong>24/7</strong>
              <span>доступ к проекту</span>
            </div>
            <div>
              <strong>RAGE MP</strong>
              <span>платформа сервера</span>
            </div>
            <div>
              <strong>RU</strong>
              <span>русскоязычное RP</span>
            </div>
          </div>

          <div className={styles.aboutActions}>
            <button type="button" data-start-guide-trigger>
              Начать играть
            </button>
            <a href="https://forum.notlegal-rp.ru/" target="_blank" rel="noreferrer">
              Перейти на форум <span>↗</span>
            </a>
          </div>
        </div>

        <div className={styles.showcaseGrid} aria-label="Галерея проекта">
          <figure className={styles.showcaseImage}>
            <Image
              src="/info111.png"
              alt="Игровой мир Not Legal RP"
              fill
              sizes="(max-width: 760px) 100vw, 34vw"
              className={styles.showcasePhoto}
            />
          </figure>

          <figure className={styles.showcaseImage}>
            <Image
              src="/info222.png"
              alt="Игровой процесс Not Legal RP"
              fill
              sizes="(max-width: 760px) 100vw, 34vw"
              className={styles.showcasePhoto}
            />
          </figure>

          <figure className={styles.showcaseImage}>
            <Image
              src="/info333.png"
              alt="Транспорт Not Legal RP"
              fill
              sizes="(max-width: 760px) 100vw, 34vw"
              className={styles.showcasePhoto}
            />
          </figure>

          <figure className={styles.showcaseImage}>
            <Image
              src="/444.png"
              alt="Интерьер Not Legal RP"
              fill
              sizes="(max-width: 760px) 100vw, 34vw"
              className={styles.showcasePhoto}
            />
          </figure>
        </div>
      </section>

      <section className={styles.socialSection} id="community">
        <div className={styles.socialBackdrop} />
        <div className={styles.socialInner}>
          <div className={styles.socialHeading}>
            <span className={styles.sectionEyebrow}>ОФИЦИАЛЬНЫЕ ПЛОЩАДКИ</span>
            <h2>Наши соцсети</h2>
            <p>
              Следите за новостями, участвуйте в жизни проекта и получайте
              важные объявления только из официальных источников.
            </p>
          </div>

          <div className={styles.socialGrid}>
            {socialLinks.map((item) => (
              <a
                href={item.href}
                target="_blank"
                rel="noreferrer"
                className={`${styles.socialCard} ${item.className}`}
                key={item.title}
              >
                <span className={styles.socialIcon}>
                  <SocialIcon name={item.icon} />
                </span>
                <span className={styles.socialCardContent}>
                  <strong>{item.title}</strong>
                  <small>{item.text}</small>
                </span>
                <span className={styles.socialArrow}>↗</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <Link href="/" className={styles.footerLogo}>
              <span>NOT LEGAL</span>
              <b>RP</b>
            </Link>
            <p>
              Role Play проект на платформе RAGE Multiplayer.
              <br />
              Создай собственную историю.
            </p>
          </div>

          <div className={styles.footerColumns}>
            <div className={styles.footerColumn}>
              <h3>Проект</h3>
              <button type="button" data-start-guide-trigger>
                Начать игру
              </button>
              <Link href="/wiki">Wiki</Link>
              <Link href="/wiki/changelog">Обновления</Link>
              <Link href="/wiki/rules">Правила</Link>
            </div>

            <div className={styles.footerColumn}>
              <h3>Сообщество</h3>
              <a href="https://forum.notlegal-rp.ru/" target="_blank" rel="noreferrer">
                Форум
              </a>
              <a href="https://discord.com/invite/notlegal" target="_blank" rel="noreferrer">
                Discord
              </a>
              <a href="https://t.me/notlegalrp" target="_blank" rel="noreferrer">
                Telegram
              </a>
              <a href="https://vk.com/notlegal_rp" target="_blank" rel="noreferrer">
                ВКонтакте
              </a>
              <a href="https://www.youtube.com/@notlegal5rp" target="_blank" rel="noreferrer">
                YouTube
              </a>
            </div>

            <div className={styles.footerColumn}>
              <h3>Документы</h3>
              <Link href="/wiki/user-agreement">Пользовательское соглашение</Link>
              <Link href="/wiki/privacy">Политика конфиденциальности</Link>
              <Link href="/wiki/payment-rules">Условия использования</Link>
            </div>
          </div>
        </div>

        <div className={styles.footerBottom}>
          <span>© 2026 Not Legal RP</span>
          <span className={styles.rockstarDisclaimer}>
            Не является аффилированным продуктом Rockstar Games.
          </span>
        </div>
      </footer>
    </main>
  );
}
