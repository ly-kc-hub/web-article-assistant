import "server-only";

import OpenAI from "openai";

import type { ArticleMetadata, SummaryMethod } from "@/types/extract";

interface SummaryResult {
  summary: string;
  bullets: string[];
  method: SummaryMethod;
}

const deepseek = process.env.DEEPSEEK_API_KEY
  ? new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: "https://api.deepseek.com",
    })
  : null;

const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || "deepseek-v4-flash";

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[。！？.!?])\s+|\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeBullet(value: string): string | null {
  const cleaned = value.replace(/^[-*•\d.\s]+/, "").trim();
  return cleaned || null;
}

function extractJsonObject(text: string): string | null {
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : null;
}

function fallbackSummary(article: ArticleMetadata): SummaryResult {
  const sentences = splitSentences(article.textContent);
  const bullets = sentences.filter((item) => item.length >= 24).slice(0, 3);

  return {
    summary:
      sentences.slice(0, 2).join(" ") ||
      article.excerpt ||
      "The article content was extracted, but there was not enough text to summarize further.",
    bullets:
      bullets.length > 0
        ? bullets
        : [article.excerpt || "No excerpt was available for this article."],
    method: "fallback",
  };
}

async function summarizeWithDeepSeek(
  article: ArticleMetadata,
): Promise<SummaryResult | null> {
  if (!deepseek) {
    return null;
  }

  const input = [
    `Title: ${article.title}`,
    article.byline ? `Author: ${article.byline}` : "",
    article.siteName ? `Source: ${article.siteName}` : "",
    article.publishedTime ? `Published: ${article.publishedTime}` : "",
    "",
    "Return strict JSON with keys summary and bullets.",
    "summary must be exactly 2 concise sentences when possible.",
    "bullets must contain exactly 3 concise key points when possible.",
    "Do not include markdown.",
    "",
    article.textContent.slice(0, 12000),
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const response = await deepseek.chat.completions.create({
      model: DEEPSEEK_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You summarize articles and return only valid JSON with keys summary and bullets.",
        },
        {
          role: "user",
          content: input,
        },
      ],
      response_format: {
        type: "json_object",
      },
      stream: false,
    });

    const content = response.choices[0]?.message?.content?.trim();

    if (!content) {
      return null;
    }

    const jsonText = extractJsonObject(content) ?? content;
    const parsed = JSON.parse(jsonText) as {
      summary?: string;
      bullets?: string[];
    };

    const summary = parsed.summary?.trim();
    const bullets = (parsed.bullets ?? [])
      .map((item) => normalizeBullet(item))
      .filter((item): item is string => Boolean(item))
      .slice(0, 3);

    if (!summary || bullets.length === 0) {
      return null;
    }

    return {
      summary,
      bullets,
      method: "deepseek",
    };
  } catch {
    return null;
  }
}

export async function summarizeArticle(
  article: ArticleMetadata,
): Promise<SummaryResult> {
  const modelResult = await summarizeWithDeepSeek(article);
  return modelResult ?? fallbackSummary(article);
}

function fallbackAnswer(article: ArticleMetadata, question: string): {
  answer: string;
  method: SummaryMethod;
} {
  const excerpt = article.excerpt || "";
  const candidates = splitSentences(article.textContent).filter(
    (item) => item.length >= 20,
  );
  const joined = candidates.slice(0, 2).join(" ");

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
  if (!deepseek) {
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
    "Answer in plain text with 1 to 3 short paragraphs.",
    "",
    `Question: ${question}`,
    "",
    article.textContent.slice(0, 14000),
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const response = await deepseek.chat.completions.create({
      model: DEEPSEEK_MODEL,
      messages: [
        {
          role: "system",
          content:
            "Answer the user's question using only the provided article content. Be concise and factual.",
        },
        {
          role: "user",
          content: input,
        },
      ],
      stream: false,
    });

    const answer = response.choices[0]?.message?.content?.trim();

    if (!answer) {
      return fallbackAnswer(article, question);
    }

    return {
      answer,
      method: "deepseek",
    };
  } catch {
    return fallbackAnswer(article, question);
  }
}
