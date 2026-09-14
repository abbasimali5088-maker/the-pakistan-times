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
    if (!publicOnly) await requirePermission("authors", "read");
    const item = await prisma.author.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
        status: publicOnly ? "active" : undefined,
      },
      include: {
        _count: { select: { articles: true } },
        user: { select: { id: true, email: true, name: true } },
      },
    });
    if (!item) throw new Error("Author not found");
    return item;
  });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  return handleApi(async () => {
    const user = await requirePermission("authors", "update");
    const { id } = await params;
    const body = z
      .object({
        name: z.string().min(1).optional(),
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
      })
      .parse(await req.json());
    const existing = await prisma.author.findUnique({ where: { id } });
    if (!existing) throw new Error("Author not found");
    if (body.slug && body.slug !== existing.slug) {
      const slug = makeSlug(body.slug);
      const clash = await prisma.author.findFirst({ where: { slug, NOT: { id } } });
      if (clash) throw new Error("Slug already exists");
    }
    const item = await prisma.author.update({
      where: { id },
      data: {
        name: body.name,
        slug: body.slug ? makeSlug(body.slug) : undefined,
        email: body.email,
        photoUrl: body.photoUrl,
        bio: body.bio,
        position: body.position,
        website: body.website,
        twitter: body.twitter,
        facebook: body.facebook,
        linkedin: body.linkedin,
        status: body.status,
        userId: body.userId,
      },
    });
    await writeAudit({ userId: user.id, action: "update", module: "authors", recordId: id });
    return item;
  });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  return handleApi(async () => {
    const user = await requirePermission("authors", "delete");
    const { id } = await params;
    await prisma.author.delete({ where: { id } });
    await writeAudit({ userId: user.id, action: "delete", module: "authors", recordId: id });
    return { deleted: true };
  });
}
