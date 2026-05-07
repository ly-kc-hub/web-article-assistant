import { NextResponse } from "next/server";

import { summarizeArticle } from "@/lib/summarizer";
import type {
  ExtractResponse,
  OutputLanguage,
  ResummarizeRequest,
  SummaryLength,
} from "@/types/extract";

export const runtime = "nodejs";

function normalizeSummaryLength(value: string | undefined): SummaryLength {
  if (value === "short" || value === "long") {
    return value;
  }

  return "medium";
}

function normalizeOutputLanguage(value: string | undefined): OutputLanguage {
  return value === "zh" ? "zh" : "en";
}

export async function POST(request: Request) {
  let body: ResummarizeRequest;

  try {
    body = (await request.json()) as ResummarizeRequest;
  } catch {
    return NextResponse.json<ExtractResponse>(
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

  if (!body.article?.textContent) {
    return NextResponse.json<ExtractResponse>(
      {
        ok: false,
        error: {
          code: "INVALID_REQUEST",
          message: "Article content is required.",
        },
      },
      { status: 400 },
    );
  }

  try {
    const summary = await summarizeArticle(
      body.article,
      normalizeSummaryLength(body.summaryLength),
      normalizeOutputLanguage(body.outputLanguage),
    );

    return NextResponse.json<ExtractResponse>({
      ok: true,
      data: {
        ...body.article,
        ...summary,
      },
    });
  } catch {
    return NextResponse.json<ExtractResponse>(
      {
        ok: false,
        error: {
          code: "SUMMARIZATION_FAILED",
          message: "The article could not be re-summarized.",
        },
      },
      { status: 500 },
    );
  }
}
