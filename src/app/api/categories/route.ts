import { NextRequest } from "next/server";
import { z } from "zod";
import { handleApi } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { makeSlug } from "@/lib/slug";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  return handleApi(async () => {
    const url = new URL(req.url);
    const publicOnly = url.searchParams.get("public") === "1";
    if (!publicOnly) await requirePermission("categories", "read");
    const parentId = url.searchParams.get("parentId");
    const items = await prisma.category.findMany({
      where: {
        status: publicOnly ? "active" : undefined,
        parentId: parentId === "null" ? null : parentId || undefined,
      },
      include: { children: { orderBy: { sortOrder: "asc" } }, _count: { select: { articles: true } } },
      orderBy: { sortOrder: "asc" },
    });
    return { items };
  });
}

export async function POST(req: NextRequest) {
  return handleApi(async () => {
    const user = await requirePermission("categories", "create");
    const body = z
      .object({
        name: z.string().min(1),
        nameUr: z.string().optional(),
        slug: z.string().optional(),
        description: z.string().optional(),
        parentId: z.string().optional().nullable(),
        sortOrder: z.number().optional(),
        status: z.string().optional(),
        seoTitle: z.string().optional(),
        seoDescription: z.string().optional(),
        siteId: z.string().optional().nullable(),
      })
      .parse(await req.json());
    const item = await prisma.category.create({
      data: {
        name: body.name,
        nameUr: body.nameUr,
        slug: makeSlug(body.slug || body.name),
        description: body.description,
        parentId: body.parentId,
        sortOrder: body.sortOrder || 0,
        status: body.status || "active",
        seoTitle: body.seoTitle,
        seoDescription: body.seoDescription,
        siteId: body.siteId,
      },
    });
    await writeAudit({ userId: user.id, action: "create", module: "categories", recordId: item.id });
    return item;
  });
}
