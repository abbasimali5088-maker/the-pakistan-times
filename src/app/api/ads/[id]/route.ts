import { NextRequest } from "next/server";
import { z } from "zod";
import { handleApi } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs";
type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  return handleApi(async () => {
    await requirePermission("ads", "read");
    const { id } = await params;
    const item = await prisma.advertisement.findUnique({ where: { id } });
    if (!item) throw new Error("Ad not found");
    return item;
  });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  return handleApi(async () => {
    const user = await requirePermission("ads", "update");
    const { id } = await params;
    const body = z
      .object({
        name: z.string().min(1).optional(),
        unitKey: z.string().min(1).optional(),
        code: z.string().optional().nullable(),
        imageUrl: z.string().optional().nullable(),
        targetUrl: z.string().optional().nullable(),
        device: z.string().optional(),
        priority: z.number().int().optional(),
        status: z.string().optional(),
        startAt: z.string().optional().nullable(),
        endAt: z.string().optional().nullable(),
      })
      .parse(await req.json());
    const existing = await prisma.advertisement.findUnique({ where: { id } });
    if (!existing) throw new Error("Ad not found");
    const item = await prisma.advertisement.update({
      where: { id },
      data: {
        name: body.name,
        unitKey: body.unitKey,
        code: body.code,
        imageUrl: body.imageUrl,
        targetUrl: body.targetUrl,
        device: body.device,
        priority: body.priority,
        status: body.status,
        startAt:
          body.startAt === undefined
            ? undefined
            : body.startAt
              ? new Date(body.startAt)
              : null,
        endAt:
          body.endAt === undefined ? undefined : body.endAt ? new Date(body.endAt) : null,
      },
    });
    await writeAudit({ userId: user.id, action: "update", module: "ads", recordId: id });
    return item;
  });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  return handleApi(async () => {
    const user = await requirePermission("ads", "delete");
    const { id } = await params;
    await prisma.advertisement.delete({ where: { id } });
    await writeAudit({ userId: user.id, action: "delete", module: "ads", recordId: id });
    return { deleted: true };
  });
}
