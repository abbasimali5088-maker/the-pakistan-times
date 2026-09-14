import { handleApi } from "@/lib/api";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  return handleApi(async () => {
    const started = Date.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      return {
        status: "ok",
        database: "up",
        latencyMs: Date.now() - started,
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      return {
        status: "degraded",
        database: "down",
        latencyMs: Date.now() - started,
        error: err instanceof Error ? err.message : "db error",
        timestamp: new Date().toISOString(),
      };
    }
  });
}
