import styles from "./wiki-content.module.css";

type WikiContentProps = {
  html: string;
};

function prepareHtml(value: string) {
  if (!value || !value.trim()) {
    return "<p>Текст пока не добавлен.</p>";
  }

  const hasHtmlTags = /<\/?[a-z][\s\S]*>/i.test(value);

  if (hasHtmlTags) {
    return value;
  }

  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => `<p>${item}</p>`)
    .join("");
}

export default function WikiContent({ html }: WikiContentProps) {
  return (
    <div
      className={styles.content}
      dangerouslySetInnerHTML={{ __html: prepareHtml(html) }}
    />
  );
}