import Link from "next/link";
import { EmptyState } from "@/components/public/EmptyState";
import { pickText } from "@/lib/language";
import { getRequestLang } from "@/lib/language-server";
import { getArticles, getBreaking } from "@/lib/public-api";

export const dynamic = "force-dynamic";

export default async function BreakingPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const sp = await searchParams;
  const lang = await getRequestLang(sp);
  let items = await getBreaking();

  if (!items.length) {
    const articles = await getArticles({ pageSize: 20 });
    items = articles.items
      .filter((a) => a.isBreaking || a.priority === "breaking")
      .map((a) => ({
        id: a.id,
        headline: a.title,
        headlineUr: a.titleUr || a.title,
        headlineEn: a.titleEn || a.title,
        href: `/${a.slug}`,
        article: a,
      }));
  }

  return (
    <div>
      <h1 className="section-title">{lang === "ur" ? "بریکنگ نیوز" : "Breaking news"}</h1>
      {items.length === 0 ? (
        <EmptyState lang={lang} />
      ) : (
        <ul className="divide-y divide-[var(--line)] border border-[var(--line)] bg-[rgba(255,252,246,0.7)]">
          {items.map((item) => {
            const text = pickText(
              lang,
              item.headlineUr || item.headline,
              (item as { headlineEn?: string }).headlineEn || item.headline,
            );
            const href = item.href || (item.article?.slug ? `/${item.article.slug}` : "#");
            return (
              <li key={item.id}>
                <Link href={href} className="block px-4 py-4 text-lg hover:bg-[var(--accent-soft)] hover:text-[var(--accent-deep)]">
                  {text}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
