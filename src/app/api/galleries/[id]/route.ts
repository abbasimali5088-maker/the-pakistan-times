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
    const item = await prisma.gallery.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      include: {
        author: true,
        items: { orderBy: { sortOrder: "asc" }, include: { media: true } },
      },
    });
    if (!item) throw new Error("Gallery not found");
    if (item.status !== "published") await requirePermission("galleries", "read");
    return item;
  });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  return handleApi(async () => {
    const user = await requirePermission("galleries", "update");
    const { id } = await params;
    const body = z
      .object({
        title: z.string().min(1).optional(),
        slug: z.string().optional().nullable(),
        description: z.string().optional().nullable(),
        coverUrl: z.string().optional().nullable(),
        authorId: z.string().optional().nullable(),
        status: z.string().optional(),
        items: z
          .array(
            z.object({
              mediaId: z.string().optional().nullable(),
              imageUrl: z.string().min(1),
              caption: z.string().optional().nullable(),
              credit: z.string().optional().nullable(),
              sortOrder: z.number().int().optional(),
            }),
          )
          .optional(),
      })
      .parse(await req.json());
    const existing = await prisma.gallery.findUnique({ where: { id } });
    if (!existing) throw new Error("Gallery not found");

    if (body.items) {
      await prisma.galleryItem.deleteMany({ where: { galleryId: id } });
      if (body.items.length) {
        await prisma.galleryItem.createMany({
          data: body.items.map((it, idx) => ({
            galleryId: id,
            mediaId: it.mediaId,
            imageUrl: it.imageUrl,
            caption: it.caption,
            credit: it.credit,
            sortOrder: it.sortOrder ?? idx,
          })),
        });
      }
    }

    const item = await prisma.gallery.update({
      where: { id },
      data: {
        title: body.title,
        slug: body.slug ? makeSlug(body.slug) : undefined,
        description: body.description,
        coverUrl: body.coverUrl,
        authorId: body.authorId,
        status: body.status,
      },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    });
    await writeAudit({ userId: user.id, action: "update", module: "galleries", recordId: id });
    return item;
  });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  return handleApi(async () => {
    const user = await requirePermission("galleries", "delete");
    const { id } = await params;
    await prisma.gallery.delete({ where: { id } });
    await writeAudit({ userId: user.id, action: "delete", module: "galleries", recordId: id });
    return { deleted: true };
  });
}
