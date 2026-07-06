import type { CSSProperties } from "react";
import {
  getHeadingBlockAnchorMap,
  injectRichTextHeadingAnchors,
  type ArticleBlock,
} from "@/lib/article-types";
import styles from "./article-renderer.module.css";

type ArticleRendererProps = {
  blocks: ArticleBlock[];
  compact?: boolean;
};

function blockStyle(block: ArticleBlock): CSSProperties {
  return {
    paddingTop: `${block.spaceTop || 0}px`,
    paddingBottom: `${block.spaceBottom || 0}px`,
  };
}

function richHtml(html: string, blockId: string, secondary = false) {
  const value = html?.trim() || "<p>Содержимое пока не добавлено.</p>";
  return injectRichTextHeadingAnchors(value, blockId, secondary);
}

function classNames(...values: Array<string | false | undefined>) {
  return values.filter(Boolean).join(" ");
}

export default function ArticleRenderer({
  blocks,
  compact = false,
}: ArticleRendererProps) {
  const headingAnchors = getHeadingBlockAnchorMap(blocks);

  if (!blocks.length) {
    return <div className={styles.empty}>В статье пока нет блоков.</div>;
  }

  return (
    <div className={classNames(styles.renderer, compact && styles.compact)}>
      {blocks.map((block) => {
        const wrapperClass = classNames(
          styles.block,
          styles[`width_${block.width}`],
          styles[`align_${block.align}`],
          styles[`surface_${block.surface}`],
          styles[`type_${block.type}`]
        );

        if (block.type === "spacer") {
          return (
            <div
              aria-hidden="true"
              className={classNames(wrapperClass, styles.spacer)}
              key={block.id}
              style={{ height: `${block.spacerHeight || 48}px` }}
            />
          );
        }

        if (block.type === "divider") {
          return (
            <div className={wrapperClass} key={block.id} style={blockStyle(block)}>
              <div
                className={classNames(
                  styles.divider,
                  styles[`divider_${block.dividerStyle || "solid"}`]
                )}
              />
            </div>
          );
        }

        if (block.type === "heading") {
          const Tag = block.level === 3 ? "h3" : "h2";
          const id = headingAnchors.get(block.id) || "section";

          return (
            <div className={wrapperClass} key={block.id} style={blockStyle(block)}>
              <Tag className={styles.heading} id={id}>
                <span />
                {block.title || "Раздел"}
              </Tag>
            </div>
          );
        }

        if (block.type === "text") {
          return (
            <div className={wrapperClass} key={block.id} style={blockStyle(block)}>
              <div
                className={styles.richText}
                dangerouslySetInnerHTML={{
                  __html: richHtml(block.html || "", block.id),
                }}
              />
            </div>
          );
        }

        if (block.type === "columns") {
          return (
            <div className={wrapperClass} key={block.id} style={blockStyle(block)}>
              <div className={styles.columns}>
                <div
                  className={styles.richText}
                  dangerouslySetInnerHTML={{
                    __html: richHtml(block.html || "", block.id),
                  }}
                />
                <div
                  className={styles.richText}
                  dangerouslySetInnerHTML={{
                    __html: richHtml(
                      block.secondaryHtml || "",
                      block.id,
                      true
                    ),
                  }}
                />
              </div>
            </div>
          );
        }

        if (block.type === "table") {
          const headers = block.tableHeaders?.length
            ? block.tableHeaders
            : ["Колонка 1"];
          const rows = block.tableRows || [];

          return (
            <div className={wrapperClass} key={block.id} style={blockStyle(block)}>
              <div className={styles.tableShell}>
                {block.tableCaption && (
                  <div className={styles.tableCaption}>{block.tableCaption}</div>
                )}

                <div className={styles.tableScroller}>
                  <table
                    className={classNames(
                      styles.articleTable,
                      styles[`table_${block.tableStyle || "default"}`],
                      block.tableCompact && styles.tableCompact,
                      block.tableFirstColumnStrong && styles.tableFirstColumnStrong
                    )}
                  >
                    <thead>
                      <tr>
                        {headers.map((header, index) => (
                          <th key={`${block.id}-header-${index}`} scope="col">
                            {header || `Колонка ${index + 1}`}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.length > 0 ? (
                        rows.map((row, rowIndex) => (
                          <tr key={`${block.id}-row-${rowIndex}`}>
                            {headers.map((_, cellIndex) => (
                              <td key={`${block.id}-cell-${rowIndex}-${cellIndex}`}>
                                {row[cellIndex] || "—"}
                              </td>
                            ))}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td className={styles.tableEmpty} colSpan={headers.length}>
                            Строки таблицы пока не добавлены.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        }

        if (block.type === "image") {
          const imageWidth = Math.min(100, Math.max(20, block.imageWidth || 80));
          const frameAlignment: CSSProperties =
            block.align === "right" || block.align === "rightInset"
              ? { marginLeft: "auto", marginRight: 0 }
              : block.align === "center"
                ? { marginLeft: "auto", marginRight: "auto" }
                : { marginLeft: 0, marginRight: "auto" };

          return (
            <figure className={wrapperClass} key={block.id} style={blockStyle(block)}>
              <div
                className={styles.imageFrame}
                style={{
                  ...frameAlignment,
                  width: `${imageWidth}%`,
                }}
              >
                {block.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt={block.imageAlt || block.caption || "Изображение статьи"}
                    className={styles.image}
                    loading="lazy"
                    src={block.imageUrl}
                    style={
                      (block.imageFit || "contain") === "contain"
                        ? {
                            height: "auto",
                            maxHeight: `${block.imageHeight || 720}px`,
                            objectFit: "contain",
                            objectPosition: block.imagePosition || "50% 50%",
                          }
                        : {
                            height: `${block.imageHeight || 360}px`,
                            objectFit: "cover",
                            objectPosition: block.imagePosition || "50% 50%",
                          }
                    }
                  />
                ) : (
                  <div
                    className={styles.imagePlaceholder}
                    style={{ height: `${block.imageHeight || 360}px` }}
                  >
                    <span>▧</span>
                    Изображение не выбрано
                  </div>
                )}

                {block.caption && (
                  <figcaption className={styles.caption}>{block.caption}</figcaption>
                )}
              </div>
            </figure>
          );
        }

        if (block.type === "quote") {
          return (
            <blockquote className={wrapperClass} key={block.id} style={blockStyle(block)}>
              <div className={styles.quoteMark}>“</div>
              <div
                className={styles.richText}
                dangerouslySetInnerHTML={{
                  __html: richHtml(block.html || "", block.id),
                }}
              />
              {block.quoteAuthor && (
                <cite className={styles.quoteAuthor}>— {block.quoteAuthor}</cite>
              )}
            </blockquote>
          );
        }

        return (
          <aside
            className={classNames(
              wrapperClass,
              styles.callout,
              styles[`tone_${block.tone || "info"}`]
            )}
            key={block.id}
            style={blockStyle(block)}
          >
            <div className={styles.calloutIcon}>!</div>
            <div>
              {block.title && <h3>{block.title}</h3>}
              <div
                className={styles.richText}
                dangerouslySetInnerHTML={{
                  __html: richHtml(block.html || "", block.id),
                }}
              />
            </div>
          </aside>
        );
      })}
    </div>
  );
}
