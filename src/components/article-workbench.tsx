"use client";

import { useMemo, useState, useSyncExternalStore } from "react";

import { ResultCard } from "@/components/result-card";
import { UrlForm } from "@/components/url-form";
import { localeDateMap, localeLabels, uiText, type Locale } from "@/lib/i18n";
import type { ExtractResponse, HistoryEntry, SummaryLength } from "@/types/extract";

const STORAGE_KEY = "web-article-assistant-history";
const HISTORY_LIMIT = 8;
const HISTORY_UPDATED_EVENT = "article-history-updated";
const DEMO_URLS = [
  "https://www.anthropic.com/news",
  "https://www.anthropic.com/news/claude-is-a-space-to-think",
  "https://www.microsoft.com/en-us/worklab/work-trend-index",
  "https://blog.cloudflare.com/",
  "https://developer.mozilla.org/en-US/docs/Web/JavaScript",
  "https://aws.amazon.com/blogs/machine-learning/",
];

function readHistorySnapshot() {
  if (typeof window === "undefined") {
    return "[]";
  }

  return window.localStorage.getItem(STORAGE_KEY) ?? "[]";
}

function subscribeHistory(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleStoreEvent = (event: Event) => {
    if (event instanceof StorageEvent && event.key && event.key !== STORAGE_KEY) {
      return;
    }

    onStoreChange();
  };

  window.addEventListener("storage", handleStoreEvent);
  window.addEventListener(HISTORY_UPDATED_EVENT, handleStoreEvent);

  return () => {
    window.removeEventListener("storage", handleStoreEvent);
    window.removeEventListener(HISTORY_UPDATED_EVENT, handleStoreEvent);
  };
}

function writeHistorySnapshot(history: HistoryEntry[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  window.dispatchEvent(new Event(HISTORY_UPDATED_EVENT));
}

export function ArticleWorkbench() {
  const [locale, setLocale] = useState<Locale>("zh");
  const [url, setUrl] = useState("");
  const [summaryLength, setSummaryLength] = useState<SummaryLength>("medium");
  const [result, setResult] = useState<ExtractResponse | null>(null);
  const t = uiText[locale];
  const historySnapshot = useSyncExternalStore(
    subscribeHistory,
    readHistorySnapshot,
    () => "[]",
  );

  const historyItems = useMemo(() => {
    try {
      const parsed = JSON.parse(historySnapshot) as HistoryEntry[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [historySnapshot]);

  function handleResult(nextResult: ExtractResponse | null) {
    setResult(nextResult);
  }

  function handleSuccess(nextResult: ExtractResponse) {
    if (!nextResult.ok) {
      return;
    }

    const entry: HistoryEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      savedAt: new Date().toISOString(),
      article: nextResult.data,
    };

    const withoutSameUrl = historyItems.filter(
      (item) => item.article.url !== nextResult.data.url,
    );

    writeHistorySnapshot([entry, ...withoutSameUrl].slice(0, HISTORY_LIMIT));
  }

  const hasHistory = historyItems.length > 0;

  return (
    <section className="space-y-8">
      <section className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="inline-flex rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600 shadow-sm">
            {t.badge}
          </div>
          <div className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white p-1 shadow-sm">
            <span className="px-2 text-xs font-medium text-zinc-500">{t.languageLabel}</span>
            {(Object.keys(localeLabels) as Locale[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setLocale(item)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  locale === item
                    ? "bg-zinc-950 text-white"
                    : "text-zinc-600 hover:bg-zinc-100"
                }`}
              >
                {localeLabels[item]}
              </button>
            ))}
          </div>
        </div>

        <div className="max-w-4xl space-y-4">
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-950 md:text-5xl">
            {t.title}
          </h1>
          <p className="text-base leading-8 text-zinc-600 md:text-lg">{t.subtitle}</p>
          <div className="flex flex-wrap gap-2 text-xs text-zinc-500">
            <span className="rounded-full bg-white px-3 py-1 shadow-sm ring-1 ring-zinc-200">
              {t.featureStatic}
            </span>
            <span className="rounded-full bg-white px-3 py-1 shadow-sm ring-1 ring-zinc-200">
              {t.featureHistory}
            </span>
            <span className="rounded-full bg-white px-3 py-1 shadow-sm ring-1 ring-zinc-200">
              {t.featureExport}
            </span>
            <span className="rounded-full bg-white px-3 py-1 shadow-sm ring-1 ring-zinc-200">
              {t.featureQa}
            </span>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[400px_1fr]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-950">{t.extractTitle}</h2>
            <p className="mt-2 text-sm leading-7 text-zinc-600">{t.extractDescription}</p>
            <div className="mt-6">
              <UrlForm
                locale={locale}
                url={url}
                summaryLength={summaryLength}
                onUrlChange={setUrl}
                onSummaryLengthChange={setSummaryLength}
                onResult={handleResult}
                onSuccess={handleSuccess}
              />
            </div>
            <div className="mt-5 rounded-2xl bg-zinc-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                {t.suggestedInputs}
              </p>
              <ul className="mt-3 space-y-2 text-sm text-zinc-600">
                <li>- {t.suggestedLong}</li>
                <li>- {t.suggestedNews}</li>
                <li>- {t.suggestedJs}</li>
              </ul>
            </div>
            <div className="mt-5 rounded-2xl border border-zinc-200 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                {t.demoUrls}
              </p>
              <div className="mt-3 space-y-2">
                {DEMO_URLS.map((demoUrl) => (
                  <button
                    key={demoUrl}
                    type="button"
                    onClick={() => setUrl(demoUrl)}
                    className="block w-full rounded-xl bg-zinc-50 px-3 py-2 text-left text-xs text-zinc-600 transition hover:bg-zinc-100"
                  >
                    {demoUrl}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-zinc-950">{t.historyTitle}</h3>
              {hasHistory ? (
                <button
                  type="button"
                  onClick={() => writeHistorySnapshot([])}
                  className="text-xs font-medium text-zinc-500 transition hover:text-zinc-900"
                >
                  {t.historyClear}
                </button>
              ) : null}
            </div>

            {hasHistory ? (
              <div className="mt-4 space-y-3">
                {historyItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setUrl(item.article.url);
                      setSummaryLength(item.article.summaryLength ?? "medium");
                      setResult({ ok: true, data: item.article });
                    }}
                    className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-left transition hover:border-zinc-300 hover:bg-zinc-50"
                  >
                    <p className="line-clamp-2 text-sm font-medium text-zinc-900">
                      {item.article.title}
                    </p>
                    <p className="mt-1 line-clamp-1 text-xs text-zinc-500">
                      {item.article.siteName || item.article.url}
                    </p>
                    <p className="mt-2 text-xs text-zinc-400">
                      {new Date(item.savedAt).toLocaleString(localeDateMap[locale])}
                    </p>
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500">
                {t.historyEmpty}
              </div>
            )}
          </div>
        </div>

        <ResultCard locale={locale} result={result} />
      </section>
    </section>
  );
}
