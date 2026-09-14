import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/public/EmptyState";
import { getRequestLang } from "@/lib/language-server";
import { getGallery } from "@/lib/public-api";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lang?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const gallery = await getGallery(slug);
  return { title: gallery?.title || "Gallery" };
}

export default async function GalleryDetailPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const lang = await getRequestLang(sp);
  const gallery = await getGallery(slug);
  if (!gallery) notFound();

  const items = gallery.items || [];

  return (
    <div>
      <h1 className="mb-3 text-3xl">{gallery.title}</h1>
      {gallery.description ? <p className="mb-8 text-[var(--muted)]">{gallery.description}</p> : null}
      {items.length === 0 ? (
        <EmptyState lang={lang} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <figure key={item.id} className="overflow-hidden border border-[var(--line)] bg-white/60">
              <div className="relative aspect-[4/3]">
                <Image src={item.imageUrl} alt={item.caption || ""} fill className="object-cover" sizes="33vw" />
              </div>
              {(item.caption || item.credit) && (
                <figcaption className="meta p-3">
                  {[item.caption, item.credit].filter(Boolean).join(" — ")}
                </figcaption>
              )}
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}
