import Link from "next/link";
import { getCategories } from "@/lib/categories";

export default function Sidebar() {
  const categories = getCategories();

  return (
    <aside
      style={{
        width: "260px",
        minHeight: "100vh",
        background: "var(--panel2)",
        borderRight: "1px solid var(--border)",
        padding: "16px",
      }}
    >
      <h3 style={{ marginBottom: "15px" }}>📚 Not Legal RP Wiki</h3>

      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <Link className="item" href="/wiki">🏠 Главная</Link>
        <Link className="item" href="/wiki/changelog">📜 Обновления</Link>

        <div style={{ marginTop: "10px", color: "var(--muted)", fontSize: "12px" }}>
          КАТЕГОРИИ
        </div>

        {categories.map((c) => (
          <Link key={c} className="item" href={`/wiki/category/${c}`}>
            🏷 {c}
          </Link>
        ))}
      </div>
    </aside>
  );
}