"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoscowDate, formatMoscowTime } from "@/lib/moscow-time";
import styles from "./admin.module.css";

type AuthUser = {
  login?: string;
  username?: string;
  role?: string;
  roleName?: string;
  canOpenAdmin?: boolean;
  canManageUsers?: boolean;
};

type ChangelogPost = {
  id: string;
  title: string;
  publishedAt: string;
};

type RuleSection = {
  id: string;
  title: string;
  updatedAt?: string;
  updated?: string;
  lastUpdated?: string;
  modifiedAt?: string;
};

function formatDate(value?: string) {
  return formatMoscowDate(
    value,
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
    value || "Без даты"
  );
}

function getRuleUpdatedAt(section: RuleSection) {
  return (
    section.updatedAt ||
    section.updated ||
    section.lastUpdated ||
    section.modifiedAt ||
    ""
  );
}

export default function AdminPage() {
  const router = useRouter();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [posts, setPosts] = useState<ChangelogPost[]>([]);
  const [sections, setSections] = useState<RuleSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      setLoadError("");

      try {
        const meResponse = await fetch("/api/auth/me", {
          cache: "no-store",
        });

        const meData = await meResponse.json().catch(() => null);
        const currentUser = meData?.user || null;

        if (!meResponse.ok || !currentUser?.canOpenAdmin) {
          router.replace("/wiki");
          return;
        }

        setUser(currentUser);

        const [changelogResult, rulesResult] = await Promise.allSettled([
          fetch("/api/admin/changelog", { cache: "no-store" }),
          fetch("/api/wiki/rules", { cache: "no-store" }),
        ]);

        if (
          changelogResult.status === "fulfilled" &&
          changelogResult.value.ok
        ) {
          const data = await changelogResult.value.json().catch(() => null);
          setPosts(Array.isArray(data?.posts) ? data.posts : []);
        }

        if (rulesResult.status === "fulfilled" && rulesResult.value.ok) {
          const data = await rulesResult.value.json().catch(() => null);
          setSections(Array.isArray(data?.sections) ? data.sections : []);
        }
      } catch {
        setLoadError("Не удалось загрузить данные панели.");
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [router]);

  const latestPosts = useMemo(() => {
    return [...posts]
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
      .slice(0, 4);
  }, [posts]);

  const latestSections = useMemo(() => {
    return [...sections]
      .sort((a, b) =>
        getRuleUpdatedAt(b).localeCompare(getRuleUpdatedAt(a))
      )
      .slice(0, 4);
  }, [sections]);

  const adminName =
    user?.username?.trim() || user?.login?.trim() || "Администратор";

  const formattedTime = formatMoscowTime(now, {
    hour: "2-digit",
    minute: "2-digit",
  });

  const formattedDate = formatMoscowDate(now, {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  if (loading) {
    return (
      <main className={styles.loadingPage}>
        <div className={styles.loader} />
        <strong>Загрузка панели управления</strong>
        <span>Проверяем доступ и собираем данные...</span>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <section className={styles.workspace}>
        <header className={styles.topbar}>
          <div>
            <span className={styles.eyebrow}>ADMIN CONTROL CENTER</span>
            <h1>Панель управления</h1>
          </div>

          <div className={styles.topbarRight}>
            <div className={styles.timeCard}>
              <strong>{formattedTime} МСК</strong>
              <span>{formattedDate}</span>
            </div>

            <Link href="/" className={styles.siteButton}>
              Открыть сайт
              <span>↗</span>
            </Link>
          </div>
        </header>

        {loadError && <div className={styles.errorBanner}>{loadError}</div>}

        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <span>ДОБРО ПОЖАЛОВАТЬ</span>
            <h2>{adminName}</h2>
            <p>
              Управляй материалами проекта, обновлениями и правилами из
              единого центра.
            </p>

            <div className={styles.heroActions}>
              <Link href="/admin/changelog">
                Создать Patch Note
                <span>＋</span>
              </Link>

              <Link href="/admin/rules">
                Изменить правила
                <span>→</span>
              </Link>
            </div>
          </div>

          <div className={styles.heroStatus}>
            <span />
            <div>
              <strong>Система работает</strong>
              <small>Панель доступна</small>
            </div>
          </div>
        </section>

        <section className={styles.statsGrid}>
          <article className={styles.statCard}>
            <div className={styles.statIcon}>▤</div>
            <div>
              <span>Постов Dev Blog</span>
              <strong>{posts.length}</strong>
            </div>
            <Link href="/admin/changelog">Управлять →</Link>
          </article>

          <article className={styles.statCard}>
            <div className={styles.statIcon}>▣</div>
            <div>
              <span>Разделов правил</span>
              <strong>{sections.length}</strong>
            </div>
            <Link href="/admin/rules">Управлять →</Link>
          </article>

          <article className={styles.statCard}>
            <div className={styles.statIcon}>◎</div>
            <div>
              <span>Статус проекта</span>
              <strong className={styles.onlineValue}>Online</strong>
            </div>
            <Link href="/">Открыть сайт →</Link>
          </article>
        </section>

        <section className={styles.modulesGrid}>
          <Link href="/admin/changelog" className={styles.moduleCard}>
            <div className={styles.moduleTop}>
              <span className={styles.moduleIcon}>▤</span>
              <small>КОНТЕНТ</small>
            </div>

            <h3>Dev Blog</h3>
            <p>
              Создание, редактирование и удаление Patch Note и публикаций.
            </p>

            <div className={styles.moduleFooter}>
              <span>{posts.length} записей</span>
              <b>Открыть →</b>
            </div>
          </Link>

          <Link href="/admin/rules" className={styles.moduleCard}>
            <div className={styles.moduleTop}>
              <span className={styles.moduleIcon}>▣</span>
              <small>ПРАВИЛА</small>
            </div>

            <h3>Правила проекта</h3>
            <p>
              Разделы правил, описание, порядок отображения и содержимое.
            </p>

            <div className={styles.moduleFooter}>
              <span>{sections.length} разделов</span>
              <b>Открыть →</b>
            </div>
          </Link>

          <Link href="/wiki" className={styles.moduleCard}>
            <div className={styles.moduleTop}>
              <span className={styles.moduleIcon}>◇</span>
              <small>ПРОСМОТР</small>
            </div>

            <h3>Wiki проекта</h3>
            <p>
              Быстрый переход к публичной Wiki и проверка опубликованных данных.
            </p>

            <div className={styles.moduleFooter}>
              <span>Публичная страница</span>
              <b>Перейти →</b>
            </div>
          </Link>
        </section>

        <section className={styles.bottomGrid}>
          <article className={styles.panel}>
            <div className={styles.panelHead}>
              <div>
                <span>ПОСЛЕДНИЕ ПУБЛИКАЦИИ</span>
                <h3>Dev Blog</h3>
              </div>

              <Link href="/admin/changelog">Все посты →</Link>
            </div>

            <div className={styles.activityList}>
              {latestPosts.length > 0 ? (
                latestPosts.map((post) => (
                  <Link
                    href={`/wiki/changelog#${encodeURIComponent(post.id)}`}
                    className={styles.activityItem}
                    key={post.id}
                  >
                    <div className={styles.activityMarker}>▤</div>
                    <div>
                      <strong>{post.title}</strong>
                      <span>{formatDate(post.publishedAt)}</span>
                    </div>
                    <b>›</b>
                  </Link>
                ))
              ) : (
                <div className={styles.emptyState}>Публикаций пока нет.</div>
              )}
            </div>
          </article>

          <article className={styles.panel}>
            <div className={styles.panelHead}>
              <div>
                <span>ПОСЛЕДНИЕ ИЗМЕНЕНИЯ</span>
                <h3>Разделы правил</h3>
              </div>

              <Link href="/admin/rules">Все разделы →</Link>
            </div>

            <div className={styles.activityList}>
              {latestSections.length > 0 ? (
                latestSections.map((section) => (
                  <Link
                    href="/admin/rules"
                    className={styles.activityItem}
                    key={section.id}
                  >
                    <div className={styles.activityMarker}>▣</div>
                    <div>
                      <strong>{section.title}</strong>
                      <span>{formatDate(getRuleUpdatedAt(section))}</span>
                    </div>
                    <b>›</b>
                  </Link>
                ))
              ) : (
                <div className={styles.emptyState}>
                  Разделов правил пока нет.
                </div>
              )}
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}
