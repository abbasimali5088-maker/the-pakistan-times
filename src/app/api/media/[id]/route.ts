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
    await requirePermission("media", "read");
    const { id } = await params;
    const item = await prisma.media.findFirst({
      where: { id, deletedAt: null },
      include: { usages: true, uploadedBy: { select: { id: true, name: true } } },
    });
    if (!item) throw new Error("Media not found");
    return item;
  });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  return handleApi(async () => {
    const user = await requirePermission("media", "update");
    const { id } = await params;
    const body = z
      .object({
        alt: z.string().optional().nullable(),
        caption: z.string().optional().nullable(),
        credit: z.string().optional().nullable(),
        copyright: z.string().optional().nullable(),
        description: z.string().optional().nullable(),
        url: z.string().optional(),
        path: z.string().optional(),
        filename: z.string().optional(),
        originalName: z.string().optional(),
        mimeType: z.string().optional(),
        size: z.number().int().optional(),
        width: z.number().int().optional().nullable(),
        height: z.number().int().optional().nullable(),
        type: z.string().optional(),
        variants: z.string().optional().nullable(),
      })
      .parse(await req.json());
    const existing = await prisma.media.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new Error("Media not found");
    const item = await prisma.media.update({ where: { id }, data: body });
    await writeAudit({ userId: user.id, action: "update", module: "media", recordId: id });
    return item;
  });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  return handleApi(async () => {
    const user = await requirePermission("media", "delete");
    const { id } = await params;
    const hard = new URL(req.url).searchParams.get("hard") === "1";
    const existing = await prisma.media.findUnique({ where: { id } });
    if (!existing) throw new Error("Media not found");
    if (hard) {
      await prisma.media.delete({ where: { id } });
    } else {
      await prisma.media.update({ where: { id }, data: { deletedAt: new Date() } });
    }
    await writeAudit({
      userId: user.id,
      action: hard ? "hard_delete" : "delete",
      module: "media",
      recordId: id,
    });
    return { deleted: true };
  });
}
