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
    const item = await prisma.category.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      include: { children: true, parent: true },
    });
    if (!item) throw new Error("Category not found");
    return item;
  });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  return handleApi(async () => {
    const user = await requirePermission("categories", "update");
    const { id } = await params;
    const body = z
      .object({
        name: z.string().optional(),
        nameUr: z.string().optional().nullable(),
        slug: z.string().optional(),
        description: z.string().optional().nullable(),
        parentId: z.string().optional().nullable(),
        sortOrder: z.number().optional(),
        status: z.string().optional(),
        seoTitle: z.string().optional().nullable(),
        seoDescription: z.string().optional().nullable(),
      })
      .parse(await req.json());
    const item = await prisma.category.update({
      where: { id },
      data: {
        ...body,
        slug: body.slug ? makeSlug(body.slug) : undefined,
      },
    });
    await writeAudit({ userId: user.id, action: "update", module: "categories", recordId: id });
    return item;
  });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  return handleApi(async () => {
    const user = await requirePermission("categories", "delete");
    const { id } = await params;
    await prisma.category.delete({ where: { id } });
    await writeAudit({ userId: user.id, action: "delete", module: "categories", recordId: id });
    return { deleted: true };
  });
}
