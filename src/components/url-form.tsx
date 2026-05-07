"use client";

import { useState } from "react";

import { uiText, type Locale } from "@/lib/i18n";
import type { ExtractResponse } from "@/types/extract";

interface UrlFormProps {
  locale: Locale;
  url: string;
  onUrlChange: (value: string) => void;
  onResult: (result: ExtractResponse | null) => void;
  onSuccess?: (result: ExtractResponse) => void;
}

export function UrlForm({
  locale,
  url,
  onUrlChange,
  onResult,
  onSuccess,
}: UrlFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const t = uiText[locale];

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setRequestError(null);
    onResult(null);

    try {
      const response = await fetch("/api/extract", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ url }),
      });

      const result = (await response.json()) as ExtractResponse;
      onResult(result);
      onSuccess?.(result);

      if (!response.ok && !result.ok) {
        setRequestError(result.error.message);
      }
    } catch {
      const message = t.requestFailed;
      setRequestError(message);
      onResult({
        ok: false,
        error: {
          code: "FETCH_FAILED",
          message,
        },
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block space-y-2">
        <span className="text-sm font-medium text-zinc-700">{t.formLabel}</span>
        <input
          type="url"
          required
          value={url}
          onChange={(event) => onUrlChange(event.target.value)}
          placeholder={t.formPlaceholder}
          className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 shadow-sm outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
        />
      </label>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex min-w-32 items-center justify-center rounded-2xl bg-zinc-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
        >
          {isSubmitting ? t.formSubmitting : t.formSubmit}
        </button>
        <span className="text-xs text-zinc-500">{t.formHint}</span>
      </div>

      {requestError ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {requestError}
        </p>
      ) : null}
    </form>
  );
}
