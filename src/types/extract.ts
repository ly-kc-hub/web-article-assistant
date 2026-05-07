export type ExtractErrorCode =
  | "INVALID_URL"
  | "FETCH_FAILED"
  | "EXTRACTION_FAILED"
  | "SUMMARIZATION_FAILED"
  | "INVALID_REQUEST";

export type SummaryMethod = "openai" | "fallback";

export interface ExtractRequest {
  url: string;
}

export interface AskArticleRequest {
  article: ArticleMetadata;
  question: string;
}

export interface ArticleMetadata {
  url: string;
  title: string;
  byline: string | null;
  siteName: string | null;
  publishedTime: string | null;
  lang: string | null;
  excerpt: string;
  content: string;
  textContent: string;
}

export interface ExtractSuccessResponse {
  ok: true;
  data: ArticleMetadata & {
    summary: string;
    bullets: string[];
    method: SummaryMethod;
  };
}

export interface HistoryEntry {
  id: string;
  savedAt: string;
  article: ExtractSuccessResponse["data"];
}

export interface ExtractErrorResponse {
  ok: false;
  error: {
    code: ExtractErrorCode;
    message: string;
  };
}

export type ExtractResponse = ExtractSuccessResponse | ExtractErrorResponse;

export interface AskArticleSuccessResponse {
  ok: true;
  data: {
    answer: string;
    method: SummaryMethod;
  };
}

export interface AskArticleErrorResponse {
  ok: false;
  error: {
    code: "INVALID_REQUEST" | "SUMMARIZATION_FAILED";
    message: string;
  };
}

export type AskArticleResponse =
  | AskArticleSuccessResponse
  | AskArticleErrorResponse;
