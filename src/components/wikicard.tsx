import Link from "next/link";

export default function Sidebar() {
  return (
    <aside
      style={{
        width: "250px",
        background: "#111827",
        color: "white",
        minHeight: "100vh",
        padding: "20px",
      }}
    >
      <h2>Not Legal RP Wiki</h2>

      <nav
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          marginTop: "20px",
        }}
      >
        <Link href="/">Главная</Link>
        <Link href="/rules">Правила</Link>
        <Link href="/factions">Организации</Link>
        <Link href="/jobs">Работы</Link>
        <Link href="/cars">Автомобили</Link>
        <Link href="/faq">FAQ</Link>
      </nav>
    </aside>
  );
}