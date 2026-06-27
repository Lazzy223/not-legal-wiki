import Sidebar from "@/components/sidebar";

export default function WikiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex" }}>
      {/* LEFT MENU /}
      <Sidebar />

      {/ CONTENT */}
      <main style={{ flex: 1, padding: "25px" }}>
        {children}
      </main>
    </div>
  );
}