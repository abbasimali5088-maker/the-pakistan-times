import { NextRequest } from "next/server";
import { z } from "zod";
import { getPagination, handleApi } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { makeSlug, uniqueSlug } from "@/lib/slug";

export const runtime = "nodejs";

const videoSchema = z.object({
  title: z.string().min(1),
  slug: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  provider: z.string().optional(),
  url: z.string().min(1),
  thumbnail: z.string().optional().nullable(),
  duration: z.number().int().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  authorId: z.string().optional().nullable(),
  status: z.string().optional(),
});

export async function GET(req: NextRequest) {
  return handleApi(async () => {
    const url = new URL(req.url);
    const publicOnly = url.searchParams.get("public") === "1";
    if (!publicOnly) await requirePermission("videos", "read");
    const { skip, take, page, pageSize } = getPagination(url);
    const where = {
      status: publicOnly ? "published" : url.searchParams.get("status") || undefined,
    };
    const [total, items] = await Promise.all([
      prisma.video.count({ where }),
      prisma.video.findMany({
        where,
        include: { category: true, author: true },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
    ]);
    return { items, total, page, pageSize };
  });
}

export async function POST(req: NextRequest) {
  return handleApi(async () => {
    const user = await requirePermission("videos", "create");
    const body = videoSchema.parse(await req.json());
    const baseSlug = makeSlug(body.slug || body.title);
    const existing = await prisma.video.findMany({
      where: { slug: { startsWith: baseSlug } },
      select: { slug: true },
    });
    const slug = uniqueSlug(
      baseSlug,
      existing.map((e) => e.slug),
    );
    const item = await prisma.video.create({
      data: {
        title: body.title,
        slug,
        description: body.description,
        provider: body.provider || "upload",
        url: body.url,
        thumbnail: body.thumbnail,
        duration: body.duration,
        categoryId: body.categoryId,
        authorId: body.authorId,
        status: body.status || "draft",
      },
    });
    await writeAudit({ userId: user.id, action: "create", module: "videos", recordId: item.id });
    return item;
  });
}
