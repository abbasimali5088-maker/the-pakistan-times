import { NextRequest } from "next/server";
import { z } from "zod";
import { getPagination, handleApi } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs";

const adSchema = z.object({
  name: z.string().min(1),
  unitKey: z.string().min(1),
  code: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  targetUrl: z.string().optional().nullable(),
  device: z.string().optional(),
  priority: z.number().int().optional(),
  status: z.string().optional(),
  startAt: z.string().optional().nullable(),
  endAt: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  return handleApi(async () => {
    const url = new URL(req.url);
    const publicOnly = url.searchParams.get("public") === "1";
    const unitKey = url.searchParams.get("unitKey");
    if (!publicOnly) await requirePermission("ads", "read");
    const now = new Date();
    const { skip, take, page, pageSize } = getPagination(url);

    const where = publicOnly
      ? {
          status: "active",
          unitKey: unitKey || undefined,
          AND: [
            { OR: [{ startAt: null }, { startAt: { lte: now } }] },
            { OR: [{ endAt: null }, { endAt: { gte: now } }] },
          ],
        }
      : {
          unitKey: unitKey || undefined,
          status: url.searchParams.get("status") || undefined,
        };

    const [total, items] = await Promise.all([
      prisma.advertisement.count({ where }),
      prisma.advertisement.findMany({
        where,
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
        skip: publicOnly ? 0 : skip,
        take: publicOnly ? 50 : take,
      }),
    ]);
    return { items, total, page, pageSize };
  });
}

export async function POST(req: NextRequest) {
  return handleApi(async () => {
    const user = await requirePermission("ads", "create");
    const body = adSchema.parse(await req.json());
    const item = await prisma.advertisement.create({
      data: {
        name: body.name,
        unitKey: body.unitKey,
        code: body.code,
        imageUrl: body.imageUrl,
        targetUrl: body.targetUrl,
        device: body.device || "all",
        priority: body.priority ?? 0,
        status: body.status || "active",
        startAt: body.startAt ? new Date(body.startAt) : null,
        endAt: body.endAt ? new Date(body.endAt) : null,
      },
    });
    await writeAudit({ userId: user.id, action: "create", module: "ads", recordId: item.id });
    return item;
  });
}
