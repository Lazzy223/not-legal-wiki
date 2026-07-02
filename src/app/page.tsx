import Link from "next/link";
import SecretAuth from "@/components/secret-auth";
import StartGuideModal from "@/components/start-guide-modal";
import LegalStart from "@/components/legal-start";
import styles from "./home.module.css";
import HomeAdminButton from "@/components/home-admin-button";

const mainLinks = [
  {
    title: "Wiki",
    desc: "Инструкции, гайды и полезная информация.",
    href: "/wiki",
    icon: "▰",
  },
  {
    title: "Dev Blog",
    desc: "Новости разработки, обновления и планы.",
    href: "/wiki/changelog",
    icon: "</>",
  },
  {
    title: "Правила",
    desc: "Правила сервера и проекта. Обязательно к ознакомлению.",
    href: "/wiki/rules",
    icon: "◈",
  },
  {
    title: "Начало игры",
    desc: "Пошаговое руководство для новых игроков.",
    href: "/wiki/start",
    icon: "⚑",
  },
];

const features = [
  {
    icon: "☷",
    title: "Активное сообщество",
    text: "Общайтесь на форуме, находите друзей и создавайте свои истории.",
  },
  {
    icon: "◇",
    title: "Стабильный проект",
    text: "Надёжные серверы, защита от читов и регулярные обновления.",
  },
  {
    icon: "▟",
    title: "Развитие вместе с вами",
    text: "Мы прислушиваемся к каждому игроку и делаем проект лучше.",
  },
];

export default function HomePage() {
  return (
    <main className={styles.page}>
      <SecretAuth />
      <StartGuideModal />

      <header className={styles.header}>
        <button type="button" className={styles.logo} >
          <div>
            <span>NOT LEGAL</span>
            <b>RP</b>
          </div>

        </button>

        <nav className={styles.nav}>
          <button type="button" className={styles.navButton}>
            Форум
          </button>

          <button type="button" className={styles.navDonateButton}>
            Пополнить
          </button>

          <Link href="/wiki">Wiki</Link>
          <Link href="/wiki/changelog">Dev Blog</Link>
          <Link href="/wiki/rules">Правила</Link>
          <HomeAdminButton>Админ-панель</HomeAdminButton>
        </nav>
      </header>

      <section className={styles.hero}>
  <div className={styles.heroOverlay} />

  <div className={styles.heroContent}>
    <div className={styles.heroText}>
      <h1>
        Твой портал <br />в мир RP
      </h1>

      <p>
        Быстрый доступ к Wiki, правилам, обновлениям и инструкциям. Всё,
        что нужно для старта в <span>Not Legal RP</span> — в одном месте.
      </p>

      <div className={styles.actions}>
        <button
  type="button"
  className={styles.primaryButton}
  data-start-guide-trigger
>
  Начать путь
  <span>→</span>
</button>

        <Link href="/wiki" className={styles.secondaryButton}>
          <span>▷</span>
          WIKI 
        </Link>
      </div>
    </div>
  </div>

  <Link href="/wiki/rules" className={styles.rulesCharacter}>
  <span className={`${styles.dangerMark} ${styles.dangerOne}`}>!</span>
  <span className={`${styles.dangerMark} ${styles.dangerTwo}`}>!</span>
  <span className={`${styles.dangerMark} ${styles.dangerThree}`}>!</span>
  <span className={`${styles.dangerMark} ${styles.dangerFour}`}>!</span>

  <img
    src="/rules-character.png"
    alt="Перейти к правилам проекта"
    className={styles.characterBase}
  />

  <img
    src="/rules-character-hover.png"
    alt="Перейти к правилам проекта"
    className={styles.characterHover}
  />

  <span className={styles.rulesCharacterText}></span>
</Link>
</section>

      <LegalStart />

      <section className={styles.quickSection}>
        <div className={styles.sectionTitleRed}>
          <span />
          <h2>БЫСТРЫЙ ДОСТУП</h2>
        </div>

        <div className={styles.linkGrid}>
          {mainLinks.map((item) => (
            <Link href={item.href} className={styles.linkCard} key={item.title}>
              <div className={styles.linkIcon}>{item.icon}</div>

              <div>
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
              </div>

              <strong>→</strong>
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.featuresSection}>
        <div className={styles.sectionTitleRed}>
          <span />
          <h2>ВОЗМОЖНОСТИ ПОРТАЛА</h2>
        </div>

        <div className={styles.featuresGrid}>
          {features.map((item) => (
            <article className={styles.featureCard} key={item.title}>
              <div className={styles.featureIcon}>{item.icon}</div>

              <div>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </div>
            </article>
          ))}
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
              Not Legal RP — это больше, чем игра.
              <br />
              Это твоя история.
            </p>
          </div>

          <div className={styles.footerColumns}>
            <div className={styles.footerColumn}>
              <h3>Игрокам</h3>
              <button type="button" data-start-guide-trigger>
  Начало игры
</button>
              <Link href="/wiki">Wiki</Link>
              <Link href="/wiki/changelog">Обновления</Link>
              <button type="button">Форум</button>
            </div>

            <div className={styles.footerColumn}>
              <h3>Документы</h3>
              <Link href="/wiki/rules">Правила сервера</Link>
              <Link href="/wiki/user-agreement">Лицензионное соглашение</Link>
              <Link href="/wiki/privacy">Политика конфиденциальности</Link>
              <Link href="/wiki/payment-rules">Условия использования</Link>
            </div>

            <div className={styles.footerColumn}>
              <h3>Контакты</h3>
              <p>
                Форум: <span>forum.notlegalrp.ru</span>
              </p>
              <p>
                Дискорд: <span>discord.gg/notlegalrp</span>
              </p>
              <p>
                Почта: <span>support@notlegalrp.ru</span>
              </p>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}