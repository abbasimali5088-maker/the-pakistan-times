import { NextRequest } from "next/server";
import { z } from "zod";
import { handleApi } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { articlePublicInclude, serializeArticle } from "@/lib/content";

export const runtime = "nodejs";

const blockSchema = z.object({
  id: z.string().optional(),
  siteId: z.string().optional().nullable(),
  sectionKey: z.string().min(1),
  title: z.string().optional().nullable(),
  articleId: z.string().optional().nullable(),
  sortOrder: z.number().int().optional(),
  priority: z.number().int().optional(),
  isVisible: z.boolean().optional(),
  startAt: z.string().optional().nullable(),
  endAt: z.string().optional().nullable(),
  configJson: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  return handleApi(async () => {
    const url = new URL(req.url);
    const publicOnly = url.searchParams.get("public") === "1";
    if (!publicOnly) await requirePermission("homepage", "read");
    const now = new Date();
    const sectionKey = url.searchParams.get("sectionKey");
    const where = publicOnly
      ? {
          isVisible: true,
          AND: [
            { OR: [{ startAt: null }, { startAt: { lte: now } }] },
            { OR: [{ endAt: null }, { endAt: { gte: now } }] },
          ],
          sectionKey: sectionKey || undefined,
        }
      : { sectionKey: sectionKey || undefined };

    const items = await prisma.homepageBlock.findMany({
      where,
      include: { article: { include: articlePublicInclude } },
      orderBy: [{ sectionKey: "asc" }, { sortOrder: "asc" }, { priority: "desc" }],
    });

    return {
      items: items.map((b) => ({
        ...b,
        article: b.article ? serializeArticle(b.article) : null,
      })),
    };
  });
}

export async function POST(req: NextRequest) {
  return handleApi(async () => {
    const user = await requirePermission("homepage", "create");
    const body = blockSchema.parse(await req.json());
    const item = await prisma.homepageBlock.create({
      data: {
        siteId: body.siteId,
        sectionKey: body.sectionKey,
        title: body.title,
        articleId: body.articleId,
        sortOrder: body.sortOrder ?? 0,
        priority: body.priority ?? 0,
        isVisible: body.isVisible ?? true,
        startAt: body.startAt ? new Date(body.startAt) : null,
        endAt: body.endAt ? new Date(body.endAt) : null,
        configJson: body.configJson,
      },
    });
    await writeAudit({ userId: user.id, action: "create", module: "homepage", recordId: item.id });
    return item;
  });
}

export async function PATCH(req: NextRequest) {
  return handleApi(async () => {
    const user = await requirePermission("homepage", "update");
    const body = blockSchema.extend({ id: z.string().min(1) }).parse(await req.json());
    const existing = await prisma.homepageBlock.findUnique({ where: { id: body.id } });
    if (!existing) throw new Error("Homepage block not found");
    const item = await prisma.homepageBlock.update({
      where: { id: body.id },
      data: {
        siteId: body.siteId,
        sectionKey: body.sectionKey,
        title: body.title,
        articleId: body.articleId,
        sortOrder: body.sortOrder,
        priority: body.priority,
        isVisible: body.isVisible,
        startAt:
          body.startAt === undefined
            ? undefined
            : body.startAt
              ? new Date(body.startAt)
              : null,
        endAt:
          body.endAt === undefined ? undefined : body.endAt ? new Date(body.endAt) : null,
        configJson: body.configJson,
      },
    });
    await writeAudit({ userId: user.id, action: "update", module: "homepage", recordId: item.id });
    return item;
  });
}
