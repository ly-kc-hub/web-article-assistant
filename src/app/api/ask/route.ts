import { NextResponse } from "next/server";

import { answerArticleQuestion } from "@/lib/summarizer";
import type { AskArticleRequest, AskArticleResponse } from "@/types/extract";

export const runtime = "nodejs";

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
    const answer = await answerArticleQuestion(body.article, body.question.trim());

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
