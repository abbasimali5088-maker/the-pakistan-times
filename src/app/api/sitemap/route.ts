import { NextRequest } from "next/server";
import { handleApi } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeAudit, enqueueJob } from "@/lib/audit";

export const runtime = "nodejs";

export async function GET(_req: NextRequest) {
  return handleApi(async () => {
    const now = new Date();
    const [articles, categories, authors, pages] = await Promise.all([
      prisma.article.count({
        where: {
          deletedAt: null,
          status: "published",
          OR: [{ publishAt: null }, { publishAt: { lte: now } }],
        },
      }),
      prisma.category.count({ where: { status: "active" } }),
      prisma.author.count({ where: { status: "active" } }),
      prisma.staticPage.count({ where: { status: "published" } }),
    ]);

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://thepakistantimes.pk";
    return {
      format: "xml-like-json",
      generatedAt: now.toISOString(),
      index: [
        { loc: `${siteUrl}/sitemap.xml`, type: "root" },
        { loc: `${siteUrl}/sitemap/articles`, count: articles },
        { loc: `${siteUrl}/sitemap/categories`, count: categories },
        { loc: `${siteUrl}/sitemap/authors`, count: authors },
        { loc: `${siteUrl}/sitemap/pages`, count: pages },
      ],
      totals: { articles, categories, authors, pages },
    };
  });
}

export async function POST(req: NextRequest) {
  return handleApi(async () => {
    const user = await requirePermission("sitemap", "manage");
    const job = await enqueueJob("regenerate_sitemap", { requestedBy: user.id });
    await writeAudit({
      userId: user.id,
      action: "enqueue_regenerate",
      module: "sitemap",
      recordId: job.id,
    });
    return { enqueued: true, job };
  });
}
