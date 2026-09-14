import { prisma } from "./db";

export async function processDueJobs(limit = 20) {
  const due = await prisma.job.findMany({
    where: { status: "pending", runAt: { lte: new Date() } },
    orderBy: { runAt: "asc" },
    take: limit,
  });

  let processed = 0;
  let failed = 0;

  for (const job of due) {
    try {
      if (job.type === "publish_article") {
        const payload = JSON.parse(job.payloadJson || "{}") as { articleId?: string };
        if (payload.articleId) {
          await prisma.article.updateMany({
            where: { id: payload.articleId, status: "scheduled" },
            data: {
              status: "published",
              workflowStep: "published",
              publishedAt: new Date(),
            },
          });
        }
      }
      await prisma.job.update({
        where: { id: job.id },
        data: { status: "completed", attempts: { increment: 1 } },
      });
      processed += 1;
    } catch (err) {
      failed += 1;
      await prisma.job.update({
        where: { id: job.id },
        data: {
          status: "failed",
          attempts: { increment: 1 },
          lastError: err instanceof Error ? err.message : "Job failed",
        },
      });
    }
  }

  return { scanned: due.length, processed, failed };
}
