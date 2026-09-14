import type { Lang } from "@/lib/language";
import type { PublicArticle } from "@/lib/public-types";
import { ArticleCard } from "./ArticleCard";

export function MostRead({
  articles,
  lang,
}: {
  articles: PublicArticle[];
  lang: Lang;
}) {
  if (!articles.length) return null;

  return (
    <aside className="border border-[var(--line)] bg-[rgba(255,252,246,0.7)] p-4">
      <h2 className="section-title text-xl">
        {lang === "ur" ? "سب سے زیادہ پڑھی گئیں" : "Most read"}
      </h2>
      <div>
        {articles.slice(0, 6).map((article) => (
          <ArticleCard key={article.id} article={article} lang={lang} variant="compact" />
        ))}
      </div>
    </aside>
  );
}
