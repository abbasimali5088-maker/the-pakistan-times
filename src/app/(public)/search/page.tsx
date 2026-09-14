import { ArticleCard } from "@/components/public/ArticleCard";
import { EmptyState } from "@/components/public/EmptyState";
import { Pagination } from "@/components/public/Pagination";
import { SearchBox } from "@/components/public/SearchBox";
import { getRequestLang } from "@/lib/language-server";
import { getSearch } from "@/lib/public-api";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; lang?: string }>;
}) {
  const sp = await searchParams;
  const lang = await getRequestLang(sp);
  const q = (sp.q || "").trim();
  const page = Math.max(1, Number(sp.page || 1));
  const data = q
    ? await getSearch(q, page)
    : { items: [] as Awaited<ReturnType<typeof getSearch>>["items"], page: 1, totalPages: 0, total: 0 };
  const items = data?.items || [];

  return (
    <div>
      <h1 className="section-title">{lang === "ur" ? "تلاش" : "Search"}</h1>
      <div className="mb-8 max-w-xl">
        <SearchBox lang={lang} initialQuery={q} />
      </div>
      {!q ? (
        <EmptyState
          lang={lang}
          title={lang === "ur" ? "تلاش شروع کریں" : "Start searching"}
          description={
            lang === "ur"
              ? "عنوان، موضوع یا مقام لکھ کر خبریں تلاش کریں۔"
              : "Search by headline, topic, or place."
          }
        />
      ) : items.length === 0 ? (
        <EmptyState
          lang={lang}
          title={lang === "ur" ? "کوئی نتیجہ نہیں" : "No results"}
          description={
            lang === "ur"
              ? `"${q}" سے مشابہ کوئی خبر نہیں ملی۔`
              : `No stories matched “${q}”.`
          }
        />
      ) : (
        <>
          <p className="meta mb-4">
            {lang === "ur"
              ? `${data.total || items.length} نتائج`
              : `${data.total || items.length} results`}
          </p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((article) => (
              <ArticleCard key={article.id} article={article} lang={lang} variant="medium" />
            ))}
          </div>
          <Pagination
            page={data.page || page}
            totalPages={data.totalPages || 1}
            lang={lang}
            basePath="/search"
            query={{ q }}
          />
        </>
      )}
    </div>
  );
}
