import styles from "./legal-content.module.css";

type LegalContentProps = {
  html: string;
  compact?: boolean;
};

function prepareHtml(value: string) {
  if (!value || !value.trim()) {
    return "<p>Текст нормативного акта пока не добавлен.</p>";
  }

  const hasHtmlTags = /<\/?[a-z][\s\S]*>/i.test(value);

  if (hasHtmlTags) return value;

  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => `<p>${item}</p>`)
    .join("");
}

export default function LegalContent({ html, compact = false }: LegalContentProps) {
  return (
    <div
      className={`${styles.content} ${compact ? styles.compact : ""}`}
      dangerouslySetInnerHTML={{ __html: prepareHtml(html) }}
    />
  );
}
