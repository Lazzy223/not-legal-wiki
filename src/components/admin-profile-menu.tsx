"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./admin-profile-menu.module.css";

type AuthUser = {
  login?: string;
  username?: string;
  role?: string;
  roleName?: string;
};

type View = "menu" | "switch" | "password";

type AdminProfileMenuProps = {
  user: AuthUser | null;
};

export default function AdminProfileMenu({
  user,
}: AdminProfileMenuProps) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement | null>(null);

  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("menu");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [switchUsername, setSwitchUsername] = useState("");
  const [switchPassword, setSwitchPassword] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");

  const username =
    user?.username?.trim() ||
    user?.login?.trim() ||
    "Администратор";

  const roleName = user?.roleName || user?.role || "Администратор";
  const initial = username.slice(0, 1).toUpperCase();

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      const target = event.target as Node | null;

      if (target && !rootRef.current?.contains(target)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  function openView(nextView: View) {
    setView(nextView);
    setMessage("");
  }

  async function logout() {
    setLoading(true);

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
    } finally {
      router.replace("/");
      router.refresh();
    }
  }

  async function switchUser() {
    if (!switchUsername.trim() || !switchPassword.trim()) {
      setMessage("Введи логин и пароль другого пользователя");
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
          username: switchUsername,
          password: switchPassword,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || "Не удалось сменить пользователя");
      }

      setMessage("Пользователь сменён");
      setSwitchPassword("");

      window.setTimeout(() => {
        window.location.reload();
      }, 350);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Не удалось сменить пользователя"
      );
    } finally {
      setLoading(false);
    }
  }

  async function changePassword() {
    if (!currentPassword || !newPassword || !repeatPassword) {
      setMessage("Заполни все поля");
      return;
    }

    if (newPassword !== repeatPassword) {
      setMessage("Новые пароли не совпадают");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || "Не удалось изменить пароль");
      }

      setCurrentPassword("");
      setNewPassword("");
      setRepeatPassword("");
      setMessage("Пароль успешно изменён");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Не удалось изменить пароль"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.root} ref={rootRef}>
      {open && (
        <div className={styles.popup}>
          <div className={styles.popupHeader}>
            {view !== "menu" && (
              <button
                type="button"
                className={styles.backButton}
                onClick={() => openView("menu")}
                aria-label="Вернуться назад"
              >
                ←
              </button>
            )}

            <div>
              <span>ПРОФИЛЬ</span>
              <strong>
                {view === "menu"
                  ? username
                  : view === "switch"
                    ? "Смена пользователя"
                    : "Смена пароля"}
              </strong>
            </div>

            <button
              type="button"
              className={styles.closeButton}
              onClick={() => setOpen(false)}
              aria-label="Закрыть меню"
            >
              ×
            </button>
          </div>

          {view === "menu" && (
            <div className={styles.menuList}>
              <button type="button" onClick={() => openView("switch")}>
                <span>⇄</span>
                <div>
                  <strong>Сменить пользователя</strong>
                  <small>Войти в другой аккаунт</small>
                </div>
              </button>

              <button type="button" onClick={() => openView("password")}>
                <span>⌁</span>
                <div>
                  <strong>Сменить пароль</strong>
                  <small>Обновить пароль текущего аккаунта</small>
                </div>
              </button>

              <button
                type="button"
                className={styles.logoutAction}
                onClick={logout}
                disabled={loading}
              >
                <span>↪</span>
                <div>
                  <strong>Выйти из аккаунта</strong>
                  <small>Завершить текущую сессию</small>
                </div>
              </button>
            </div>
          )}

          {view === "switch" && (
            <div className={styles.form}>
              <label>
                Логин другого пользователя
                <input
                  value={switchUsername}
                  onChange={(event) =>
                    setSwitchUsername(event.target.value)
                  }
                  placeholder="Введите логин"
                  autoComplete="username"
                />
              </label>

              <label>
                Пароль
                <input
                  value={switchPassword}
                  onChange={(event) =>
                    setSwitchPassword(event.target.value)
                  }
                  placeholder="Введите пароль"
                  type="password"
                  autoComplete="current-password"
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !loading) {
                      switchUser();
                    }
                  }}
                />
              </label>

              <button
                type="button"
                className={styles.submitButton}
                onClick={switchUser}
                disabled={loading}
              >
                {loading ? "Выполняется вход..." : "Сменить пользователя"}
              </button>
            </div>
          )}

          {view === "password" && (
            <div className={styles.form}>
              <label>
                Текущий пароль
                <input
                  value={currentPassword}
                  onChange={(event) =>
                    setCurrentPassword(event.target.value)
                  }
                  placeholder="Введите текущий пароль"
                  type="password"
                  autoComplete="current-password"
                />
              </label>

              <label>
                Новый пароль
                <input
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder="Минимум 4 символа"
                  type="password"
                  autoComplete="new-password"
                />
              </label>

              <label>
                Повтори новый пароль
                <input
                  value={repeatPassword}
                  onChange={(event) =>
                    setRepeatPassword(event.target.value)
                  }
                  placeholder="Повтори новый пароль"
                  type="password"
                  autoComplete="new-password"
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !loading) {
                      changePassword();
                    }
                  }}
                />
              </label>

              <button
                type="button"
                className={styles.submitButton}
                onClick={changePassword}
                disabled={loading}
              >
                {loading ? "Сохранение..." : "Изменить пароль"}
              </button>
            </div>
          )}

          {message && <div className={styles.message}>{message}</div>}
        </div>
      )}

      <button
        type="button"
        className={styles.profileButton}
        onClick={() => {
          setOpen((current) => !current);
          setView("menu");
          setMessage("");
        }}
        aria-expanded={open}
      >
        <div className={styles.avatar}>{initial}</div>

        <div className={styles.profileText}>
          <strong>{username}</strong>
          <span>{roleName}</span>
        </div>

        <b className={styles.chevron}>{open ? "⌄" : "›"}</b>
      </button>
    </div>
  );
}
