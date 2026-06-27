import Link from "next/link";
import { articles } from "@/data/articles";

export default function CategoryPage({
  params,
}: {
  params: { name: string };
}) {
  const category = (params?.name ||
    "").toLowerCase();

const filtered = articles.filter(
  (a) => (a.category ||
 "").toLowerCase() === category
);

  return (
    <div>
      <h1>Категория: {category}</h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill,minmax(250px,1fr))",
          gap: "15px",
          marginTop: "20px",
        }}
      >
        {filtered.map((a) => (
          <Link key={a.slug} href={`/wiki/${a.slug}`}>
            <div className="card">
              <h3>{a.title}</h3>
              <p>{a.category}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}