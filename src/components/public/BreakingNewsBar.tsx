import Link from "next/link";
import type { Lang } from "@/lib/language";
import { pickText } from "@/lib/language";
import type { BreakingItem } from "@/lib/public-types";

export function BreakingNewsBar({
  lang,
  items,
}: {
  lang: Lang;
  items: BreakingItem[];
}) {
  if (!items.length) return null;

  const label = lang === "ur" ? "بریکنگ" : "Breaking";
  const doubled = [...items, ...items];

  return (
    <div className="overflow-hidden border-b border-[var(--line)] bg-[#fff8f0]">
      <div className="mx-auto flex max-w-[var(--maxw)] items-center gap-3 px-3 py-2">
        <span className="ui-sans shrink-0 bg-[var(--accent)] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
          {label}
        </span>
        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="ticker-track">
            {doubled.map((item, idx) => {
              const text = pickText(lang, item.headlineUr || item.headline, (item as { headlineEn?: string }).headlineEn || item.headline);
              const href = item.href || (item.article?.slug ? `/${item.article.slug}` : "/breaking");
              return (
                <Link key={`${item.id}-${idx}`} href={href} className="ui-sans text-sm font-medium hover:text-[var(--accent)]">
                  {text}
                </Link>
              );
            })}
          </div>
        </div>
        <Link href="/breaking" className="ui-sans hidden shrink-0 text-xs font-bold text-[var(--accent)] sm:inline">
          {lang === "ur" ? "مزید" : "More"}
        </Link>
      </div>
    </div>
  );
}
