import { ArticleWorkbench } from "@/components/article-workbench";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-10 px-6 py-12 md:px-10">
      <section className="space-y-5">
        <div className="inline-flex rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600 shadow-sm">
          Article extraction · summary · QA
        </div>
        <div className="max-w-4xl space-y-4">
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-950 md:text-5xl">
            Web Article Assistant
          </h1>
          <p className="text-base leading-8 text-zinc-600 md:text-lg">
            Paste one article URL and extract readable content, metadata, and a
            clean summary. If `OPENAI_API_KEY` is configured, the app uses a
            model summary. Otherwise it falls back to local summarization.
          </p>
          <div className="flex flex-wrap gap-2 text-xs text-zinc-500">
            <span className="rounded-full bg-white px-3 py-1 shadow-sm ring-1 ring-zinc-200">
              Static + dynamic extraction
            </span>
            <span className="rounded-full bg-white px-3 py-1 shadow-sm ring-1 ring-zinc-200">
              Local history
            </span>
            <span className="rounded-full bg-white px-3 py-1 shadow-sm ring-1 ring-zinc-200">
              Markdown / TXT export
            </span>
            <span className="rounded-full bg-white px-3 py-1 shadow-sm ring-1 ring-zinc-200">
              Single-turn article QA
            </span>
          </div>
        </div>
      </section>

      <ArticleWorkbench />
    </main>
  );
}
