import { NextRequest } from "next/server";
import { z } from "zod";
import { getPagination, handleApi } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { makeSlug, uniqueSlug } from "@/lib/slug";

export const runtime = "nodejs";

const storySchema = z.object({
  title: z.string().min(1),
  slug: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  authorId: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  status: z.string().optional(),
  startAt: z.string().optional().nullable(),
  endAt: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  return handleApi(async () => {
    const url = new URL(req.url);
    const publicOnly = url.searchParams.get("public") === "1";
    if (!publicOnly) await requirePermission("live", "read");
    const { skip, take, page, pageSize } = getPagination(url);
    const where = {
      status: publicOnly ? "live" : url.searchParams.get("status") || undefined,
    };
    const [total, items] = await Promise.all([
      prisma.liveStory.count({ where }),
      prisma.liveStory.findMany({
        where,
        include: {
          category: true,
          _count: { select: { updates: true } },
        },
        orderBy: { updatedAt: "desc" },
        skip,
        take,
      }),
    ]);
    return { items, total, page, pageSize };
  });
}

export async function POST(req: NextRequest) {
  return handleApi(async () => {
    const user = await requirePermission("live", "create");
    const body = storySchema.parse(await req.json());
    const baseSlug = makeSlug(body.slug || body.title);
    const existing = await prisma.liveStory.findMany({
      where: { slug: { startsWith: baseSlug } },
      select: { slug: true },
    });
    const slug = uniqueSlug(
      baseSlug,
      existing.map((e) => e.slug),
    );
    const item = await prisma.liveStory.create({
      data: {
        title: body.title,
        slug,
        description: body.description,
        authorId: body.authorId,
        categoryId: body.categoryId,
        status: body.status || "draft",
        startAt: body.startAt ? new Date(body.startAt) : null,
        endAt: body.endAt ? new Date(body.endAt) : null,
      },
    });
    await writeAudit({ userId: user.id, action: "create", module: "live", recordId: item.id });
    return item;
  });
}
