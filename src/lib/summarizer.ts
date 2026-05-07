import "server-only";

import OpenAI from "openai";

import type { ArticleMetadata, SummaryMethod } from "@/types/extract";

interface SummaryResult {
  summary: string;
  bullets: string[];
  method: SummaryMethod;
}

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[。！？.!?])\s+|\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function fallbackSummary(article: ArticleMetadata): SummaryResult {
  const sentences = splitSentences(article.textContent);
  const bullets = sentences.filter((item) => item.length >= 24).slice(0, 4);

  return {
    summary:
      sentences.slice(0, 3).join(" ") ||
      article.excerpt ||
      "The article content was extracted, but there was not enough text to summarize further.",
    bullets:
      bullets.length > 0
        ? bullets
        : [article.excerpt || "No excerpt was available for this article."],
    method: "fallback",
  };
}

function normalizeBullet(value: string): string | null {
  const cleaned = value.replace(/^[-*•\d.\s]+/, "").trim();
  return cleaned || null;
}

async function summarizeWithOpenAi(
  article: ArticleMetadata,
): Promise<SummaryResult | null> {
  if (!openai) {
    return null;
  }

  const input = [
    `Title: ${article.title}`,
    article.byline ? `Author: ${article.byline}` : "",
    article.siteName ? `Source: ${article.siteName}` : "",
    article.publishedTime ? `Published: ${article.publishedTime}` : "",
    "",
    "Return strict JSON with keys summary and bullets.",
    "summary must be 2-3 sentences.",
    "bullets must contain 3 to 5 concise key points.",
    "Do not include markdown.",
    "",
    article.textContent.slice(0, 12000),
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input,
      text: {
        format: {
          type: "json_schema",
          name: "article_summary",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              summary: { type: "string" },
              bullets: {
                type: "array",
                items: { type: "string" },
                minItems: 3,
                maxItems: 5,
              },
            },
            required: ["summary", "bullets"],
          },
        },
      },
    });

    if (!response.output_text) {
      return null;
    }

    const parsed = JSON.parse(response.output_text) as {
      summary?: string;
      bullets?: string[];
    };

    const summary = parsed.summary?.trim();
    const bullets = (parsed.bullets ?? [])
      .map((item) => normalizeBullet(item))
      .filter((item): item is string => Boolean(item));

    if (!summary || bullets.length === 0) {
      return null;
    }

    return {
      summary,
      bullets,
      method: "openai",
    };
  } catch {
    return null;
  }
}

export async function summarizeArticle(
  article: ArticleMetadata,
): Promise<SummaryResult> {
  const aiResult = await summarizeWithOpenAi(article);
  return aiResult ?? fallbackSummary(article);
}

function fallbackAnswer(article: ArticleMetadata, question: string): {
  answer: string;
  method: SummaryMethod;
} {
  const excerpt = article.excerpt || "";
  const candidates = splitSentences(article.textContent).filter(
    (item) => item.length >= 20,
  );
  const joined = candidates.slice(0, 3).join(" ");

  return {
    answer: [
      `Question: ${question}`,
      "",
      joined ||
        excerpt ||
        "The article was extracted successfully, but there was not enough text to answer this question confidently without a model.",
    ].join("\n"),
    method: "fallback",
  };
}

export async function answerArticleQuestion(
  article: ArticleMetadata,
  question: string,
): Promise<{ answer: string; method: SummaryMethod }> {
  if (!openai) {
    return fallbackAnswer(article, question);
  }

  const input = [
    `Title: ${article.title}`,
    article.byline ? `Author: ${article.byline}` : "",
    article.siteName ? `Source: ${article.siteName}` : "",
    article.publishedTime ? `Published: ${article.publishedTime}` : "",
    "",
    "You are answering one question about a single article.",
    "Use only the provided article content.",
    "If the article does not support a claim, say that the answer is not supported by the article.",
    "Answer in plain text with 1 to 4 short paragraphs.",
    "",
    `Question: ${question}`,
    "",
    article.textContent.slice(0, 14000),
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input,
    });

    const answer = response.output_text?.trim();

    if (!answer) {
      return fallbackAnswer(article, question);
    }

    return {
      answer,
      method: "openai",
    };
  } catch {
    return fallbackAnswer(article, question);
  }
}
