import { NextRequest } from "next/server";
import { z } from "zod";
import { getPagination, handleApi } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs";

const pollSchema = z.object({
  question: z.string().min(1),
  status: z.string().optional(),
  startAt: z.string().optional().nullable(),
  endAt: z.string().optional().nullable(),
  options: z.array(z.object({ label: z.string().min(1) })).min(2).optional(),
});

export async function GET(req: NextRequest) {
  return handleApi(async () => {
    const url = new URL(req.url);
    const publicOnly = url.searchParams.get("public") === "1";
    if (!publicOnly) await requirePermission("polls", "read");
    const { skip, take, page, pageSize } = getPagination(url);
    const where = {
      status: publicOnly ? "active" : url.searchParams.get("status") || undefined,
    };
    const [total, items] = await Promise.all([
      prisma.poll.count({ where }),
      prisma.poll.findMany({
        where,
        include: { options: true, _count: { select: { votes: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
    ]);
    return { items, total, page, pageSize };
  });
}

export async function POST(req: NextRequest) {
  return handleApi(async () => {
    const user = await requirePermission("polls", "create");
    const body = pollSchema.parse(await req.json());
    const item = await prisma.poll.create({
      data: {
        question: body.question,
        status: body.status || "draft",
        startAt: body.startAt ? new Date(body.startAt) : null,
        endAt: body.endAt ? new Date(body.endAt) : null,
        options: body.options?.length
          ? { create: body.options.map((o) => ({ label: o.label })) }
          : undefined,
      },
      include: { options: true },
    });
    await writeAudit({ userId: user.id, action: "create", module: "polls", recordId: item.id });
    return item;
  });
}
