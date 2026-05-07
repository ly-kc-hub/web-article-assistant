import { beforeAll, describe, expect, it, vi } from "vitest";

import type { ArticleMetadata } from "@/types/extract";

vi.mock("server-only", () => ({}), { virtual: true });

const article: ArticleMetadata = {
  url: "https://example.com/article",
  title: "Example Article",
  byline: "Jane Doe",
  siteName: "Example Site",
  publishedTime: "2026-05-07",
  lang: "en",
  excerpt: "This is the article excerpt.",
  content: "<p>Hello world.</p>",
  textContent:
    "Sentence one is long enough to be summarized well. Sentence two adds more detail for the summary. Sentence three explains an additional takeaway. Sentence four gives more context for the long summary. Sentence five adds a final point for the reader.",
};

let summarizeArticle: typeof import("@/lib/summarizer").summarizeArticle;

beforeAll(async () => {
  ({ summarizeArticle } = await import("@/lib/summarizer"));
});

describe("summarizeArticle", () => {
  it("returns the requested short summary length in fallback mode", async () => {
    const result = await summarizeArticle(article, "short");

    expect(result.summaryLength).toBe("short");
    expect(result.bullets.length).toBeGreaterThan(0);
    expect(result.bullets.length).toBeLessThanOrEqual(3);
  });

  it("returns the requested long summary length in fallback mode", async () => {
    const result = await summarizeArticle(article, "long");

    expect(result.summaryLength).toBe("long");
    expect(result.bullets.length).toBeGreaterThan(0);
    expect(result.bullets.length).toBeLessThanOrEqual(5);
  });
});
