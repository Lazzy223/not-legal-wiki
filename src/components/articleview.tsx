"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Article = {
  slug: string;
  title: string;
  category: string;
  content: string;
};

export default function ArticleView({ article }: { article: Article }) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const lines = article.content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const search = query.toLowerCase().trim();

  const visibleLines =
    search.length === 0 || article.title.toLowerCase().includes(search)
      ? lines
      : lines.filter((line) => line.toLowerCase().includes(search));

  return (
    <main className="article-page">
      <div className="article-top">
        <button className="back-button" onClick={() => router.back()}>
          ← Вернуться назад
        </button>

        <div className="article-breadcrumb">
          Not Legal RP <span>// WIKI</span>
        </div>
      </div>

      <section className="article-hero">
        <div className="article-bg-word">
          {article.category.toUpperCase()}
        </div>

        <div className="article-hero-content">
          <div className="article-label">
            {article.category}
          </div>

          <h1>{article.title}</h1>

          <p>
            Информация, механики и описание раздела в хронологическом порядке
          </p>
        </div>
      </section>

      <section className="article-search-block">
        <span>⌕</span>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск по содержимому..."
        />
      </section>

      <section className="article-content-card">
        <div className="article-meta">
          <span>{article.category}</span>
          <b>{visibleLines.length} пунктов</b>
        </div>

        <div className="article-body">
          {visibleLines.length === 0 ? (
            <p className="article-empty">Ничего не найдено</p>
          ) : (
            visibleLines.map((line, index) => (
              <p className="article-line" key={index}>
                <span>•</span>
                {line}
              </p>
            ))
          )}
        </div>
      </section>
    </main>
  );
}