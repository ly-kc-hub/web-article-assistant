"use client";

import { useMemo, useState } from "react";

import {
  buildExportFilename,
  buildMarkdownExport,
  buildTextExport,
  downloadTextFile,
} from "@/lib/exporters";
import type { AskArticleResponse, ExtractResponse } from "@/types/extract";

interface ResultCardProps {
  result: ExtractResponse | null;
}

const EXAMPLE_QUESTIONS = [
  "What is the core argument of this article?",
  "What evidence or examples does the author use?",
  "What conclusion does the article reach?",
  "What are the main risks or tradeoffs discussed?",
];

function sanitizeArticleHtml(html: string): string {
  if (typeof window === "undefined") {
    return html;
  }

  const parser = new DOMParser();
  const document = parser.parseFromString(html, "text/html");

  document
    .querySelectorAll("script, style, iframe, object, embed, form, button")
    .forEach((node) => node.remove());

  document.querySelectorAll("*").forEach((element) => {
    for (const attribute of [...element.attributes]) {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim().toLowerCase();

      if (name.startsWith("on")) {
        element.removeAttribute(attribute.name);
      }

      if ((name === "href" || name === "src") && value.startsWith("javascript:")) {
        element.removeAttribute(attribute.name);
      }
    }

    if (element instanceof HTMLAnchorElement) {
      element.rel = "noreferrer noopener";
      element.target = "_blank";
    }
  });

  return document.body.innerHTML;
}

async function copyText(value: string) {
  await navigator.clipboard.writeText(value);
}

