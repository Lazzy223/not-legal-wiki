"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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

const SECRET_SEQUENCE = "2x9a0h-y";
const ACTIVATION_WINDOW_MS = 15_000;

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

function normalizeText(value: string | null | undefined) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export default function SecretAuth() {
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const armedUntilRef = useRef(0);
  const sequencePositionRef = useRef(0);
  const disarmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    async function loadCurrentUser() {
      try {
        const response = await fetch("/api/auth/me", {
          cache: "no-store",
        });

        const data = await response.json().catch(() => null);
        setUser(data?.user || null);
      } catch {
        setUser(null);
      }
    }

    loadCurrentUser();
  }, []);

  useEffect(() => {
    function disarm() {
      armedUntilRef.current = 0;
      sequencePositionRef.current = 0;

      if (disarmTimerRef.current) {
        clearTimeout(disarmTimerRef.current);
        disarmTimerRef.current = null;
      }
    }

    function arm() {
      disarm();

      armedUntilRef.current = Date.now() + ACTIVATION_WINDOW_MS;
      sequencePositionRef.current = 0;
      disarmTimerRef.current = setTimeout(disarm, ACTIVATION_WINDOW_MS);
    }

    function handleClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;

      if (!target) {
        return;
      }

      const clickable = target.closest<HTMLElement>(
        "button, a, [role='button']"
      );

      if (!clickable) {
        return;
      }

      const buttonText = normalizeText(clickable.textContent);
      const isFullInstruction =
        buttonText === "полная инструкция" ||
        buttonText.startsWith("полная инструкция ");

      const isExplicitTrigger = Boolean(
        target.closest("[data-secret-auth-trigger]")
      );

      if (!isFullInstruction && !isExplicitTrigger) {
        return;
      }

      // Обычный обработчик кнопки не блокируется:
      // всплывающее окно инструкции откроется как раньше.
      arm();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (Date.now() > armedUntilRef.current) {
        disarm();
        return;
      }

      const target = event.target as HTMLElement | null;

      if (
        target?.matches("input, textarea, select") ||
        target?.isContentEditable ||
        event.ctrlKey ||
        event.altKey ||
        event.metaKey ||
        event.key.length !== 1
      ) {
        return;
      }

      const pressed = event.key.toLowerCase();
      const expected =
        SECRET_SEQUENCE[sequencePositionRef.current]?.toLowerCase();

      if (pressed === expected) {
        sequencePositionRef.current += 1;

        if (sequencePositionRef.current === SECRET_SEQUENCE.length) {
          disarm();
          setIsOpen(true);
          setUsername("");
          setPassword("");
          setMessage("");
        }

        return;
      }

      sequencePositionRef.current =
        pressed === SECRET_SEQUENCE[0].toLowerCase() ? 1 : 0;
    }

    document.addEventListener("click", handleClick);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("click", handleClick);
      document.removeEventListener("keydown", handleKeyDown);

      if (disarmTimerRef.current) {
        clearTimeout(disarmTimerRef.current);
      }
    };
  }, []);

  async function login() {
    if (!username.trim() || !password.trim()) {
      setMessage("Введите логин и пароль");
      return;
    }

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

      const raw = await response.text();

      let data: {
        user?: AuthUser | null;
        message?: string;
      } = {};

      if (raw) {
        try {
          data = JSON.parse(raw);
        } catch {
          throw new Error(`Ошибка сервера авторизации: ${response.status}`);
        }
      }

      if (!response.ok) {
        setMessage(data.message || `Ошибка авторизации: ${response.status}`);
        return;
      }

      setUser(data.user || null);
      setUsername("");
      setPassword("");
      setMessage("Вход выполнен");

      window.dispatchEvent(new Event("nlrp-auth-changed"));
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Не удалось выполнить вход"
      );
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
    } finally {
      setUser(null);
      setUsername("");
      setPassword("");
      setMessage("Сессия сброшена");

      window.dispatchEvent(new Event("nlrp-auth-changed"));
      router.refresh();
    }
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
          aria-label="Закрыть окно авторизации"
        >
          ×
        </button>

        <div className={styles.modalTop}>
          <span>SECRET ACCESS</span>
          <h2>Авторизация</h2>
          <p>Закрытая панель управления проектом.</p>
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
                <div className={styles.message}>
                  У этой роли нет доступа к админ-панели
                </div>
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
                placeholder="Введите логин"
                autoFocus
                autoComplete="username"
              />
            </label>

            <label>
              Пароль
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Введите пароль"
                type="password"
                autoComplete="current-password"
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !loading) {
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
