import { articles } from "@/data/articles";

export function getCategories() {
  const categories = articles.map((a) => a.category);

  return [...new Set(categories)];
}