export function ResultCard({ result }: ResultCardProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [qaAnswer, setQaAnswer] = useState<AskArticleResponse | null>(null);
  const [isAsking, setIsAsking] = useState(false);
  const article = result?.ok ? result.data : null;
  const sanitizedHtml = useMemo(
    () => (article ? sanitizeArticleHtml(article.content) : ""),
    [article],
  );

  if (!result) {
    return (
      <section className="rounded-3xl border border-dashed border-zinc-300 bg-zinc-50 p-6">
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-zinc-900">Ready for an article</h2>
          <p className="text-sm leading-7 text-zinc-500">
            Submit one article URL to unlock summary, key points, readable content, exports, and single-turn QA.
          </p>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-200">
            <p className="text-sm font-medium text-zinc-900">After extraction</p>
            <p className="mt-2 text-sm leading-7 text-zinc-500">
              Review metadata, summary, readable article HTML, and export actions.
            </p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-200">
            <p className="text-sm font-medium text-zinc-900">Then ask questions</p>
            <p className="mt-2 text-sm leading-7 text-zinc-500">
              Ask one focused question against the extracted article content.
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (!result.ok) {
    return (
      <section className="rounded-3xl border border-red-200 bg-red-50 p-6">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-red-800">{result.error.code}</p>
          <p className="text-sm leading-7 text-red-700">{result.error.message}</p>
        </div>
        <div className="mt-4 rounded-2xl bg-white/70 p-4 text-sm text-red-700">
          <p className="font-medium">What to try next</p>
          <ul className="mt-2 space-y-2">
            <li>• Check that the URL opens in a normal browser.</li>
            <li>• Try a public article page instead of a login-only page.</li>
            <li>• If the page is JS-rendered, ensure `Playwright` Chromium is installed.</li>
          </ul>
        </div>
      </section>
    );
  }

  const articleData = result.data;

  async function handleCopy(key: string, value: string) {
    try {
      await copyText(value);
      setCopiedKey(key);
      window.setTimeout(
        () => setCopiedKey((current) => (current === key ? null : current)),
        1600,
      );
    } catch {
      setCopiedKey(null);
    }
  }

  function handleDownloadMarkdown() {
    downloadTextFile(
      buildMarkdownExport(articleData),
      buildExportFilename(articleData, "md"),
      "text/markdown;charset=utf-8",
    );
  }

  function handleDownloadText() {
    downloadTextFile(
      buildTextExport(articleData),
      buildExportFilename(articleData, "txt"),
      "text/plain;charset=utf-8",
    );
  }

  function applyExampleQuestion(value: string) {
    setQuestion(value);
    setQaAnswer(null);
  }

  async function handleAskQuestion(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = question.trim();

    if (!trimmed) {
      return;
    }

    setIsAsking(true);
    setQaAnswer(null);

    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          article: articleData,
          question: trimmed,
        }),
      });

      const payload = (await response.json()) as AskArticleResponse;
      setQaAnswer(payload);
    } catch {
      setQaAnswer({
        ok: false,
        error: {
          code: "SUMMARIZATION_FAILED",
          message: "The question request failed before the server returned a response.",
        },
      });
    } finally {
      setIsAsking(false);
    }
  }

  return (
    <section className="space-y-6 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
      <header className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
          {articleData.siteName ? <span>{articleData.siteName}</span> : null}
          {articleData.byline ? <span>· {articleData.byline}</span> : null}
          {articleData.publishedTime ? <span>· {articleData.publishedTime}</span> : null}
          <span className="rounded-full bg-zinc-100 px-2 py-1 text-zinc-700">
            {articleData.method}
          </span>
        </div>
        <div className="space-y-3">
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-950">
            {articleData.title}
          </h2>
          <a
            href={articleData.url}
            target="_blank"
            rel="noreferrer"
            className="break-all text-sm text-zinc-600 underline decoration-zinc-300 underline-offset-4"
          >
            {articleData.url}
          </a>
        </div>
      </header>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => handleCopy("summary", articleData.summary)}
          className="rounded-full border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50"
        >
          {copiedKey === "summary" ? "Summary copied" : "Copy summary"}
        </button>
        <button
          type="button"
          onClick={() => handleCopy("bullets", articleData.bullets.join("\n"))}
          className="rounded-full border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50"
        >
          {copiedKey === "bullets" ? "Key points copied" : "Copy key points"}
        </button>
        <button
          type="button"
          onClick={() => handleCopy("text", articleData.textContent)}
          className="rounded-full border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50"
        >
          {copiedKey === "text" ? "Text copied" : "Copy full text"}
        </button>
        <button
          type="button"
          onClick={handleDownloadMarkdown}
          className="rounded-full border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50"
        >
          Download Markdown
        </button>
        <button
          type="button"
          onClick={handleDownloadText}
          className="rounded-full border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50"
        >
          Download TXT
        </button>
      </div>

      <section className="rounded-2xl bg-zinc-50 p-5">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-zinc-950">Ask this article</h3>
            {qaAnswer?.ok ? (
              <span className="rounded-full bg-white px-2.5 py-1 text-xs text-zinc-500 ring-1 ring-zinc-200">
                Answered with {qaAnswer.data.method}
              </span>
            ) : null}
          </div>
          <p className="text-sm leading-7 text-zinc-600">
            Ask one focused question against the currently extracted article.
          </p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {EXAMPLE_QUESTIONS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => applyExampleQuestion(item)}
              className="rounded-full bg-white px-3 py-2 text-xs font-medium text-zinc-600 ring-1 ring-zinc-200 transition hover:bg-zinc-100"
            >
              {item}
            </button>
          ))}
        </div>

        <form onSubmit={handleAskQuestion} className="mt-4 space-y-3">
          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="What is the core argument of this article?"
            rows={3}
            className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 shadow-sm outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
          />
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={isAsking || !question.trim()}
              className="inline-flex min-w-28 items-center justify-center rounded-2xl bg-zinc-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
            >
              {isAsking ? "Answering..." : "Ask question"}
            </button>
            <span className="text-xs text-zinc-500">
              Keep questions specific for better grounded answers.
            </span>
          </div>
        </form>

        {qaAnswer ? (
          qaAnswer.ok ? (
            <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-4">
              <p className="whitespace-pre-wrap text-sm leading-7 text-zinc-700">
                {qaAnswer.data.answer}
              </p>
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <p className="font-medium">{qaAnswer.error.code}</p>
              <p className="mt-2 leading-7">{qaAnswer.error.message}</p>
            </div>
          )
        ) : (
          <div className="mt-4 rounded-2xl border border-dashed border-zinc-200 bg-white/80 p-4 text-sm text-zinc-500">
            Ask a question after extraction to test the article QA flow.
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="space-y-4">
          <div className="rounded-2xl bg-zinc-50 p-4">
            <h3 className="text-sm font-semibold text-zinc-950">Summary</h3>
            <p className="mt-2 text-sm leading-7 text-zinc-700">
              {articleData.summary}
            </p>
          </div>

          <div className="rounded-2xl bg-zinc-50 p-4">
            <h3 className="text-sm font-semibold text-zinc-950">Key points</h3>
            <ul className="mt-2 space-y-2 text-sm leading-7 text-zinc-700">
              {articleData.bullets.map((bullet) => (
                <li key={bullet}>- {bullet}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl bg-zinc-50 p-4">
            <h3 className="text-sm font-semibold text-zinc-950">Excerpt</h3>
            <p className="mt-2 text-sm leading-7 text-zinc-700">
              {articleData.excerpt || "No excerpt was detected for this article."}
            </p>
          </div>

          <div className="rounded-2xl bg-zinc-50 p-4">
            <h3 className="text-sm font-semibold text-zinc-950">Readable article</h3>
            <div
              className="prose prose-zinc mt-3 max-w-none text-sm leading-7"
              dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
            />
          </div>

          <div className="rounded-2xl bg-zinc-50 p-4">
            <h3 className="text-sm font-semibold text-zinc-950">Body preview</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-zinc-700">
              {articleData.textContent.slice(0, 2000)}
              {articleData.textContent.length > 2000 ? "..." : ""}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
