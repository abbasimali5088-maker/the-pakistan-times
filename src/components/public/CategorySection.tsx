import Link from "next/link";
import type { Lang } from "@/lib/language";
import type { PublicArticle } from "@/lib/public-types";
import { ArticleCard } from "./ArticleCard";

export function CategorySection({
  title,
  href,
  articles,
  lang,
}: {
  title: string;
  href?: string;
  articles: PublicArticle[];
  lang: Lang;
}) {
  if (!articles.length) return null;

  return (
    <section className="fade-in-delay mb-12">
      <div className="mb-4 flex items-end justify-between gap-3">
        <h2 className="section-title mb-0 flex-1 border-b-2 border-[var(--ink)] pb-2">{title}</h2>
        {href ? (
          <Link href={href} className="ui-sans mb-2 text-sm font-bold text-[var(--accent)]">
            {lang === "ur" ? "مزید دیکھیں" : "View more"}
          </Link>
        ) : null}
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {articles.slice(0, 3).map((article) => (
          <ArticleCard key={article.id} article={article} lang={lang} variant="medium" />
        ))}
      </div>
    </section>
  );
}
