import type { Metadata } from "next";
import { CategorySection } from "@/components/public/CategorySection";
import { EmptyState } from "@/components/public/EmptyState";
import { FeaturedStory } from "@/components/public/FeaturedStory";
import { GalleryCard } from "@/components/public/GalleryCard";
import { MostRead } from "@/components/public/MostRead";
import { VideoCard } from "@/components/public/VideoCard";
import { brandName, pickText } from "@/lib/language";
import { getRequestLang } from "@/lib/language-server";
import {
  getArticles,
  getCategories,
  getGalleries,
  getHomepage,
  getVideos,
} from "@/lib/public-api";
import type { PublicArticle } from "@/lib/public-types";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getRequestLang();
  const brand = brandName(lang);
  return {
    title: brand,
    description:
      lang === "ur"
        ? "پاکستان اور دنیا کی تازہ ترین خبریں"
        : "Latest news from Pakistan and the world",
  };
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const sp = await searchParams;
  const lang = await getRequestLang(sp);

  const [homepage, latest, categories, videos, galleries] = await Promise.all([
    getHomepage(),
    getArticles({ page: 1, pageSize: 24 }),
    getCategories(),
    getVideos({ page: 1 }),
    getGalleries({ page: 1 }),
  ]);

  const blocks = homepage.blocks || [];
  const topFromBlocks = blocks
    .filter((b) => b.sectionKey === "top_story" && b.article)
    .map((b) => b.article!) as PublicArticle[];
  const secondaryFromBlocks = blocks
    .filter((b) => b.sectionKey === "secondary" && b.article)
    .map((b) => b.article!) as PublicArticle[];

  const featured =
    topFromBlocks[0] ||
    latest.items.find((a) => a.isFeatured) ||
    latest.items[0] ||
    null;
  const sideStories =
    secondaryFromBlocks.length > 0
      ? secondaryFromBlocks.slice(0, 3)
      : latest.items.filter((a) => a.id !== featured?.id).slice(0, 3);

  const usedIds = new Set<string>([
    ...(featured ? [featured.id] : []),
    ...sideStories.map((s) => s.id),
  ]);

  const topCategories = categories
    .filter((c) => !(c as { parentId?: string | null }).parentId)
    .slice(0, 6);

  const categorySections = await Promise.all(
    topCategories.map(async (cat) => {
      const articles = await getArticles({ category: cat.slug, pageSize: 3 });
      return {
        category: cat,
        articles: articles.items.filter((a) => !usedIds.has(a.id)),
      };
    }),
  );

  const mostRead = [...latest.items]
    .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
    .slice(0, 6);

  const hasContent =
    featured ||
    categorySections.some((s) => s.articles.length) ||
    videos.items.length ||
    galleries.items.length;

  return (
    <div>
      <FeaturedStory article={featured} sideStories={sideStories} lang={lang} />

      {!hasContent ? <EmptyState lang={lang} /> : null}

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div>
          {categorySections.map(({ category, articles }) => (
            <CategorySection
              key={category.id}
              title={pickText(
                lang,
                category.nameUr || category.name,
                category.nameEn || category.name,
                category.name,
              )}
              href={`/category/${category.slug}`}
              articles={articles}
              lang={lang}
            />
          ))}

          {videos.items.length > 0 ? (
            <section className="mb-12 fade-in">
              <h2 className="section-title">{lang === "ur" ? "ویڈیوز" : "Videos"}</h2>
              <div className="grid gap-6 sm:grid-cols-2">
                {videos.items.slice(0, 2).map((v) => (
                  <VideoCard key={v.id} video={v} lang={lang} />
                ))}
              </div>
            </section>
          ) : null}

          {galleries.items.length > 0 ? (
            <section className="mb-8 fade-in">
              <h2 className="section-title">{lang === "ur" ? "تصویری گیلریز" : "Galleries"}</h2>
              <div className="grid gap-6 sm:grid-cols-2">
                {galleries.items.slice(0, 2).map((g) => (
                  <GalleryCard key={g.id} gallery={g} lang={lang} />
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <div className="space-y-6">
          <MostRead articles={mostRead} lang={lang} />
        </div>
      </div>
    </div>
  );
}
