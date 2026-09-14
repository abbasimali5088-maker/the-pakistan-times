import { NextRequest } from "next/server";
import { z } from "zod";
import { handleApi } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs";
type Params = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  body: z.string().min(1),
  type: z.string().optional(),
  mediaUrl: z.string().optional().nullable(),
  quote: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  priority: z.string().optional(),
  isPinned: z.boolean().optional(),
  isImportant: z.boolean().optional(),
  status: z.string().optional(),
  publishedAt: z.string().optional().nullable(),
  updateId: z.string().optional(),
});

export async function POST(req: NextRequest, { params }: Params) {
  return handleApi(async () => {
    const user = await requirePermission("live", "update");
    const { id } = await params;
    const story = await prisma.liveStory.findUnique({ where: { id } });
    if (!story) throw new Error("Live story not found");
    const body = updateSchema.parse(await req.json());
    const item = await prisma.liveUpdate.create({
      data: {
        liveStoryId: id,
        body: body.body,
        type: body.type || "text",
        mediaUrl: body.mediaUrl,
        quote: body.quote,
        location: body.location,
        priority: body.priority || "normal",
        isPinned: body.isPinned || false,
        isImportant: body.isImportant || false,
        status: body.status || "published",
        publishedAt: body.publishedAt ? new Date(body.publishedAt) : new Date(),
      },
    });
    await prisma.liveStory.update({ where: { id }, data: { updatedAt: new Date() } });
    await writeAudit({
      userId: user.id,
      action: "create_update",
      module: "live",
      recordId: item.id,
      newValue: { liveStoryId: id },
    });
    return item;
  });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  return handleApi(async () => {
    const user = await requirePermission("live", "update");
    const { id } = await params;
    const body = updateSchema.extend({ updateId: z.string().min(1) }).parse(await req.json());
    const existing = await prisma.liveUpdate.findFirst({
      where: { id: body.updateId, liveStoryId: id },
    });
    if (!existing) throw new Error("Live update not found");
    const item = await prisma.liveUpdate.update({
      where: { id: body.updateId },
      data: {
        body: body.body,
        type: body.type,
        mediaUrl: body.mediaUrl,
        quote: body.quote,
        location: body.location,
        priority: body.priority,
        isPinned: body.isPinned,
        isImportant: body.isImportant,
        status: body.status,
        publishedAt:
          body.publishedAt === undefined
            ? undefined
            : body.publishedAt
              ? new Date(body.publishedAt)
              : undefined,
      },
    });
    await writeAudit({
      userId: user.id,
      action: "update_update",
      module: "live",
      recordId: item.id,
    });
    return item;
  });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  return handleApi(async () => {
    const user = await requirePermission("live", "delete");
    const { id } = await params;
    const updateId =
      new URL(req.url).searchParams.get("updateId") ||
      z.object({ updateId: z.string() }).parse(await req.json().catch(() => ({}))).updateId;
    if (!updateId) throw new Error("updateId required");
    const existing = await prisma.liveUpdate.findFirst({
      where: { id: updateId, liveStoryId: id },
    });
    if (!existing) throw new Error("Live update not found");
    await prisma.liveUpdate.delete({ where: { id: updateId } });
    await writeAudit({
      userId: user.id,
      action: "delete_update",
      module: "live",
      recordId: updateId,
    });
    return { deleted: true };
  });
}
