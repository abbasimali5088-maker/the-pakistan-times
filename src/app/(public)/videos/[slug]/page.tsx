import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getRequestLang } from "@/lib/language-server";
import { getVideo } from "@/lib/public-api";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lang?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const video = await getVideo(slug);
  return { title: video?.title || "Video" };
}

function embedUrl(url: string) {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    if (u.hostname.includes("youtu.be")) {
      return `https://www.youtube.com/embed${u.pathname}`;
    }
  } catch {
    /* ignore */
  }
  return url;
}

export default async function VideoDetailPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const lang = await getRequestLang(sp);
  const video = await getVideo(slug);
  if (!video) notFound();

  const src = embedUrl(video.url);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-4 text-3xl">{video.title}</h1>
      {video.description ? <p className="mb-6 text-[var(--muted)]">{video.description}</p> : null}
      <div className="aspect-video overflow-hidden bg-[var(--ink)]">
        {video.provider === "youtube" || src.includes("youtube") ? (
          <iframe
            src={src}
            title={video.title}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <video src={video.url} controls className="h-full w-full" poster={video.thumbnail || undefined} />
        )}
      </div>
      <p className="meta mt-4">
        {lang === "ur" ? "ویڈیو" : "Video"}
        {video.duration ? ` · ${Math.round(video.duration / 60)} min` : ""}
      </p>
    </div>
  );
}
