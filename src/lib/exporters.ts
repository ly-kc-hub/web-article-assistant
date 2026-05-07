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

function buildMetaLines(article: ArticleData): string[] {
  return [
    `Title: ${article.title}`,
    `URL: ${article.url}`,
    `Source: ${safeText(article.siteName) || "Unknown"}`,
    `Author: ${safeText(article.byline) || "Unknown"}`,
    `Published: ${safeText(article.publishedTime) || "Unknown"}`,
    `Language: ${safeText(article.lang) || "Unknown"}`,
    `Summary Method: ${article.method}`,
  ];
}

export function buildMarkdownExport(article: ArticleData): string {
  const bullets = article.bullets.map((item) => `- ${item}`).join("\n");

  return [
    `# ${article.title}`,
    "",
    ...buildMetaLines(article).map((line) => `- ${line}`),
    "",
    "## Summary",
    "",
    article.summary,
    "",
    "## Key Points",
    "",
    bullets,
    "",
    "## Excerpt",
    "",
    article.excerpt || "No excerpt available.",
    "",
    "## Full Text",
    "",
    article.textContent,
    "",
  ].join("\n");
}

export function buildTextExport(article: ArticleData): string {
  return [
    article.title,
    "=".repeat(article.title.length),
    "",
    ...buildMetaLines(article),
    "",
    "SUMMARY",
    "-------",
    article.summary,
    "",
    "KEY POINTS",
    "----------",
    ...article.bullets.map((item, index) => `${index + 1}. ${item}`),
    "",
    "EXCERPT",
    "-------",
    article.excerpt || "No excerpt available.",
    "",
    "FULL TEXT",
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
