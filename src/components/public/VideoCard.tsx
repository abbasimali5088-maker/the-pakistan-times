import Image from "next/image";
import Link from "next/link";
import type { Lang } from "@/lib/language";
import type { VideoItem } from "@/lib/public-types";

export function VideoCard({ video, lang }: { video: VideoItem; lang: Lang }) {
  return (
    <article>
      <Link href={`/videos/${video.slug}`} className="relative mb-3 block aspect-video overflow-hidden bg-[var(--ink)]">
        {video.thumbnail ? (
          <Image src={video.thumbnail} alt="" fill className="object-cover opacity-90" sizes="(max-width:768px) 100vw, 33vw" />
        ) : null}
        <span className="ui-sans absolute bottom-3 start-3 bg-[var(--accent)] px-2 py-1 text-[11px] font-bold uppercase text-white">
          {lang === "ur" ? "ویڈیو" : "Video"}
        </span>
      </Link>
      <h3 className="text-lg leading-snug">
        <Link href={`/videos/${video.slug}`} className="hover:text-[var(--accent)]">
          {video.title}
        </Link>
      </h3>
      {video.description ? <p className="mt-1 line-clamp-2 text-sm text-[var(--muted)]">{video.description}</p> : null}
    </article>
  );
}
