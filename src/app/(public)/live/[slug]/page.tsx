import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/public/EmptyState";
import { getRequestLang } from "@/lib/language-server";
import { getLiveStory } from "@/lib/public-api";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lang?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const story = await getLiveStory(slug);
  return { title: story?.title || "Live" };
}

export default async function LiveStoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const lang = await getRequestLang(sp);
  const story = await getLiveStory(slug);
  if (!story) notFound();

  const locale = lang === "ur" ? "ur-PK" : "en-GB";
  const updates = story.updates || [];

  return (
    <div className="mx-auto max-w-3xl">
      <p className="ui-sans mb-2 inline-flex items-center gap-2 text-xs font-bold uppercase text-[var(--danger)]">
        <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--danger)]" />
        Live
      </p>
      <h1 className="mb-3 text-3xl sm:text-4xl">{story.title}</h1>
      {story.description ? <p className="mb-8 text-[var(--muted)]">{story.description}</p> : null}

      {updates.length === 0 ? (
        <EmptyState lang={lang} />
      ) : (
        <ol className="space-y-5 border-s-2 border-[var(--accent)] ps-5">
          {updates.map((update) => (
            <li key={update.id} className="relative">
              <span className="absolute -start-[1.6rem] top-1.5 h-3 w-3 rounded-full bg-[var(--accent)]" />
              <p className="meta mb-1">{formatDate(update.publishedAt, locale)}</p>
              <div className="border border-[var(--line)] bg-white/70 p-4">
                {update.isImportant ? (
                  <p className="ui-sans mb-2 text-xs font-bold uppercase text-[var(--accent)]">
                    {lang === "ur" ? "اہم" : "Important"}
                  </p>
                ) : null}
                <p className="text-lg leading-relaxed">{update.body}</p>
                {update.quote ? (
                  <blockquote className="mt-3 border-s-4 border-[var(--ink)] ps-3 italic text-[var(--muted)]">
                    {update.quote}
                  </blockquote>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
