import { EmptyState } from "@/components/public/EmptyState";
import { GalleryCard } from "@/components/public/GalleryCard";
import { Pagination } from "@/components/public/Pagination";
import { getRequestLang } from "@/lib/language-server";
import { getGalleries } from "@/lib/public-api";

export const dynamic = "force-dynamic";

export default async function GalleriesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; lang?: string }>;
}) {
  const sp = await searchParams;
  const lang = await getRequestLang(sp);
  const page = Math.max(1, Number(sp.page || 1));
  const data = await getGalleries({ page });

  return (
    <div>
      <h1 className="section-title">{lang === "ur" ? "گیلریز" : "Galleries"}</h1>
      {data.items.length === 0 ? (
        <EmptyState lang={lang} />
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((gallery) => (
              <GalleryCard key={gallery.id} gallery={gallery} lang={lang} />
            ))}
          </div>
          <Pagination
            page={data.page || page}
            totalPages={data.totalPages || 1}
            lang={lang}
            basePath="/galleries"
          />
        </>
      )}
    </div>
  );
}
