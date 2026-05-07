import { uiText, type Locale } from "@/lib/i18n";
import type { ExtractSuccessResponse } from "@/types/extract";

type ArticleData = ExtractSuccessResponse["data"];

function safeText(value: string | null | undefined): string {
  return (value ?? "").trim();
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "article";
}

function buildMetaLines(article: ArticleData, locale: Locale = "en"): string[] {
  const t = uiText[locale];
  return [
    `${t.exportTitle}: ${article.title}`,
    `${t.exportUrl}: ${article.url}`,
    `${t.exportSource}: ${safeText(article.siteName) || t.unknown}`,
    `${t.exportAuthor}: ${safeText(article.byline) || t.unknown}`,
    `${t.exportPublished}: ${safeText(article.publishedTime) || t.unknown}`,
    `${t.exportLanguage}: ${safeText(article.lang) || t.unknown}`,
    `${t.exportMethod}: ${article.method}`,
  ];
}

export function buildMarkdownExport(
  article: ArticleData,
  locale: Locale = "en",
): string {
  const t = uiText[locale];
  const bullets = article.bullets.map((item) => `- ${item}`).join("\n");

  return [
    `# ${article.title}`,
    "",
    ...buildMetaLines(article, locale).map((line) => `- ${line}`),
    "",
    `## ${t.exportSummary}`,
    "",
    article.summary,
    "",
    `## ${t.exportKeyPoints}`,
    "",
    bullets,
    "",
    `## ${t.exportExcerpt}`,
    "",
    article.excerpt || t.exportNoExcerpt,
    "",
    `## ${t.exportFullText}`,
    "",
    article.textContent,
    "",
  ].join("\n");
}

export function buildTextExport(article: ArticleData, locale: Locale = "en"): string {
  const t = uiText[locale];
  return [
    article.title,
    "=".repeat(article.title.length),
    "",
    ...buildMetaLines(article, locale),
    "",
    t.exportSummary.toUpperCase(),
    "-------",
    article.summary,
    "",
    t.exportKeyPoints.toUpperCase(),
    "----------",
    ...article.bullets.map((item, index) => `${index + 1}. ${item}`),
    "",
    t.exportExcerpt.toUpperCase(),
    "-------",
    article.excerpt || t.exportNoExcerpt,
    "",
    t.exportFullText.toUpperCase(),
    "---------",
    article.textContent,
    "",
  ].join("\n");
}

export function downloadTextFile(
  content: string,
  filename: string,
  mimeType: string,
) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  anchor.click();

  URL.revokeObjectURL(url);
}

export function buildExportFilename(article: ArticleData, extension: string): string {
  return `${slugify(article.title)}.${extension}`;
}
