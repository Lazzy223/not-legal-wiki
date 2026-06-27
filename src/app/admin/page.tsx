import { cookies } from "next/headers";
import Link from "next/link";
import { authCookieName, getRoleName, verifySession } from "@/lib/auth";
import styles from "./admin.module.css";

export default async function AdminPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(authCookieName)?.value;

  const user = await verifySession(token);

  return (
    <main className={styles.page}>
      <section className={styles.panel}>
        <div className={styles.badge}>ADMIN PANEL</div>

        <h1>Панель управления</h1>

        <p>
          Вы вошли как <b>{user?.login}</b>. Роль:{" "}
          <span>{getRoleName(user?.role)}</span>
        </p>

        <div className={styles.grid}>
          <Link href="/admin/changelog" className={styles.card}>
            <b>Dev Blog</b>
            <p>Создание и редактирование обновлений</p>
          </Link>

          <Link href="/admin/articles" className={styles.card}>
            <b>Статьи Wiki</b>
            <p>Управление статьями и обучением</p>
          </Link>

          <Link href="/admin/rules" className={styles.card}>
            <b>Правила</b>
            <p>Редактирование правил сервера</p>
          </Link>

          <Link href="/admin/users" className={styles.card}>
            <b>Пользователи</b>
            <p>Роли и доступы</p>
          </Link>
        </div>

        <Link href="/" className={styles.back}>
          ← На главную
        </Link>
      </section>
    </main>
  );
}