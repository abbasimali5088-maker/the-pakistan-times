import { prisma } from "./db";
import { enqueueJob } from "./audit";

export async function processDueJobs(limit = 50) {
  const now = new Date();
  const jobs = await prisma.job.findMany({
    where: { status: "pending", runAt: { lte: now } },
    orderBy: { runAt: "asc" },
    take: limit,
  });

  const results: Array<{ id: string; type: string; ok: boolean; error?: string }> = [];

  for (const job of jobs) {
    await prisma.job.update({
      where: { id: job.id },
      data: { status: "running", attempts: { increment: 1 } },
    });

    try {
      const payload = JSON.parse(job.payloadJson || "{}") as Record<string, unknown>;

      switch (job.type) {
        case "publish_article": {
          const articleId = String(payload.articleId || "");
          if (!articleId) throw new Error("Missing articleId");
          await prisma.article.updateMany({
            where: { id: articleId, deletedAt: null, status: "scheduled" },
            data: {
              status: "published",
              workflowStep: "published",
              publishedAt: new Date(),
            },
          });
          break;
        }
        case "regenerate_sitemap": {
          // marker job — sitemap.ts reads live DB; record completion
          break;
        }
        default:
          throw new Error(`Unknown job type: ${job.type}`);
      }

      await prisma.job.update({
        where: { id: job.id },
        data: { status: "completed", lastError: null },
      });
      results.push({ id: job.id, type: job.type, ok: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      await prisma.job.update({
        where: { id: job.id },
        data: { status: "failed", lastError: message },
      });
      results.push({ id: job.id, type: job.type, ok: false, error: message });
    }
  }

  return { processed: results.length, results };
}

export async function enqueueSitemapRegeneration() {
  return enqueueJob("regenerate_sitemap", {});
}
