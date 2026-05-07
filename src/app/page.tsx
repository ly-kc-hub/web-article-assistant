import { ArticleWorkbench } from "@/components/article-workbench";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-12 md:px-10">
      <ArticleWorkbench />
    </main>
  );
}
