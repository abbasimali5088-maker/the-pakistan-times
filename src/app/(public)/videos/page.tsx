import { EmptyState } from "@/components/public/EmptyState";
import { Pagination } from "@/components/public/Pagination";
import { VideoCard } from "@/components/public/VideoCard";
import { getRequestLang } from "@/lib/language-server";
import { getVideos } from "@/lib/public-api";

export const dynamic = "force-dynamic";

export default async function VideosPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; lang?: string }>;
}) {
  const sp = await searchParams;
  const lang = await getRequestLang(sp);
  const page = Math.max(1, Number(sp.page || 1));
  const data = await getVideos({ page });

  return (
    <div>
      <h1 className="section-title">{lang === "ur" ? "ویڈیوز" : "Videos"}</h1>
      {data.items.length === 0 ? (
        <EmptyState lang={lang} />
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((video) => (
              <VideoCard key={video.id} video={video} lang={lang} />
            ))}
          </div>
          <Pagination
            page={data.page || page}
            totalPages={data.totalPages || 1}
            lang={lang}
            basePath="/videos"
          />
        </>
      )}
    </div>
  );
}
