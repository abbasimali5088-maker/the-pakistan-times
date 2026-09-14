import Image from "next/image";
import Link from "next/link";
import type { Lang } from "@/lib/language";
import { localizeArticle } from "@/lib/language";
import type { PublicArticle } from "@/lib/public-types";
import { cn, formatDate } from "@/lib/utils";

export type ArticleCardVariant =
  | "large"
  | "medium"
  | "small"
  | "horizontal"
  | "compact"
  | "featured";

export function ArticleCard({
  article,
  lang,
  variant = "medium",
}: {
  article: PublicArticle;
  lang: Lang;
  variant?: ArticleCardVariant;
}) {
  const a = localizeArticle(article, lang);
  const href = article.href || `/${article.slug}`;
  const locale = lang === "ur" ? "ur-PK" : "en-GB";
  const date = formatDate(article.publishedAt || article.publishAt, locale);
  const image = article.image?.url;

  if (variant === "featured") {
    return (
      <article className="group relative isolate min-h-[420px] overflow-hidden text-white sm:min-h-[520px]">
        {image ? (
          <Image
            src={image}
            alt={article.image?.alt || a.displayTitle}
            fill
            priority
            className="object-cover transition duration-700 group-hover:scale-[1.03]"
            sizes="100vw"
          />
        ) : (
          <div className="absolute inset-0 bg-[var(--ink)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />
        <div className="relative z-10 flex h-full flex-col justify-end px-5 py-8 sm:px-10 sm:py-12">
          <div className="max-w-3xl">
            {a.displayCategory ? (
              <p className="ui-sans mb-3 text-xs font-bold uppercase tracking-[0.14em] text-white/85">
                {a.displayCategory}
              </p>
            ) : null}
            <h2 className="mb-3 text-3xl leading-tight sm:text-5xl">
              <Link href={href} className="hover:underline decoration-[var(--accent)] underline-offset-4">
                {a.displayTitle}
              </Link>
            </h2>
            {a.displayExcerpt ? (
              <p className="max-w-2xl text-base text-white/90 sm:text-lg">{a.displayExcerpt}</p>
            ) : null}
            <p className="meta mt-4 text-white/70">{date}</p>
          </div>
        </div>
      </article>
    );
  }

  if (variant === "horizontal") {
    return (
      <article className="grid grid-cols-[100px_1fr] gap-3 sm:grid-cols-[140px_1fr]">
        <Link href={href} className="relative aspect-[4/3] overflow-hidden bg-[var(--paper-deep)]">
          {image ? (
            <Image src={image} alt="" fill className="object-cover" sizes="140px" />
          ) : null}
        </Link>
        <div>
          {a.displayCategory ? (
            <p className="ui-sans mb-1 text-[11px] font-bold uppercase tracking-wide text-[var(--accent)]">
              {a.displayCategory}
            </p>
          ) : null}
          <h3 className="text-base leading-snug sm:text-lg">
            <Link href={href} className="hover:text-[var(--accent)]">
              {a.displayTitle}
            </Link>
          </h3>
          <p className="meta mt-1">{date}</p>
        </div>
      </article>
    );
  }

  if (variant === "compact") {
    return (
      <article className="border-b border-[var(--line)] py-3 last:border-0">
        <h3 className="text-[0.98rem] leading-snug">
          <Link href={href} className="hover:text-[var(--accent)]">
            {a.displayTitle}
          </Link>
        </h3>
        <p className="meta mt-1">{date}</p>
      </article>
    );
  }

  if (variant === "small") {
    return (
      <article>
        <h3 className="text-base leading-snug">
          <Link href={href} className="hover:text-[var(--accent)]">
            {a.displayTitle}
          </Link>
        </h3>
        <p className="meta mt-1">{[a.displayCategory, date].filter(Boolean).join(" · ")}</p>
      </article>
    );
  }

  const isLarge = variant === "large";

  return (
    <article className={cn("group", isLarge && "md:col-span-2")}>
      <Link href={href} className="relative mb-3 block overflow-hidden bg-[var(--paper-deep)]">
        <div className={cn("relative w-full", isLarge ? "aspect-[16/9]" : "aspect-[16/10]")}>
          {image ? (
            <Image
              src={image}
              alt={article.image?.alt || a.displayTitle}
              fill
              className="object-cover transition duration-500 group-hover:scale-[1.02]"
              sizes={isLarge ? "(max-width:768px) 100vw, 66vw" : "(max-width:768px) 100vw, 33vw"}
            />
          ) : null}
        </div>
      </Link>
      {a.displayCategory ? (
        <p className="ui-sans mb-1 text-[11px] font-bold uppercase tracking-wide text-[var(--accent)]">
          {a.displayCategory}
        </p>
      ) : null}
      <h3 className={cn("leading-snug", isLarge ? "text-2xl sm:text-3xl" : "text-lg")}>
        <Link href={href} className="hover:text-[var(--accent)]">
          {a.displayTitle}
        </Link>
      </h3>
      {a.displayExcerpt && variant !== "medium" ? (
        <p className="mt-2 text-[var(--muted)]">{a.displayExcerpt}</p>
      ) : null}
      {variant === "medium" && a.displayExcerpt ? (
        <p className="mt-2 line-clamp-2 text-sm text-[var(--muted)]">{a.displayExcerpt}</p>
      ) : null}
      <p className="meta mt-2">{date}</p>
    </article>
  );
}
