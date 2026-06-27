"use client";

import { useState } from "react";
import { articles } from "@/data/articles";
import Link from "next/link";

export default function Header() {
  const [query, setQuery] = useState("");

  const results = articles.filter((a) =>
    a.title.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div
      style={{
        background: "#111827",
        borderBottom: "1px solid #1e293b",
        padding: "15px 20px",
      }}
    >
      {/* TOP BAR /}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2>Not Legal RP Wiki</h2>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск..."
          style={{
            width: "300px",
            padding: "8px",
            borderRadius: "8px",
            border: "1px solid #334155",
            background: "#0f172a",
            color: "white",
          }}
        />
      </div>

      {/ DROPDOWN SEARCH */}
      {query && (
        <div
          style={{
            marginTop: "10px",
            background: "#0b1220",
            border: "1px solid #1e293b",
            borderRadius: "8px",
          }}
        >
          {results.map((a) => (
            <Link key={a.slug} href={`/wiki/${a.slug}`}>
              <div style={{ padding: "10px", borderBottom: "1px solid #1e293b" }}>
                {a.title}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}