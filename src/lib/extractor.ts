import "server-only";

import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import { chromium } from "playwright";

import type { ArticleMetadata, ExtractErrorCode } from "@/types/extract";

const REQUEST_TIMEOUT_MS = 12000;
const BROWSER_TIMEOUT_MS = 20000;
const STATIC_RETRY_DELAY_MS = 900;
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36";

export class ExtractorError extends Error {
  constructor(
    public readonly code: ExtractErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ExtractorError";
  }
}

function cleanText(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function resolvePublishedTime(document: Document): string | null {
  const selectors = [
    'meta[property="article:published_time"]',
    'meta[name="pubdate"]',
    'meta[name="publishdate"]',
    'meta[name="date"]',
    "time[datetime]",
  ];

  for (const selector of selectors) {
    const node = document.querySelector(selector);

    if (!node) {
      continue;
    }

    const content = cleanText(
      node.getAttribute("content") ?? node.getAttribute("datetime"),
    );

    if (content) {
      return content;
    }
  }

  return null;
}

function stripHtml(html: string): string {
  return cleanText(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseArticleFromHtml(html: string, url: string): ArticleMetadata {
  const dom = new JSDOM(html, { url });
  const reader = new Readability(dom.window.document);
  const parsed = reader.parse();

  if (!parsed?.content) {
    throw new ExtractorError(
      "EXTRACTION_FAILED",
      "The page loaded, but no readable article content was found.",
    );
  }

  const document = dom.window.document;
  const textContent = cleanText(parsed.textContent) || stripHtml(parsed.content);

  if (!textContent) {
    throw new ExtractorError(
      "EXTRACTION_FAILED",
      "Readable content was extracted, but the text body is empty.",
    );
  }

  return {
    url,
    title: cleanText(parsed.title) || cleanText(document.title) || "Untitled article",
    byline: cleanText(parsed.byline) || null,
    siteName:
      cleanText(parsed.siteName) ||
      cleanText(document.querySelector("meta[property='og:site_name']")?.getAttribute("content")) ||
      null,
    publishedTime: resolvePublishedTime(document),
    lang: cleanText(document.documentElement.lang) || null,
    excerpt:
      cleanText(parsed.excerpt) ||
      cleanText(document.querySelector("meta[name='description']")?.getAttribute("content")),
    content: parsed.content,
    textContent,
  };
}

async function fetchStaticHtml(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        "user-agent": USER_AGENT,
        accept: "text/html,application/xhtml+xml",
      },
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      throw new ExtractorError(
        "FETCH_FAILED",
        `Failed to fetch article: ${response.status} ${response.statusText}`,
      );
    }

    return await response.text();
  } catch (error) {
    if (error instanceof ExtractorError) {
      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new ExtractorError("FETCH_FAILED", "Fetching the article timed out.");
    }

    throw new ExtractorError(
      "FETCH_FAILED",
      error instanceof Error ? error.message : "Unknown fetch failure.",
    );
  } finally {
    clearTimeout(timer);
  }
}

async function fetchStaticHtmlWithRetry(url: string): Promise<string> {
  try {
    return await fetchStaticHtml(url);
  } catch (error) {
    if (!(error instanceof ExtractorError) || error.code !== "FETCH_FAILED") {
      throw error;
    }

    await sleep(STATIC_RETRY_DELAY_MS);

    try {
      return await fetchStaticHtml(url);
    } catch (retryError) {
      if (retryError instanceof ExtractorError) {
        throw new ExtractorError(
          retryError.code,
          `${retryError.message} The target site may block automated requests or require browser rendering.`,
        );
      }

      throw retryError;
    }
  }
}

async function fetchDynamicHtml(url: string): Promise<string> {
  let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;

  try {
    browser = await chromium.launch({
      headless: true,
    });

    const context = await browser.newContext({
      userAgent: USER_AGENT,
    });
    const page = await context.newPage();

    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: BROWSER_TIMEOUT_MS,
    });
    await page.waitForLoadState("networkidle", {
      timeout: 5000,
    }).catch(() => undefined);

    return await page.content();
  } catch (error) {
    throw new ExtractorError(
      "EXTRACTION_FAILED",
      error instanceof Error
        ? `Dynamic extraction fallback failed: ${error.message}`
        : "Dynamic extraction fallback failed.",
    );
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

export async function extractArticle(url: string): Promise<ArticleMetadata> {
  const staticHtml = await fetchStaticHtmlWithRetry(url);

  try {
    return parseArticleFromHtml(staticHtml, url);
  } catch (error) {
    if (!(error instanceof ExtractorError) || error.code !== "EXTRACTION_FAILED") {
      throw error;
    }

    try {
      const dynamicHtml = await fetchDynamicHtml(url);
      return parseArticleFromHtml(dynamicHtml, url);
    } catch (dynamicError) {
      if (dynamicError instanceof ExtractorError) {
        throw new ExtractorError(
          dynamicError.code,
          `${dynamicError.message} Try a public article page, or install Chromium for Playwright if the page depends on JavaScript.`,
        );
      }

      throw dynamicError;
    }
  }
}
