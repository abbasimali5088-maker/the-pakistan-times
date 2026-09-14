import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://thepakistantimes.pk";
  const now = new Date();

  const [articles, categories, authors, pages] = await Promise.all([
    prisma.article.findMany({
      where: {
        deletedAt: null,
        status: "published",
        OR: [{ publishAt: null }, { publishAt: { lte: now } }],
      },
      select: { slug: true, updatedAt: true, publishedAt: true },
      orderBy: { publishedAt: "desc" },
      take: 5000,
    }),
    prisma.category.findMany({
      where: { status: "active" },
      select: { slug: true, updatedAt: true },
    }),
    prisma.author.findMany({
      where: { status: "active" },
      select: { slug: true, updatedAt: true },
    }),
    prisma.staticPage.findMany({
      where: { status: "published" },
      select: { slug: true, updatedAt: true },
    }),
  ]);

  const pagePath = (slug: string) => {
    const map: Record<string, string> = {
      about: "/about",
      contact: "/contact",
      privacy: "/privacy",
      terms: "/terms",
      disclaimer: "/disclaimer",
      "editorial-policy": "/editorial-policy",
      "corrections-policy": "/corrections",
    };
    return map[slug] || `/${slug}`;
  };

  const entries: MetadataRoute.Sitemap = [
    { url: siteUrl, lastModified: now, changeFrequency: "hourly", priority: 1 },
    ...articles.map((a) => ({
      url: `${siteUrl}/${a.slug}`,
      lastModified: a.updatedAt || a.publishedAt || now,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...categories.map((c) => ({
      url: `${siteUrl}/category/${c.slug}`,
      lastModified: c.updatedAt,
      changeFrequency: "daily" as const,
      priority: 0.6,
    })),
    ...authors.map((a) => ({
      url: `${siteUrl}/author/${a.slug}`,
      lastModified: a.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    })),
    ...pages.map((p) => ({
      url: `${siteUrl}${pagePath(p.slug)}`,
      lastModified: p.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.4,
    })),
  ];

  return entries;
}
