import Image from "next/image";
import Link from "next/link";
import type { Lang } from "@/lib/language";
import type { GalleryItem } from "@/lib/public-types";

export function GalleryCard({ gallery, lang }: { gallery: GalleryItem; lang: Lang }) {
  return (
    <article>
      <Link href={`/galleries/${gallery.slug}`} className="relative mb-3 block aspect-[4/3] overflow-hidden bg-[var(--paper-deep)]">
        {gallery.coverUrl ? (
          <Image src={gallery.coverUrl} alt="" fill className="object-cover" sizes="(max-width:768px) 100vw, 33vw" />
        ) : null}
        <span className="ui-sans absolute bottom-3 start-3 bg-[var(--ink)] px-2 py-1 text-[11px] font-bold uppercase text-white">
          {lang === "ur" ? "گیلری" : "Gallery"}
        </span>
      </Link>
      <h3 className="text-lg leading-snug">
        <Link href={`/galleries/${gallery.slug}`} className="hover:text-[var(--accent)]">
          {gallery.title}
        </Link>
      </h3>
    </article>
  );
}
