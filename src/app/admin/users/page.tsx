"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./users.module.css";

type AuthUser = {
  username?: string;
  login?: string;
  roleName?: string;
  canManageUsers?: boolean;
};

type UserItem = {
  id: string;
  username: string;
  roleId: string;
  roleName: string;
  roleColor: string;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
};

type RoleItem = {
  id: string;
  name: string;
  slug: string;
  color: string;
  permissions: {
    canOpenAdmin: boolean;
    canManageUsers: boolean;
  };
  isSystem: boolean;
  assignable: boolean;
  createdAt: string;
  updatedAt: string;
};

type Tab = "users" | "roles";

function formatDate(value: string) {
  if (!value) return "Системный аккаунт";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function AdminUsersPage() {
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("users");

  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [roleId, setRoleId] = useState("viewer");

  const [roleEditId, setRoleEditId] = useState<string | null>(null);
  const [roleName, setRoleName] = useState("");
  const [roleSlug, setRoleSlug] = useState("");
  const [roleColor, setRoleColor] = useState("#ef4444");
  const [roleCanOpenAdmin, setRoleCanOpenAdmin] = useState(true);
  const [roleCanManageUsers, setRoleCanManageUsers] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const assignableRoles = useMemo(() => {
    return roles.filter((role) => role.assignable !== false);
  }, [roles]);

  useEffect(() => {
    async function initialize() {
      try {
        const response = await fetch("/api/auth/me", {
          cache: "no-store",
        });

        const data = await response.json().catch(() => null);
        const user = data?.user || null;

        if (!response.ok || !user?.canManageUsers) {
          router.replace("/admin");
          return;
        }

        setCurrentUser(user);
        await loadData();
      } finally {
        setLoading(false);
      }
    }

    initialize();
  }, [router]);

  async function loadData() {
    const [usersResponse, rolesResponse] = await Promise.all([
      fetch("/api/admin/users", {
        cache: "no-store",
      }),
      fetch("/api/admin/roles", {
        cache: "no-store",
      }),
    ]);

    const usersData = await usersResponse.json().catch(() => null);
    const rolesData = await rolesResponse.json().catch(() => null);

    if (!usersResponse.ok) {
      throw new Error(usersData?.message || "Не удалось загрузить пользователей");
    }

    if (!rolesResponse.ok) {
      throw new Error(rolesData?.message || "Не удалось загрузить роли");
    }

    setUsers(Array.isArray(usersData?.users) ? usersData.users : []);
    setRoles(Array.isArray(rolesData?.roles) ? rolesData.roles : []);
  }

  function resetUserForm() {
    setUserId(null);
    setUsername("");
    setPassword("");
    setRoleId(assignableRoles[0]?.id || "viewer");
  }

  function editUser(user: UserItem) {
    if (user.isSystem) return;

    setActiveTab("users");
    setUserId(user.id);
    setUsername(user.username);
    setPassword("");
    setRoleId(user.roleId);
    setMessage(`Редактируется пользователь: ${user.username}`);
  }

  async function saveUser() {
    setSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/users", {
        method: userId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: userId,
          username,
          password,
          roleId,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || "Ошибка сохранения пользователя");
      }

      await loadData();
      setMessage(userId ? "Пользователь обновлён" : "Пользователь создан");
      resetUserForm();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Ошибка сохранения пользователя"
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteUser(user: UserItem) {
    if (user.isSystem) return;

    const accepted = confirm(`Удалить пользователя ${user.username}?`);

    if (!accepted) return;

    const response = await fetch("/api/admin/users", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: user.id,
      }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      setMessage(data?.message || "Ошибка удаления пользователя");
      return;
    }

    await loadData();

    if (userId === user.id) {
      resetUserForm();
    }

    setMessage("Пользователь удалён");
  }

  function resetRoleForm() {
    setRoleEditId(null);
    setRoleName("");
    setRoleSlug("");
    setRoleColor("#ef4444");
    setRoleCanOpenAdmin(true);
    setRoleCanManageUsers(false);
  }

  function editRole(role: RoleItem) {
    if (role.id === "owner") return;

    setActiveTab("roles");
    setRoleEditId(role.id);
    setRoleName(role.name);
    setRoleSlug(role.slug);
    setRoleColor(role.color);
    setRoleCanOpenAdmin(role.permissions.canOpenAdmin);
    setRoleCanManageUsers(role.permissions.canManageUsers);
    setMessage(`Редактируется роль: ${role.name}`);
  }

  async function saveRole() {
    setSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/roles", {
        method: roleEditId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: roleEditId,
          name: roleName,
          slug: roleSlug,
          color: roleColor,
          permissions: {
            canOpenAdmin: roleCanOpenAdmin || roleCanManageUsers,
            canManageUsers: roleCanManageUsers,
          },
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || "Ошибка сохранения роли");
      }

      await loadData();
      setMessage(roleEditId ? "Роль обновлена" : "Роль создана");
      resetRoleForm();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Ошибка сохранения роли"
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteRole(role: RoleItem) {
    if (role.isSystem) return;

    const accepted = confirm(`Удалить роль ${role.name}?`);

    if (!accepted) return;

    const response = await fetch("/api/admin/roles", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: role.id,
      }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      setMessage(data?.message || "Ошибка удаления роли");
      return;
    }

    await loadData();

    if (roleEditId === role.id) {
      resetRoleForm();
    }

    setMessage("Роль удалена");
  }

  if (loading) {
    return (
      <main className={styles.loading}>
        <div />
        <strong>Загрузка пользователей и ролей</strong>
      </main>
    );
  }

  const displayName =
    currentUser?.username ||
    currentUser?.login ||
    "Администратор";

  return (
    <main className={styles.page}>
      <aside className={styles.sidebar}>
        <Link href="/" className={styles.logo}>
          <span>NOT LEGAL</span>
          <b>RP</b>
        </Link>

        <nav className={styles.navigation}>
          <Link href="/admin">
            <span>⌂</span>
            Обзор
          </Link>

          <Link href="/admin/changelog">
            <span>▤</span>
            Dev Blog
          </Link>

          <Link href="/admin/rules">
            <span>▣</span>
            Правила
          </Link>

          <Link href="/admin/users" className={styles.activeNav}>
            <span>◉</span>
            Пользователи
          </Link>
        </nav>

        <div className={styles.adminProfile}>
          <div>{displayName.slice(0, 1).toUpperCase()}</div>
          <span>
            <strong>{displayName}</strong>
            <small>{currentUser?.roleName || "Owner"}</small>
          </span>
        </div>
      </aside>

      <section className={styles.workspace}>
        <header className={styles.header}>
          <div>
            <span>ACCESS MANAGEMENT</span>
            <h1>Пользователи и роли</h1>
            <p>
              Создание аккаунтов, настройка ролей и выдача прав доступа.
            </p>
          </div>

          <Link href="/admin" className={styles.backButton}>
            ← Вернуться в обзор
          </Link>
        </header>

        <section className={styles.stats}>
          <article>
            <span>Пользователей</span>
            <strong>{users.length}</strong>
          </article>

          <article>
            <span>Ролей</span>
            <strong>{roles.length}</strong>
          </article>

          <article>
            <span>Управляющих</span>
            <strong>
              {
                roles.filter(
                  (role) => role.permissions.canManageUsers
                ).length
              }
            </strong>
          </article>
        </section>

        <div className={styles.tabs}>
          <button
            type="button"
            className={activeTab === "users" ? styles.activeTab : ""}
            onClick={() => setActiveTab("users")}
          >
            Пользователи
            <span>{users.length}</span>
          </button>

          <button
            type="button"
            className={activeTab === "roles" ? styles.activeTab : ""}
            onClick={() => setActiveTab("roles")}
          >
            Роли
            <span>{roles.length}</span>
          </button>
        </div>

        {message && <div className={styles.message}>{message}</div>}

        {activeTab === "users" && (
          <section className={styles.contentGrid}>
            <article className={styles.listPanel}>
              <div className={styles.panelHead}>
                <div>
                  <span>АККАУНТЫ</span>
                  <h2>Все пользователи</h2>
                </div>

                <button type="button" onClick={resetUserForm}>
                  + Новый
                </button>
              </div>

              <div className={styles.items}>
                {users.map((user) => (
                  <div className={styles.userItem} key={user.id}>
                    <div
                      className={styles.avatar}
                      style={{
                        borderColor: user.roleColor,
                        color: user.roleColor,
                      }}
                    >
                      {user.username.slice(0, 1).toUpperCase()}
                    </div>

                    <div className={styles.itemText}>
                      <strong>{user.username}</strong>
                      <span>
                        <i style={{ background: user.roleColor }} />
                        {user.roleName}
                      </span>
                      <small>{formatDate(user.createdAt)}</small>
                    </div>

                    <div className={styles.itemActions}>
                      {user.isSystem ? (
                        <span className={styles.systemBadge}>
                          Система
                        </span>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => editUser(user)}
                          >
                            Изменить
                          </button>

                          <button
                            type="button"
                            className={styles.dangerButton}
                            onClick={() => deleteUser(user)}
                          >
                            Удалить
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <aside className={styles.formPanel}>
              <div className={styles.panelHead}>
                <div>
                  <span>РЕДАКТОР</span>
                  <h2>
                    {userId ? "Изменить пользователя" : "Новый пользователь"}
                  </h2>
                </div>
              </div>

              <label>
                Логин
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="Например: helper_01"
                />
              </label>

              <label>
                {userId ? "Новый пароль" : "Пароль"}
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={
                    userId
                      ? "Оставь пустым, чтобы не менять"
                      : "Введите пароль"
                  }
                  type="password"
                />
              </label>

              <label>
                Роль
                <select
                  value={roleId}
                  onChange={(event) => setRoleId(event.target.value)}
                >
                  {assignableRoles.map((role) => (
                    <option value={role.id} key={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className={styles.formActions}>
                <button
                  type="button"
                  onClick={saveUser}
                  disabled={saving}
                >
                  {saving
                    ? "Сохранение..."
                    : userId
                      ? "Сохранить изменения"
                      : "Создать пользователя"}
                </button>

                {userId && (
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={resetUserForm}
                  >
                    Отмена
                  </button>
                )}
              </div>
            </aside>
          </section>
        )}

        {activeTab === "roles" && (
          <section className={styles.contentGrid}>
            <article className={styles.listPanel}>
              <div className={styles.panelHead}>
                <div>
                  <span>УРОВНИ ДОСТУПА</span>
                  <h2>Все роли</h2>
                </div>

                <button type="button" onClick={resetRoleForm}>
                  + Новая
                </button>
              </div>

              <div className={styles.items}>
                {roles.map((role) => (
                  <div className={styles.roleItem} key={role.id}>
                    <div
                      className={styles.roleColor}
                      style={{ background: role.color }}
                    />

                    <div className={styles.itemText}>
                      <strong>{role.name}</strong>
                      <span>{role.slug}</span>
                      <small>
                        {role.permissions.canManageUsers
                          ? "Управление пользователями"
                          : role.permissions.canOpenAdmin
                            ? "Доступ к админ-панели"
                            : "Без доступа к админ-панели"}
                      </small>
                    </div>

                    <div className={styles.itemActions}>
                      {role.id === "owner" ? (
                        <span className={styles.systemBadge}>
                          Система
                        </span>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => editRole(role)}
                          >
                            Изменить
                          </button>

                          {!role.isSystem && (
                            <button
                              type="button"
                              className={styles.dangerButton}
                              onClick={() => deleteRole(role)}
                            >
                              Удалить
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <aside className={styles.formPanel}>
              <div className={styles.panelHead}>
                <div>
                  <span>РЕДАКТОР РОЛИ</span>
                  <h2>{roleEditId ? "Изменить роль" : "Новая роль"}</h2>
                </div>
              </div>

              <label>
                Название роли
                <input
                  value={roleName}
                  onChange={(event) => setRoleName(event.target.value)}
                  placeholder="Например: Старший модератор"
                />
              </label>

              <label>
                Системное имя
                <input
                  value={roleSlug}
                  onChange={(event) => setRoleSlug(event.target.value)}
                  placeholder="Создастся автоматически"
                  disabled={
                    roles.find((role) => role.id === roleEditId)?.isSystem
                  }
                />
              </label>

              <label>
                Цвет роли
                <div className={styles.colorField}>
                  <input
                    type="color"
                    value={roleColor}
                    onChange={(event) => setRoleColor(event.target.value)}
                  />

                  <input
                    value={roleColor}
                    onChange={(event) => setRoleColor(event.target.value)}
                    placeholder="#ef4444"
                  />
                </div>
              </label>

              <div className={styles.permissions}>
                <span>Права роли</span>

                <label>
                  <input
                    type="checkbox"
                    checked={roleCanOpenAdmin}
                    onChange={(event) =>
                      setRoleCanOpenAdmin(event.target.checked)
                    }
                    disabled={roleCanManageUsers}
                  />

                  <div>
                    <strong>Доступ к админ-панели</strong>
                    <small>Разрешает открывать раздел /admin.</small>
                  </div>
                </label>

                <label>
                  <input
                    type="checkbox"
                    checked={roleCanManageUsers}
                    onChange={(event) => {
                      setRoleCanManageUsers(event.target.checked);

                      if (event.target.checked) {
                        setRoleCanOpenAdmin(true);
                      }
                    }}
                  />

                  <div>
                    <strong>Управление пользователями и ролями</strong>
                    <small>
                      Разрешает создавать аккаунты и менять роли.
                    </small>
                  </div>
                </label>
              </div>

              <div className={styles.formActions}>
                <button
                  type="button"
                  onClick={saveRole}
                  disabled={saving}
                >
                  {saving
                    ? "Сохранение..."
                    : roleEditId
                      ? "Сохранить роль"
                      : "Создать роль"}
                </button>

                {roleEditId && (
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={resetRoleForm}
                  >
                    Отмена
                  </button>
                )}
              </div>
            </aside>
          </section>
        )}
      </section>
    </main>
  );
}
