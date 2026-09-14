import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { pickText } from "@/lib/language";
import { getRequestLang } from "@/lib/language-server";
import { getPage } from "@/lib/public-api";

export const dynamic = "force-dynamic";

const ALIASES: Record<string, string[]> = {
  corrections: ["corrections", "corrections-policy"],
};

export async function loadStaticPage(routeSlug: string) {
  const candidates = ALIASES[routeSlug] || [routeSlug];
  for (const slug of candidates) {
    const page = await getPage(slug);
    if (page) return page;
  }
  return null;
}

export async function staticPageMetadata(routeSlug: string): Promise<Metadata> {
  const page = await loadStaticPage(routeSlug);
  return { title: page?.seoTitle || page?.title || routeSlug };
}

export async function StaticPageView({
  routeSlug,
  searchParams,
}: {
  routeSlug: string;
  searchParams: Promise<{ lang?: string }>;
}) {
  const sp = await searchParams;
  const lang = await getRequestLang(sp);
  const page = await loadStaticPage(routeSlug);
  if (!page) notFound();

  const title = pickText(lang, page.title, page.title, page.title);
  // Prefer Urdu body for ur, English body for en
  const body =
    lang === "en"
      ? page.body || page.bodyUr || ""
      : page.bodyUr || page.body || "";

  return (
    <article className="fade-in mx-auto max-w-3xl">
      <h1 className="mb-6 text-3xl">{title}</h1>
      <div className="prose-article whitespace-pre-line">{body}</div>
    </article>
  );
}
