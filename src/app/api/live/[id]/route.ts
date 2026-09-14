import { NextRequest } from "next/server";
import { z } from "zod";
import { handleApi } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { makeSlug } from "@/lib/slug";

export const runtime = "nodejs";
type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  return handleApi(async () => {
    const { id } = await params;
    const url = new URL(req.url);
    const publicOnly = url.searchParams.get("public") === "1";
    const item = await prisma.liveStory.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      include: {
        category: true,
        updates: {
          where: publicOnly ? { status: "published" } : undefined,
          orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }],
        },
      },
    });
    if (!item) throw new Error("Live story not found");
    if (publicOnly && item.status !== "live") throw new Error("Live story not found");
    if (!publicOnly) await requirePermission("live", "read");
    return item;
  });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  return handleApi(async () => {
    const user = await requirePermission("live", "update");
    const { id } = await params;
    const body = z
      .object({
        title: z.string().min(1).optional(),
        slug: z.string().optional().nullable(),
        description: z.string().optional().nullable(),
        authorId: z.string().optional().nullable(),
        categoryId: z.string().optional().nullable(),
        status: z.string().optional(),
        startAt: z.string().optional().nullable(),
        endAt: z.string().optional().nullable(),
      })
      .parse(await req.json());
    const existing = await prisma.liveStory.findUnique({ where: { id } });
    if (!existing) throw new Error("Live story not found");
    const item = await prisma.liveStory.update({
      where: { id },
      data: {
        title: body.title,
        slug: body.slug ? makeSlug(body.slug) : undefined,
        description: body.description,
        authorId: body.authorId,
        categoryId: body.categoryId,
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
    await writeAudit({ userId: user.id, action: "update", module: "live", recordId: id });
    return item;
  });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  return handleApi(async () => {
    const user = await requirePermission("live", "delete");
    const { id } = await params;
    await prisma.liveStory.delete({ where: { id } });
    await writeAudit({ userId: user.id, action: "delete", module: "live", recordId: id });
    return { deleted: true };
  });
}
