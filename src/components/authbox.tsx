"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import styles from "./authbox.module.css";

type AuthUser = {
  login: string;
  role: string;
  roleName: string;
  canOpenAdmin: boolean;
};

export default function AuthBox() {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadMe() {
    const response = await fetch("/api/auth/me");
    const data = await response.json();

    setUser(data.user);
  }

  useEffect(() => {
    loadMe();
  }, []);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError("");

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ login, password }),
    });

    const data = await response.json();

    setLoading(false);

    if (!response.ok) {
      setError(data.message || "Ошибка авторизации");
      return;
    }

    setLogin("");
    setPassword("");
    await loadMe();
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", {
      method: "POST",
    });

    setUser(null);
  }

  if (user) {
    return (
      <div className={styles.box}>
        <div className={styles.topLine}>
          <span>AUTH</span>
          <b>ONLINE</b>
        </div>

        <div className={styles.profile}>
          <div className={styles.avatar}>
            {user.login.slice(0, 1).toUpperCase()}
          </div>

          <div>
            <h3>{user.login}</h3>
            <p>{user.roleName}</p>
          </div>
        </div>

        {user.canOpenAdmin && (
          <Link href="/admin" className={styles.adminButton}>
            Админ-панель →
          </Link>
        )}

        {!user.canOpenAdmin && (
          <div className={styles.noAccess}>
            У аккаунта нет доступа к админ-панели
          </div>
        )}

        <button type="button" onClick={handleLogout} className={styles.logout}>
          Выйти
        </button>
      </div>
    );
  }

  return (
    <div className={styles.box}>
      <div className={styles.topLine}>
        <span>AUTH</span>
        <b>LOGIN</b>
      </div>

      <h3 className={styles.title}>Авторизация</h3>

      <p className={styles.text}>
        Войдите под аккаунтом с правами, чтобы открыть управление сайтом.
      </p>

      <form onSubmit={handleLogin} className={styles.form}>
        <input
          value={login}
          onChange={(event) => setLogin(event.target.value)}
          placeholder="Логин"
        />

        <input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Пароль"
          type="password"
        />

        {error && <div className={styles.error}>{error}</div>}

        <button type="submit" disabled={loading}>
          {loading ? "Вход..." : "Войти"}
        </button>
      </form>
    </div>
  );
}