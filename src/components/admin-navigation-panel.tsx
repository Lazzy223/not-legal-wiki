"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import AdminProfileMenu from "@/components/admin-profile-menu";
import styles from "./admin-navigation-panel.module.css";

type AuthUser = {
  login?: string;
  username?: string;
  role?: string;
  roleName?: string;
  canOpenAdmin?: boolean;
  canManageUsers?: boolean;
};

type NavigationItem = {
  href: string;
  label: string;
  icon: string;
  exact?: boolean;
};

const managementItems: NavigationItem[] = [
  { href: "/admin", label: "Обзор", icon: "⌂", exact: true },
  { href: "/admin/changelog", label: "Dev Blog", icon: "▤" },
  { href: "/admin/rules", label: "Правила", icon: "▣" },
  { href: "/admin/articles", label: "Статьи Wiki", icon: "◇" },
];

const viewItems: NavigationItem[] = [
  { href: "/wiki", label: "Wiki", icon: "◇", exact: true },
  { href: "/wiki/changelog", label: "Dev Blog", icon: "↗" },
  { href: "/wiki/rules", label: "Правила", icon: "⌑" },
];

function isItemActive(pathname: string, item: NavigationItem) {
  if (item.exact) {
    return pathname === item.href;
  }

  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export default function AdminNavigationPanel() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/auth/me", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled) {
          setUser(data?.user || null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUser(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "F10") {
        event.preventDefault();
        event.stopPropagation();

        if (!event.repeat) {
          setOpen((current) => !current);
        }

        return;
      }

      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown, true);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  function closePanel() {
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        className={`${styles.backdrop} ${open ? styles.backdropOpen : ""}`}
        onClick={closePanel}
        aria-label="Закрыть меню администратора"
        tabIndex={open ? 0 : -1}
      />

      <aside
        className={`${styles.panel} ${open ? styles.panelOpen : ""}`}
        aria-hidden={!open}
      >
        <div className={styles.panelTop}>
          <Link href="/" className={styles.logo} onClick={closePanel}>
            <span>NOT LEGAL</span>
            <b>RP</b>
          </Link>

          <button
            type="button"
            className={styles.closeButton}
            onClick={closePanel}
            aria-label="Закрыть меню"
          >
            ×
          </button>
        </div>

        <div className={styles.hotkeyHint}>
          <kbd>F10</kbd>
          <span>открыть или закрыть меню</span>
        </div>

        <div className={styles.sideLabel}>Управление</div>

        <nav className={styles.sideNav}>
          {managementItems.map((item) => (
            <Link
              href={item.href}
              key={item.href}
              onClick={closePanel}
              className={
                isItemActive(pathname, item) ? styles.sideNavActive : undefined
              }
            >
              <span>{item.icon}</span>
              <b>{item.label}</b>
            </Link>
          ))}

          {user?.canManageUsers ? (
            <Link
              href="/admin/users"
              onClick={closePanel}
              className={
                pathname.startsWith("/admin/users")
                  ? styles.sideNavActive
                  : undefined
              }
            >
              <span>◉</span>
              <b>Пользователи</b>
            </Link>
          ) : (
            <div className={styles.disabledNav}>
              <span>◉</span>
              <b>Пользователи</b>
              <small>Нет доступа</small>
            </div>
          )}
        </nav>

        <div className={styles.sideLabel}>Просмотр</div>

        <nav className={styles.sideNav}>
          {viewItems.map((item) => (
            <Link href={item.href} key={item.href} onClick={closePanel}>
              <span>{item.icon}</span>
              <b>{item.label}</b>
            </Link>
          ))}
        </nav>

        <AdminProfileMenu user={user} />
      </aside>
    </>
  );
}
