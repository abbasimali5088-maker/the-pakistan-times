import { NextRequest } from "next/server";
import { handleApi } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(_req: NextRequest) {
  return handleApi(async () => {
    await requirePermission("dashboard", "read");
    const now = new Date();
    const dayAgo = new Date(Date.now() - 24 * 60 * 60_000);

    const [
      articlesTotal,
      articlesPublished,
      articlesDraft,
      articlesScheduled,
      categories,
      tags,
      authors,
      users,
      media,
      commentsPending,
      breakingActive,
      liveStories,
      subscribers,
      ads,
      jobsPending,
      eventsToday,
      notFoundHits,
    ] = await Promise.all([
      prisma.article.count({ where: { deletedAt: null } }),
      prisma.article.count({ where: { deletedAt: null, status: "published" } }),
      prisma.article.count({ where: { deletedAt: null, status: "draft" } }),
      prisma.article.count({ where: { deletedAt: null, status: "scheduled" } }),
      prisma.category.count(),
      prisma.tag.count(),
      prisma.author.count(),
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.media.count({ where: { deletedAt: null } }),
      prisma.comment.count({ where: { status: "pending" } }),
      prisma.breakingNews.count({
        where: {
          status: "active",
          AND: [
            { OR: [{ startAt: null }, { startAt: { lte: now } }] },
            { OR: [{ endAt: null }, { endAt: { gte: now } }] },
          ],
        },
      }),
      prisma.liveStory.count({ where: { status: "live" } }),
      prisma.newsletterSubscriber.count({ where: { status: "active" } }),
      prisma.advertisement.count({ where: { status: "active" } }),
      prisma.job.count({ where: { status: "pending" } }),
      prisma.analyticsEvent.count({ where: { createdAt: { gte: dayAgo } } }),
      prisma.notFoundHit.count(),
    ]);

    return {
      counts: {
        articlesTotal,
        articlesPublished,
        articlesDraft,
        articlesScheduled,
        categories,
        tags,
        authors,
        users,
        media,
        commentsPending,
        breakingActive,
        liveStories,
        subscribers,
        ads,
        jobsPending,
        eventsToday,
        notFoundHits,
      },
    };
  });
}
