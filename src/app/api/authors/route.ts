import { NextRequest } from "next/server";
import { z } from "zod";
import { getPagination, handleApi } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { makeSlug, uniqueSlug } from "@/lib/slug";

export const runtime = "nodejs";

const authorSchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  photoUrl: z.string().optional().nullable(),
  bio: z.string().optional().nullable(),
  position: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  twitter: z.string().optional().nullable(),
  facebook: z.string().optional().nullable(),
  linkedin: z.string().optional().nullable(),
  status: z.string().optional(),
  userId: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  return handleApi(async () => {
    const url = new URL(req.url);
    const publicOnly = url.searchParams.get("public") === "1";
    if (!publicOnly) await requirePermission("authors", "read");
    const q = url.searchParams.get("q");
    const { skip, take, page, pageSize } = getPagination(url);
    const where = {
      status: publicOnly ? "active" : url.searchParams.get("status") || undefined,
      OR: q
        ? [
            { name: { contains: q } },
            { slug: { contains: q } },
            { email: { contains: q } },
            { bio: { contains: q } },
          ]
        : undefined,
    };
    const [total, items] = await Promise.all([
      prisma.author.count({ where }),
      prisma.author.findMany({
        where,
        include: { _count: { select: { articles: true } }, user: { select: { id: true, email: true } } },
        orderBy: { name: "asc" },
        skip,
        take,
      }),
    ]);
    return { items, total, page, pageSize };
  });
}

export async function POST(req: NextRequest) {
  return handleApi(async () => {
    const user = await requirePermission("authors", "create");
    const body = authorSchema.parse(await req.json());
    const baseSlug = makeSlug(body.slug || body.name);
    const existing = await prisma.author.findMany({
      where: { slug: { startsWith: baseSlug } },
      select: { slug: true },
    });
    const slug = uniqueSlug(
      baseSlug,
      existing.map((e) => e.slug),
    );
    const item = await prisma.author.create({
      data: {
        name: body.name,
        slug,
        email: body.email,
        photoUrl: body.photoUrl,
        bio: body.bio,
        position: body.position,
        website: body.website,
        twitter: body.twitter,
        facebook: body.facebook,
        linkedin: body.linkedin,
        status: body.status || "active",
        userId: body.userId,
      },
    });
    await writeAudit({ userId: user.id, action: "create", module: "authors", recordId: item.id });
    return item;
  });
}
