import type { Lang } from "@/lib/language";
import type { PublicArticle } from "@/lib/public-types";
import { ArticleCard } from "./ArticleCard";

export function FeaturedStory({
  article,
  sideStories = [],
  lang,
}: {
  article: PublicArticle | null;
  sideStories?: PublicArticle[];
  lang: Lang;
}) {
  if (!article) return null;

  return (
    <section className="fade-in mb-10">
      <div className="-mx-[max(1rem,calc((100vw-var(--maxw))/2))] mb-8">
        <ArticleCard article={article} lang={lang} variant="featured" />
      </div>
      {sideStories.length > 0 ? (
        <div className="grid gap-5 border-b border-[var(--line)] pb-8 sm:grid-cols-2 lg:grid-cols-3">
          {sideStories.map((story) => (
            <ArticleCard key={story.id} article={story} lang={lang} variant="horizontal" />
          ))}
        </div>
      ) : null}
    </section>
  );
}
