import { NextResponse } from "next/server";

import { answerArticleQuestion } from "@/lib/summarizer";
import type { AskArticleRequest, AskArticleResponse, OutputLanguage } from "@/types/extract";

export const runtime = "nodejs";

function normalizeOutputLanguage(value: string | undefined): OutputLanguage {
  return value === "zh" ? "zh" : "en";
}

export async function POST(request: Request) {
  let body: AskArticleRequest;

  try {
    body = (await request.json()) as AskArticleRequest;
  } catch {
    return NextResponse.json<AskArticleResponse>(
      {
        ok: false,
        error: {
          code: "INVALID_REQUEST",
          message: "Request body must be valid JSON.",
        },
      },
      { status: 400 },
    );
  }

  if (!body.article?.textContent || !body.question?.trim()) {
    return NextResponse.json<AskArticleResponse>(
      {
        ok: false,
        error: {
          code: "INVALID_REQUEST",
          message: "Both article content and a non-empty question are required.",
        },
      },
      { status: 400 },
    );
  }

  try {
    const answer = await answerArticleQuestion(
      body.article,
      body.question.trim(),
      normalizeOutputLanguage(body.outputLanguage),
    );

    return NextResponse.json<AskArticleResponse>({
      ok: true,
      data: answer,
    });
  } catch {
    return NextResponse.json<AskArticleResponse>(
      {
        ok: false,
        error: {
          code: "SUMMARIZATION_FAILED",
          message: "The question could not be answered for this article.",
        },
      },
      { status: 500 },
    );
  }
}
