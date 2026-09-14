import { NextRequest } from "next/server";
import { z } from "zod";
import { getPagination, handleApi } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { makeSlug, uniqueSlug } from "@/lib/slug";

export const runtime = "nodejs";

const pageSchema = z.object({
  title: z.string().min(1),
  slug: z.string().optional().nullable(),
  body: z.string().min(1),
  bodyUr: z.string().optional().nullable(),
  status: z.string().optional(),
  seoTitle: z.string().optional().nullable(),
  seoDescription: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  return handleApi(async () => {
    const url = new URL(req.url);
    const publicOnly = url.searchParams.get("public") === "1";
    const slug = url.searchParams.get("slug");
    if (!publicOnly) await requirePermission("pages", "read");

    if (publicOnly && slug) {
      const item = await prisma.staticPage.findFirst({
        where: { slug, status: "published" },
      });
      if (!item) throw new Error("Page not found");
      return item;
    }

    const { skip, take, page, pageSize } = getPagination(url);
    const where = {
      status: publicOnly ? "published" : url.searchParams.get("status") || undefined,
      slug: slug || undefined,
    };
    const [total, items] = await Promise.all([
      prisma.staticPage.count({ where }),
      prisma.staticPage.findMany({ where, orderBy: { updatedAt: "desc" }, skip, take }),
    ]);
    return { items, total, page, pageSize };
  });
}

export async function POST(req: NextRequest) {
  return handleApi(async () => {
    const user = await requirePermission("pages", "create");
    const body = pageSchema.parse(await req.json());
    const baseSlug = makeSlug(body.slug || body.title);
    const existing = await prisma.staticPage.findMany({
      where: { slug: { startsWith: baseSlug } },
      select: { slug: true },
    });
    const slug = uniqueSlug(
      baseSlug,
      existing.map((e) => e.slug),
    );
    const item = await prisma.staticPage.create({
      data: {
        title: body.title,
        slug,
        body: body.body,
        bodyUr: body.bodyUr,
        status: body.status || "published",
        seoTitle: body.seoTitle,
        seoDescription: body.seoDescription,
      },
    });
    await writeAudit({ userId: user.id, action: "create", module: "pages", recordId: item.id });
    return item;
  });
}
