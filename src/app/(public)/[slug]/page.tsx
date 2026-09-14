import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleCard } from "@/components/public/ArticleCard";
import { Comments } from "@/components/public/Comments";
import { ShareButtons } from "@/components/public/ShareButtons";
import { brandName, localizeArticle } from "@/lib/language";
import { getRequestLang } from "@/lib/language-server";
import { absoluteUrl, getArticle, getArticles } from "@/lib/public-api";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lang?: string }>;
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params;
  const sp = await searchParams;
  const lang = await getRequestLang(sp);
  const article = await getArticle(slug);
  if (!article) return { title: "Not found" };
  const a = localizeArticle(article, lang);
  return {
    title: a.displayTitle,
    description: a.displayExcerpt || undefined,
    openGraph: {
      title: article.seo?.ogTitle || a.displayTitle,
      description: article.seo?.ogDescription || a.displayExcerpt || undefined,
      images: article.seo?.ogImage || article.image?.url ? [article.seo?.ogImage || article.image!.url] : undefined,
      type: "article",
    },
  };
}

export default async function ArticlePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const lang = await getRequestLang(sp);
  const article = await getArticle(slug);
  if (!article) notFound();

  const a = localizeArticle(article, lang);
  const locale = lang === "ur" ? "ur-PK" : "en-GB";
  const url = absoluteUrl(`/${article.slug}`);
  const brand = brandName(lang);

  const related =
    article.relations?.map((r) => r.article).filter(Boolean) ||
    (
      await getArticles({
        category: article.category?.slug,
        pageSize: 4,
      })
    ).items.filter((x) => x.id !== article.id).slice(0, 3);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": article.seo?.schemaType || "NewsArticle",
    headline: a.displayTitle,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
    description: a.displayExcerpt,
    image: article.image?.url ? [article.image.url] : undefined,
    author: article.author
      ? { "@type": "Person", name: article.author.name }
      : { "@type": "Organization", name: brand },
    publisher: {
      "@type": "NewsMediaOrganization",
      name: brand,
      logo: {
        "@type": "ImageObject",
        url: absoluteUrl("/icon-512.png"),
      },
    },
    mainEntityOfPage: url,
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: lang === "ur" ? "ہوم" : "Home",
        item: absoluteUrl("/"),
      },
      ...(article.category
        ? [
            {
              "@type": "ListItem",
              position: 2,
              name: a.displayCategory,
              item: absoluteUrl(`/category/${article.category.slug}`),
            },
          ]
        : []),
      {
        "@type": "ListItem",
        position: article.category ? 3 : 2,
        name: a.displayTitle,
        item: url,
      },
    ],
  };

  return (
    <article className="fade-in mx-auto max-w-3xl">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      <nav className="ui-sans meta mb-4 flex flex-wrap gap-2">
        <Link href="/" className="hover:text-[var(--accent)]">
          {lang === "ur" ? "ہوم" : "Home"}
        </Link>
        {article.category ? (
          <>
            <span>/</span>
            <Link href={`/category/${article.category.slug}`} className="hover:text-[var(--accent)]">
              {a.displayCategory}
            </Link>
          </>
        ) : null}
      </nav>

      {a.displayCategory ? (
        <p className="ui-sans mb-2 text-xs font-bold uppercase tracking-wide text-[var(--accent)]">
          {a.displayCategory}
        </p>
      ) : null}

      <h1 className="mb-3 text-3xl leading-tight sm:text-4xl">{a.displayTitle}</h1>

      <div className="meta mb-6 flex flex-wrap gap-x-3 gap-y-1">
        {article.author ? (
          <Link href={`/author/${article.author.slug}`} className="font-semibold text-[var(--ink)] hover:text-[var(--accent)]">
            {article.author.name}
          </Link>
        ) : null}
        <span>{formatDate(article.publishedAt || article.publishAt, locale)}</span>
        {article.location ? <span>{article.location}</span> : null}
      </div>

      {article.image?.url ? (
        <figure className="mb-6">
          <div className="relative aspect-[16/9] overflow-hidden bg-[var(--paper-deep)]">
            <Image
              src={article.image.url}
              alt={article.image.alt || a.displayTitle}
              fill
              priority
              className="object-cover"
              sizes="(max-width:768px) 100vw, 768px"
            />
          </div>
          {(article.imageCaption || article.imageCredit) && (
            <figcaption className="meta mt-2">
              {[article.imageCaption, article.imageCredit].filter(Boolean).join(" — ")}
            </figcaption>
          )}
        </figure>
      ) : null}

      <div className="mb-8">
        <ShareButtons lang={lang} title={a.displayTitle} url={url} />
      </div>

      <div
        className="prose-article"
        dangerouslySetInnerHTML={{ __html: a.displayBody || a.displayExcerpt || "" }}
      />

      {article.tags && article.tags.length > 0 ? (
        <div className="ui-sans mt-8 flex flex-wrap gap-2">
          {article.tags.map((tag) => (
            <Link
              key={tag.id}
              href={`/tag/${tag.slug}`}
              className="border border-[var(--line)] bg-white/70 px-3 py-1 text-sm hover:border-[var(--accent)]"
            >
              #{tag.name}
            </Link>
          ))}
        </div>
      ) : null}

      <Comments articleId={article.id} lang={lang} />

      {related.length > 0 ? (
        <section className="mt-12">
          <h2 className="section-title">{lang === "ur" ? "متعلقہ خبریں" : "Related"}</h2>
          <div className="grid gap-5 sm:grid-cols-3">
            {related.slice(0, 3).map((item) => (
              <ArticleCard key={item.id} article={item} lang={lang} variant="small" />
            ))}
          </div>
        </section>
      ) : null}
    </article>
  );
}
