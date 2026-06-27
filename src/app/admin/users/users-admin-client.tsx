"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ManagedUser } from "@/lib/users-store";
import styles from "./users-admin.module.css";

export default function UsersAdminClient() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadUsers() {
    const response = await fetch("/api/admin/users", {
      cache: "no-store",
    });

    const data = await response.json();

    if (response.ok) {
      setUsers(data.users || []);
    } else {
      setMessage(data.message || "Нет доступа");
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  function resetForm() {
    setEditingId(null);
    setUsername("");
    setPassword("");
    setMessage("");
  }

  function selectUser(user: ManagedUser) {
    setEditingId(user.id);
    setUsername(user.username);
    setPassword(user.password);
    setMessage(`Редактируется: ${user.username}`);
  }

  async function saveUser() {
    setLoading(true);
    setMessage("");

    const response = await fetch("/api/admin/users", {
      method: editingId ? "PUT" : "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: editingId,
        username,
        password,
      }),
    });

    const data = await response.json();

    setLoading(false);

    if (!response.ok) {
      setMessage(data.message || "Ошибка сохранения");
      return;
    }

    await loadUsers();

    if (!editingId) {
      setEditingId(data.user.id);
    }

    setMessage(editingId ? "Пользователь обновлён" : "Пользователь создан");
  }

  async function deleteUser() {
    if (!editingId) {
      return;
    }

    const accept = confirm("Точно удалить этого пользователя?");

    if (!accept) {
      return;
    }

    const response = await fetch("/api/admin/users", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: editingId,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.message || "Ошибка удаления");
      return;
    }

    await loadUsers();
    resetForm();
    setMessage("Пользователь удалён");
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <span>OWNER PANEL</span>
          <h1>Пользователи</h1>
          <p>
            Управление аккаунтами модераторов. Доступ к этой странице есть
            только у owner.
          </p>
        </div>

        <Link href="/admin" className={styles.backButton}>
          ← Назад
        </Link>
      </header>

      <section className={styles.layout}>
        <aside className={styles.listCard}>
          <div className={styles.cardTitle}>
            <b>01</b>
            <h2>Аккаунты</h2>
          </div>

          <button type="button" onClick={resetForm} className={styles.newButton}>
            + Новый модератор
          </button>

          <div className={styles.usersList}>
            {users.length === 0 && (
              <div className={styles.emptyList}>Пользователей пока нет.</div>
            )}

            {users.map((user) => (
              <button
                type="button"
                key={user.id}
                onClick={() => selectUser(user)}
                className={`${styles.userButton} ${
                  editingId === user.id ? styles.userButtonActive : ""
                }`}
              >
                <span>{user.role}</span>
                <b>{user.username}</b>
                <small>Пароль: {user.password}</small>
              </button>
            ))}
          </div>
        </aside>

        <section className={styles.formCard}>
          <div className={styles.cardTitle}>
            <b>02</b>
            <h2>{editingId ? "Редактирование" : "Новый пользователь"}</h2>
          </div>

          <label>
            Логин
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Например: moder1"
            />
          </label>

          <label>
            Пароль
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Введите пароль"
              type="text"
            />
          </label>

          <label>
            Роль
            <input value="moderator" disabled />
          </label>

          <div className={styles.helpBox}>
            Все созданные здесь аккаунты получают роль <b>moderator</b>.
            Модератор может управлять постами, правилами и статьями, но не может
            управлять пользователями.
          </div>

          {message && <div className={styles.message}>{message}</div>}

          <div className={styles.actions}>
            <button type="button" onClick={saveUser} disabled={loading}>
              {loading
                ? "Сохранение..."
                : editingId
                  ? "Сохранить изменения"
                  : "Создать пользователя"}
            </button>

            {editingId && (
              <button
                type="button"
                onClick={deleteUser}
                className={styles.deleteButton}
              >
                Удалить
              </button>
            )}
          </div>
        </section>

        <section className={styles.previewCard}>
          <div className={styles.cardTitle}>
            <b>03</b>
            <h2>Предпросмотр</h2>
          </div>

          <article className={styles.preview}>
            <div className={styles.avatar}>
              {username ? username.slice(0, 1).toUpperCase() : "M"}
            </div>

            <h3>{username || "moderator"}</h3>
            <p>Роль: moderator</p>

            <div>
              <span>Доступно</span>
              <b>Посты, правила, статьи, changelog</b>
            </div>

            <div>
              <span>Недоступно</span>
              <b>Страница пользователей</b>
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}