import { NextRequest } from "next/server";
import { handleApi } from "@/lib/api";
import { prisma } from "@/lib/db";
import { articlePublicInclude, serializeArticle } from "@/lib/content";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  return handleApi(async () => {
    const url = new URL(req.url);
    const publicOnly = url.searchParams.get("public") === "1";
    const now = new Date();

    const items = await prisma.breakingNews.findMany({
      where: publicOnly
        ? {
            status: "active",
            OR: [{ startAt: null }, { startAt: { lte: now } }],
            AND: [{ OR: [{ endAt: null }, { endAt: { gte: now } }] }],
          }
        : undefined,
      include: { article: { include: articlePublicInclude } },
      orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
      take: 20,
    });

    return {
      items: items.map((item) => ({
        id: item.id,
        headline: item.headlineUr || item.headline,
        headlineUr: item.headlineUr || item.headline,
        headlineEn: item.headline,
        priority: item.priority,
        status: item.status,
        articleId: item.articleId,
        article: item.article ? serializeArticle(item.article) : null,
        href: item.article ? `/${item.article.slug}` : null,
      })),
    };
  });
}
