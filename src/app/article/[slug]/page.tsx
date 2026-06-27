import { articles } from "@/data/articles";

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const article = articles.find(
    (item) => item.slug === slug
  );

  if (!article) {
    return <h1>Статья не найдена</h1>;
  }

  return (
    <div>
      <h1>{article.title}</h1>

      <p>{article.content}</p>
    </div>
  );
}