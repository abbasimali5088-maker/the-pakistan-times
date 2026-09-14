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
    const item = await prisma.staticPage.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
        status: publicOnly ? "published" : undefined,
      },
    });
    if (!item) throw new Error("Page not found");
    if (!publicOnly) await requirePermission("pages", "read");
    return item;
  });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  return handleApi(async () => {
    const user = await requirePermission("pages", "update");
    const { id } = await params;
    const body = z
      .object({
        title: z.string().min(1).optional(),
        slug: z.string().optional().nullable(),
        body: z.string().optional(),
        bodyUr: z.string().optional().nullable(),
        status: z.string().optional(),
        seoTitle: z.string().optional().nullable(),
        seoDescription: z.string().optional().nullable(),
      })
      .parse(await req.json());
    const existing = await prisma.staticPage.findUnique({ where: { id } });
    if (!existing) throw new Error("Page not found");
    const item = await prisma.staticPage.update({
      where: { id },
      data: {
        title: body.title,
        slug: body.slug ? makeSlug(body.slug) : undefined,
        body: body.body,
        bodyUr: body.bodyUr,
        status: body.status,
        seoTitle: body.seoTitle,
        seoDescription: body.seoDescription,
      },
    });
    await writeAudit({ userId: user.id, action: "update", module: "pages", recordId: id });
    return item;
  });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  return handleApi(async () => {
    const user = await requirePermission("pages", "delete");
    const { id } = await params;
    await prisma.staticPage.delete({ where: { id } });
    await writeAudit({ userId: user.id, action: "delete", module: "pages", recordId: id });
    return { deleted: true };
  });
}
