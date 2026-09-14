import { NextRequest } from "next/server";
import { z } from "zod";
import { getPagination, handleApi } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs";

const createSchema = z.object({
  headline: z.string().min(1),
  headlineUr: z.string().optional().nullable(),
  priority: z.number().int().optional(),
  status: z.string().optional(),
  startAt: z.string().optional().nullable(),
  endAt: z.string().optional().nullable(),
  articleId: z.string().optional().nullable(),
  authorId: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  return handleApi(async () => {
    const url = new URL(req.url);
    const publicOnly = url.searchParams.get("public") === "1";
    if (!publicOnly) await requirePermission("breaking", "read");
    const { skip, take, page, pageSize } = getPagination(url);
    const now = new Date();
    const where = publicOnly
      ? {
          status: "active",
          AND: [
            { OR: [{ startAt: null }, { startAt: { lte: now } }] },
            { OR: [{ endAt: null }, { endAt: { gte: now } }] },
          ],
        }
      : {
          status: url.searchParams.get("status") || undefined,
        };
    const [total, items] = await Promise.all([
      prisma.breakingNews.count({ where }),
      prisma.breakingNews.findMany({
        where,
        include: {
          article: { select: { id: true, title: true, slug: true } },
          approver: { select: { id: true, name: true } },
        },
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
        skip,
        take,
      }),
    ]);
    return { items, total, page, pageSize };
  });
}

export async function POST(req: NextRequest) {
  return handleApi(async () => {
    const user = await requirePermission("breaking", "create");
    const body = createSchema.parse(await req.json());
    const item = await prisma.breakingNews.create({
      data: {
        headline: body.headline,
        headlineUr: body.headlineUr,
        priority: body.priority ?? 1,
        status: body.status || "draft",
        startAt: body.startAt ? new Date(body.startAt) : null,
        endAt: body.endAt ? new Date(body.endAt) : null,
        articleId: body.articleId,
        authorId: body.authorId,
      },
    });
    await writeAudit({ userId: user.id, action: "create", module: "breaking", recordId: item.id });
    return item;
  });
}
