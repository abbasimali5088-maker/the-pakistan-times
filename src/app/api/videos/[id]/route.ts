import { NextRequest } from "next/server";
import { z } from "zod";
import { handleApi } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { makeSlug } from "@/lib/slug";

export const runtime = "nodejs";
type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  return handleApi(async () => {
    const { id } = await params;
    const item = await prisma.video.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      include: { category: true, author: true },
    });
    if (!item) throw new Error("Video not found");
    if (item.status !== "published") await requirePermission("videos", "read");
    return item;
  });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  return handleApi(async () => {
    const user = await requirePermission("videos", "update");
    const { id } = await params;
    const body = z
      .object({
        title: z.string().min(1).optional(),
        slug: z.string().optional().nullable(),
        description: z.string().optional().nullable(),
        provider: z.string().optional(),
        url: z.string().optional(),
        thumbnail: z.string().optional().nullable(),
        duration: z.number().int().optional().nullable(),
        categoryId: z.string().optional().nullable(),
        authorId: z.string().optional().nullable(),
        status: z.string().optional(),
      })
      .parse(await req.json());
    const existing = await prisma.video.findUnique({ where: { id } });
    if (!existing) throw new Error("Video not found");
    const item = await prisma.video.update({
      where: { id },
      data: {
        ...body,
        slug: body.slug ? makeSlug(body.slug) : undefined,
      },
    });
    await writeAudit({ userId: user.id, action: "update", module: "videos", recordId: id });
    return item;
  });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  return handleApi(async () => {
    const user = await requirePermission("videos", "delete");
    const { id } = await params;
    await prisma.video.delete({ where: { id } });
    await writeAudit({ userId: user.id, action: "delete", module: "videos", recordId: id });
    return { deleted: true };
  });
}
