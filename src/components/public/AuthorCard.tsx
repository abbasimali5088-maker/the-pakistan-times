import Image from "next/image";
import Link from "next/link";
import type { Lang } from "@/lib/language";
import type { PublicAuthor } from "@/lib/public-types";

export function AuthorCard({ author, lang }: { author: PublicAuthor; lang: Lang }) {
  return (
    <article className="flex gap-4 border-b border-[var(--line)] py-4">
      <div className="relative h-16 w-16 shrink-0 overflow-hidden bg-[var(--paper-deep)]">
        {author.photoUrl ? (
          <Image src={author.photoUrl} alt="" fill className="object-cover" sizes="64px" />
        ) : (
          <div className="flex h-full items-center justify-center bg-[var(--ink)] text-lg text-white">
            {author.name.slice(0, 1)}
          </div>
        )}
      </div>
      <div>
        <h3 className="text-lg font-semibold">
          <Link href={`/author/${author.slug}`} className="hover:text-[var(--accent)]">
            {author.name}
          </Link>
        </h3>
        {author.position ? <p className="meta">{author.position}</p> : null}
        {author.bio ? <p className="mt-1 line-clamp-2 text-sm text-[var(--muted)]">{author.bio}</p> : null}
        <Link href={`/author/${author.slug}`} className="ui-sans mt-2 inline-block text-sm font-bold text-[var(--accent)]">
          {lang === "ur" ? "مضامین دیکھیں" : "View articles"}
        </Link>
      </div>
    </article>
  );
}
