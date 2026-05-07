import "server-only";

import OpenAI from "openai";

import type {
  ArticleMetadata,
  OutputLanguage,
  SummaryLength,
  SummaryMethod,
} from "@/types/extract";

interface SummaryResult {
  summary: string;
  bullets: string[];
  method: SummaryMethod;
  summaryLength: SummaryLength;
  outputLanguage: OutputLanguage;
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

function getSummaryConfig(summaryLength: SummaryLength) {
  if (summaryLength === "short") {
    return {
      sentenceCount: 1,
      bulletCount: 3,
      promptSummary: "summary must be exactly 1 concise sentence when possible.",
      promptBullets: "bullets must contain exactly 3 concise key points when possible.",
    };
  }

  if (summaryLength === "long") {
    return {
      sentenceCount: 4,
      bulletCount: 5,
      promptSummary: "summary must be exactly 4 concise sentences when possible.",
      promptBullets: "bullets must contain exactly 5 concise key points when possible.",
    };
  }

  return {
    sentenceCount: 2,
    bulletCount: 3,
    promptSummary: "summary must be exactly 2 concise sentences when possible.",
    promptBullets: "bullets must contain exactly 3 concise key points when possible.",
  };
}

function getOutputLanguageInstruction(outputLanguage: OutputLanguage) {
  return outputLanguage === "zh"
    ? "Write the summary and bullets in Simplified Chinese."
    : "Write the summary and bullets in English.";
}

function getQuestionLanguageInstruction(outputLanguage: OutputLanguage) {
  return outputLanguage === "zh"
    ? "Answer in Simplified Chinese."
    : "Answer in English.";
}

function fallbackSummary(
  article: ArticleMetadata,
  summaryLength: SummaryLength,
  outputLanguage: OutputLanguage,
): SummaryResult {
  const sentences = splitSentences(article.textContent);
  const config = getSummaryConfig(summaryLength);
  const bullets = sentences
    .filter((item) => item.length >= 24)
    .slice(0, config.bulletCount);

  if (outputLanguage === "zh") {
    return {
      summary:
        sentences.slice(0, config.sentenceCount).join(" ") ||
        article.excerpt ||
        "文章已提取，但可用于继续摘要的文本不足。",
      bullets:
        bullets.length > 0 ? bullets : [article.excerpt || "这篇文章没有可用摘录。"],
      method: "fallback",
      summaryLength,
      outputLanguage,
    };
  }

  return {
    summary:
      sentences.slice(0, config.sentenceCount).join(" ") ||
      article.excerpt ||
      "The article content was extracted, but there was not enough text to summarize further.",
    bullets:
      bullets.length > 0
        ? bullets
        : [article.excerpt || "No excerpt was available for this article."],
    method: "fallback",
    summaryLength,
    outputLanguage,
  };
}

async function summarizeWithDeepSeek(
  article: ArticleMetadata,
  summaryLength: SummaryLength,
  outputLanguage: OutputLanguage,
): Promise<SummaryResult | null> {
  if (!deepseek) {
    return null;
  }

  const config = getSummaryConfig(summaryLength);
  const input = [
    `Title: ${article.title}`,
    article.byline ? `Author: ${article.byline}` : "",
    article.siteName ? `Source: ${article.siteName}` : "",
    article.publishedTime ? `Published: ${article.publishedTime}` : "",
    "",
    "Return strict JSON with keys summary and bullets.",
    config.promptSummary,
    config.promptBullets,
    getOutputLanguageInstruction(outputLanguage),
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
      .slice(0, config.bulletCount);

    if (!summary || bullets.length === 0) {
      return null;
    }

    return {
      summary,
      bullets,
      method: "deepseek",
      summaryLength,
      outputLanguage,
    };
  } catch {
    return null;
  }
}

export async function summarizeArticle(
  article: ArticleMetadata,
  summaryLength: SummaryLength = "medium",
  outputLanguage: OutputLanguage = "en",
): Promise<SummaryResult> {
  const modelResult = await summarizeWithDeepSeek(
    article,
    summaryLength,
    outputLanguage,
  );
  return modelResult ?? fallbackSummary(article, summaryLength, outputLanguage);
}

function fallbackAnswer(
  article: ArticleMetadata,
  question: string,
  outputLanguage: OutputLanguage,
): {
  answer: string;
  method: SummaryMethod;
} {
  const excerpt = article.excerpt || "";
  const candidates = splitSentences(article.textContent).filter(
    (item) => item.length >= 20,
  );
  const joined = candidates.slice(0, 2).join(" ");

  if (outputLanguage === "zh") {
    return {
      answer: [
        `问题：${question}`,
        "",
        joined || excerpt || "文章已提取成功，但没有足够文本支持可靠回答。",
      ].join("\n"),
      method: "fallback",
    };
  }

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
  outputLanguage: OutputLanguage = "en",
): Promise<{ answer: string; method: SummaryMethod }> {
  if (!deepseek) {
    return fallbackAnswer(article, question, outputLanguage);
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
    getQuestionLanguageInstruction(outputLanguage),
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
      return fallbackAnswer(article, question, outputLanguage);
    }

    return {
      answer,
      method: "deepseek",
    };
  } catch {
    return fallbackAnswer(article, question, outputLanguage);
  }
}
