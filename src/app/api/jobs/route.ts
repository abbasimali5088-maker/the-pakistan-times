import { NextRequest } from "next/server";
import { getPagination, handleApi } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { processDueJobs } from "@/lib/jobs";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  return handleApi(async () => {
    await requirePermission("jobs", "read");
    const url = new URL(req.url);
    const status = url.searchParams.get("status") || "pending";
    const { skip, take, page, pageSize } = getPagination(url);
    const where = { status };
    const [total, items] = await Promise.all([
      prisma.job.count({ where }),
      prisma.job.findMany({
        where,
        orderBy: { runAt: "asc" },
        skip,
        take,
      }),
    ]);
    return { items, total, page, pageSize };
  });
}

export async function POST(_req: NextRequest) {
  return handleApi(async () => {
    const user = await requirePermission("jobs", "manage");
    const result = await processDueJobs();
    await writeAudit({
      userId: user.id,
      action: "process_due",
      module: "jobs",
      newValue: result,
    });
    return result;
  });
}
