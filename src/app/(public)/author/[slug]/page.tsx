import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleCard } from "@/components/public/ArticleCard";
import { AuthorCard } from "@/components/public/AuthorCard";
import { EmptyState } from "@/components/public/EmptyState";
import { Pagination } from "@/components/public/Pagination";
import { getRequestLang } from "@/lib/language-server";
import { getArticles, getAuthor } from "@/lib/public-api";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string; lang?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const author = await getAuthor(slug);
  return { title: author?.name || "Author" };
}

export default async function AuthorPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const lang = await getRequestLang(sp);
  const page = Math.max(1, Number(sp.page || 1));
  const author = await getAuthor(slug);
  if (!author) notFound();

  const data = await getArticles({ authorId: author.id, page, pageSize: 12 });

  return (
    <div>
      <AuthorCard author={author} lang={lang} />
      <h2 className="section-title mt-8">
        {lang === "ur" ? "مضامین" : "Articles"}
      </h2>
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
            basePath={`/author/${slug}`}
          />
        </>
      )}
    </div>
  );
}
