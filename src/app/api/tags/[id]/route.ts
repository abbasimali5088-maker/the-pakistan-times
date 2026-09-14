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
    const item = await prisma.tag.findFirst({ where: { OR: [{ id }, { slug: id }] } });
    if (!item) throw new Error("Tag not found");
    return item;
  });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  return handleApi(async () => {
    const user = await requirePermission("tags", "update");
    const { id } = await params;
    const body = z
      .object({
        name: z.string().optional(),
        nameUr: z.string().optional().nullable(),
        slug: z.string().optional(),
        description: z.string().optional().nullable(),
        seoTitle: z.string().optional().nullable(),
        seoDescription: z.string().optional().nullable(),
        mergeIntoId: z.string().optional(),
      })
      .parse(await req.json());

    if (body.mergeIntoId) {
      await requirePermission("tags", "manage");
      const links = await prisma.articleTag.findMany({ where: { tagId: id } });
      for (const link of links) {
        await prisma.articleTag.upsert({
          where: { articleId_tagId: { articleId: link.articleId, tagId: body.mergeIntoId } },
          update: {},
          create: { articleId: link.articleId, tagId: body.mergeIntoId },
        });
      }
      await prisma.articleTag.deleteMany({ where: { tagId: id } });
      const usage = await prisma.articleTag.count({ where: { tagId: body.mergeIntoId } });
      await prisma.tag.update({ where: { id: body.mergeIntoId }, data: { usageCount: usage } });
      await prisma.tag.delete({ where: { id } });
      await writeAudit({
        userId: user.id,
        action: "merge",
        module: "tags",
        recordId: id,
        newValue: { mergeIntoId: body.mergeIntoId },
      });
      return { merged: true };
    }

    const item = await prisma.tag.update({
      where: { id },
      data: {
        name: body.name,
        nameUr: body.nameUr,
        slug: body.slug ? makeSlug(body.slug) : undefined,
        description: body.description,
        seoTitle: body.seoTitle,
        seoDescription: body.seoDescription,
      },
    });
    await writeAudit({ userId: user.id, action: "update", module: "tags", recordId: id });
    return item;
  });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  return handleApi(async () => {
    const user = await requirePermission("tags", "delete");
    const { id } = await params;
    await prisma.tag.delete({ where: { id } });
    await writeAudit({ userId: user.id, action: "delete", module: "tags", recordId: id });
    return { deleted: true };
  });
}
