import { ArticleCard } from "@/components/public/ArticleCard";
import { EmptyState } from "@/components/public/EmptyState";
import { Pagination } from "@/components/public/Pagination";
import { getRequestLang } from "@/lib/language-server";
import { getArticles } from "@/lib/public-api";

export const dynamic = "force-dynamic";

export default async function LatestPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; lang?: string }>;
}) {
  const sp = await searchParams;
  const lang = await getRequestLang(sp);
  const page = Math.max(1, Number(sp.page || 1));
  const data = await getArticles({ page, pageSize: 12 });

  return (
    <div>
      <h1 className="section-title">{lang === "ur" ? "تازہ ترین" : "Latest"}</h1>
      {data.items.length === 0 ? (
        <EmptyState lang={lang} />
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((article) => (
              <ArticleCard key={article.id} article={article} lang={lang} variant="medium" />
            ))}
          </div>
          <Pagination
            page={data.page || page}
            totalPages={data.totalPages || 1}
            lang={lang}
            basePath="/latest"
          />
        </>
      )}
    </div>
  );
}
