import { NextResponse } from "next/server";

import { extractArticle, ExtractorError } from "@/lib/extractor";
import { summarizeArticle } from "@/lib/summarizer";
import { normalizeUrl } from "@/lib/validators";
import type { ExtractRequest, ExtractResponse, SummaryLength } from "@/types/extract";

export const runtime = "nodejs";

function normalizeSummaryLength(value: string | undefined): SummaryLength {
  if (value === "short" || value === "long") {
    return value;
  }

  return "medium";
}

export async function POST(request: Request) {
  let body: ExtractRequest;

  try {
    body = (await request.json()) as ExtractRequest;
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

  const normalizedUrl = normalizeUrl(body.url ?? "");

  if (!normalizedUrl) {
    return NextResponse.json<ExtractResponse>(
      {
        ok: false,
        error: {
          code: "INVALID_URL",
          message: "Please provide a valid http or https URL.",
        },
      },
      { status: 400 },
    );
  }

  try {
    const article = await extractArticle(normalizedUrl);
    const summary = await summarizeArticle(
      article,
      normalizeSummaryLength(body.summaryLength),
    );

    return NextResponse.json<ExtractResponse>({
      ok: true,
      data: {
        ...article,
        ...summary,
      },
    });
  } catch (error) {
    if (error instanceof ExtractorError) {
      return NextResponse.json<ExtractResponse>(
        {
          ok: false,
          error: {
            code: error.code,
            message: error.message,
          },
        },
        { status: error.code === "FETCH_FAILED" ? 502 : 422 },
      );
    }

    return NextResponse.json<ExtractResponse>(
      {
        ok: false,
        error: {
          code: "SUMMARIZATION_FAILED",
          message: "The article was extracted, but summarization failed unexpectedly.",
        },
      },
      { status: 500 },
    );
  }
}
