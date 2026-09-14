import Link from "next/link";
import { EmptyState } from "@/components/public/EmptyState";
import { getRequestLang } from "@/lib/language-server";
import { getLiveStories } from "@/lib/public-api";

export const dynamic = "force-dynamic";

export default async function LiveIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const sp = await searchParams;
  const lang = await getRequestLang(sp);
  const items = await getLiveStories();

  return (
    <div>
      <h1 className="section-title">{lang === "ur" ? "لائیو" : "Live"}</h1>
      {items.length === 0 ? (
        <EmptyState lang={lang} />
      ) : (
        <div className="grid gap-4">
          {items.map((story) => (
            <Link
              key={story.id}
              href={`/live/${story.slug}`}
              className="block border border-[var(--line)] bg-[rgba(255,252,246,0.75)] p-5 hover:border-[var(--accent)]"
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="ui-sans inline-flex items-center gap-1 text-xs font-bold uppercase text-[var(--danger)]">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--danger)]" />
                  Live
                </span>
                {story.category ? (
                  <span className="meta">{story.category.nameUr || story.category.name}</span>
                ) : null}
              </div>
              <h2 className="text-2xl">{story.title}</h2>
              {story.description ? (
                <p className="mt-2 text-[var(--muted)]">{story.description}</p>
              ) : null}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
