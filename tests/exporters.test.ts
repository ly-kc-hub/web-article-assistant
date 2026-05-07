import { describe, expect, it } from "vitest";

import {
  buildExportFilename,
  buildMarkdownExport,
  buildTextExport,
} from "@/lib/exporters";
import type { ExtractSuccessResponse } from "@/types/extract";

const article: ExtractSuccessResponse["data"] = {
  url: "https://example.com/article",
  title: "Example Article",
  byline: "Jane Doe",
  siteName: "Example Site",
  publishedTime: "2026-05-07",
  lang: "en",
  excerpt: "This is the article excerpt.",
  content: "<p>Hello world.</p>",
  textContent: "Hello world. This is the article body.",
  summary: "This article explains the main idea.",
  bullets: ["Point one", "Point two"],
  method: "fallback",
  summaryLength: "medium",
};

describe("exporters", () => {
  it("builds a markdown export with expected sections", () => {
    const markdown = buildMarkdownExport(article);

    expect(markdown).toContain("# Example Article");
    expect(markdown).toContain("## Summary");
    expect(markdown).toContain("## Key Points");
    expect(markdown).toContain("## Full Text");
    expect(markdown).toContain("Point one");
  });

  it("builds a text export with expected headings", () => {
    const text = buildTextExport(article);

    expect(text).toContain("Example Article");
    expect(text).toContain("SUMMARY");
    expect(text).toContain("KEY POINTS");
    expect(text).toContain("FULL TEXT");
  });

  it("builds a stable export filename", () => {
    expect(buildExportFilename(article, "md")).toBe("example-article.md");
  });
});
