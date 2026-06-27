"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import styles from "./secret-auth.module.css";

type AuthUser = {
  username?: string;
  name?: string;
  login?: string;
  role?: string;
  roleName?: string;
  canOpenAdmin?: boolean;
  canManageUsers?: boolean;
};

function getUserName(user: AuthUser | null) {
  if (!user) return "Admin";

  return user.username || user.name || user.login || "Admin";
}

function getUserInitial(user: AuthUser | null) {
  return getUserName(user).slice(0, 1).toUpperCase();
}

function getUserRole(user: AuthUser | null) {
  if (!user) return "Пользователь";

  return user.roleName || user.role || "Пользователь";
}

export default function SecretAuth() {
  const [clicks, setClicks] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const [user, setUser] = useState<AuthUser | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function handleSecretClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;

      if (!target) return;

      const trigger = target.closest("[data-secret-auth-trigger]");

      if (!trigger) return;

      event.preventDefault();

      setClicks((current) => {
        const next = current + 1;

        if (resetTimer.current) {
          clearTimeout(resetTimer.current);
        }

        resetTimer.current = setTimeout(() => {
          setClicks(0);
        }, 1800);

        if (next >= 7) {
          setIsOpen(true);
          setUser(null);
          setUsername("");
          setPassword("");
          setMessage("");
          return 0;
        }

        return next;
      });
    }

    document.addEventListener("click", handleSecretClick);

    return () => {
      document.removeEventListener("click", handleSecretClick);

      if (resetTimer.current) {
        clearTimeout(resetTimer.current);
      }
    };
  }, []);

  async function login() {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Неверный логин или пароль");
        return;
      }

      setUser(data.user || null);
      setUsername("");
      setPassword("");
      setMessage("Вход выполнен");
    } catch {
      setMessage("Не удалось выполнить вход");
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", {
      method: "POST",
    });

    setUser(null);
    setUsername("");
    setPassword("");
    setMessage("Сессия сброшена");
  }

  if (!isOpen) {
    return null;
  }

  const displayName = getUserName(user);
  const displayRole = getUserRole(user);

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

        <div className={styles.modalTop}>
          <span>SECRET ACCESS</span>
          <h2>Авторизация</h2>
          <p>Запретная зона!!</p>
        </div>

        {user ? (
          <div className={styles.profileBox}>
            <div className={styles.avatar}>{getUserInitial(user)}</div>

            <div>
              <h3>{displayName}</h3>
              <p>{displayRole}</p>
            </div>

            <div className={styles.profileActions}>
              {user.canOpenAdmin ? (
                <Link href="/admin" className={styles.adminButton}>
                  Открыть админ-панель
                </Link>
              ) : (
                <div className={styles.message}>Нет доступа к админ-панели</div>
              )}

              <button
                type="button"
                onClick={logout}
                className={styles.logoutButton}
              >
                Выйти
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.form}>
            <label>
              Логин
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Admin & Helper"
                autoFocus
              />
            </label>

            <label>
              Пароль
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Введите пароль"
                type="password"
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    login();
                  }
                }}
              />
            </label>

            <button type="button" onClick={login} disabled={loading}>
              {loading ? "Проверка..." : "Войти"}
            </button>

            <button
              type="button"
              onClick={logout}
              className={styles.logoutButton}
            >
              Сбросить старую сессию
            </button>
          </div>
        )}

        {message && <div className={styles.message}>{message}</div>}
      </div>
    </div>
  );
}