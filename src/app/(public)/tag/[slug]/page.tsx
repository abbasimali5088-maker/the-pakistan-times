import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleCard } from "@/components/public/ArticleCard";
import { EmptyState } from "@/components/public/EmptyState";
import { Pagination } from "@/components/public/Pagination";
import { pickText } from "@/lib/language";
import { getRequestLang } from "@/lib/language-server";
import { getArticles, getTag } from "@/lib/public-api";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string; lang?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const tag = await getTag(slug);
  return { title: tag ? tag.name : "Tag" };
}

export default async function TagPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const lang = await getRequestLang(sp);
  const page = Math.max(1, Number(sp.page || 1));
  const tag = await getTag(slug);
  if (!tag) notFound();

  const data = await getArticles({ tag: slug, page, pageSize: 12 });
  const title = pickText(lang, tag.nameUr || tag.name, tag.name, tag.name);

  return (
    <div>
      <h1 className="section-title">#{title}</h1>
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
            basePath={`/tag/${slug}`}
          />
        </>
      )}
    </div>
  );
}
