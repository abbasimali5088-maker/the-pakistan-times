import { NextRequest } from "next/server";
import { z } from "zod";
import { handleApi } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  return handleApi(async () => {
    const body = z
      .object({
        eventType: z.string().min(1),
        path: z.string().optional().nullable(),
        articleId: z.string().optional().nullable(),
        referrer: z.string().optional().nullable(),
        country: z.string().optional().nullable(),
        device: z.string().optional().nullable(),
        browser: z.string().optional().nullable(),
        source: z.string().optional().nullable(),
        meta: z.record(z.string(), z.unknown()).optional().nullable(),
      })
      .parse(await req.json());

    const item = await prisma.analyticsEvent.create({
      data: {
        eventType: body.eventType,
        path: body.path,
        articleId: body.articleId,
        referrer: body.referrer,
        country: body.country,
        device: body.device,
        browser: body.browser,
        source: body.source,
        metaJson: body.meta ? JSON.stringify(body.meta) : null,
      },
    });
    return { id: item.id };
  });
}

export async function GET(req: NextRequest) {
  return handleApi(async () => {
    await requirePermission("analytics", "read");
    const url = new URL(req.url);
    const days = Math.min(90, Math.max(1, Number(url.searchParams.get("days") || 7)));
    const since = new Date(Date.now() - days * 24 * 60 * 60_000);

    const [totalEvents, byType, topArticles, recent] = await Promise.all([
      prisma.analyticsEvent.count({ where: { createdAt: { gte: since } } }),
      prisma.analyticsEvent.groupBy({
        by: ["eventType"],
        where: { createdAt: { gte: since } },
        _count: { _all: true },
        orderBy: { _count: { eventType: "desc" } },
      }),
      prisma.analyticsEvent.groupBy({
        by: ["articleId"],
        where: { createdAt: { gte: since }, articleId: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { articleId: "desc" } },
        take: 10,
      }),
      prisma.analyticsEvent.findMany({
        where: { createdAt: { gte: since } },
        orderBy: { createdAt: "desc" },
        take: 25,
      }),
    ]);

    const articleIds = topArticles.map((t) => t.articleId!).filter(Boolean);
    const articles = articleIds.length
      ? await prisma.article.findMany({
          where: { id: { in: articleIds } },
          select: { id: true, title: true, slug: true, viewCount: true },
        })
      : [];
    const articleMap = Object.fromEntries(articles.map((a) => [a.id, a]));

    return {
      days,
      totalEvents,
      byType: byType.map((r) => ({ eventType: r.eventType, count: r._count._all })),
      topArticles: topArticles.map((r) => ({
        articleId: r.articleId,
        count: r._count._all,
        article: r.articleId ? articleMap[r.articleId] || null : null,
      })),
      recent,
    };
  });
}
