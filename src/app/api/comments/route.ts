import { NextRequest } from "next/server";
import { z } from "zod";
import { getPagination, handleApi } from "@/lib/api";
import { getSessionUser, requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  return handleApi(async () => {
    const url = new URL(req.url);
    const publicOnly = url.searchParams.get("public") === "1";
    const articleId = url.searchParams.get("articleId");
    const status = url.searchParams.get("status");
    const { skip, take, page, pageSize } = getPagination(url);

    if (publicOnly) {
      if (!articleId) {
        return { items: [], total: 0, page, pageSize };
      }
      const items = await prisma.comment.findMany({
        where: { articleId, status: "approved", parentId: null },
        include: {
          replies: {
            where: { status: "approved" },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      });
      const total = await prisma.comment.count({
        where: { articleId, status: "approved", parentId: null },
      });
      return { items, total, page, pageSize };
    }

    await requirePermission("comments", "read");
    const where = {
      articleId: articleId || undefined,
      status: status || undefined,
    };
    const [total, items] = await Promise.all([
      prisma.comment.count({ where }),
      prisma.comment.findMany({
        where,
        include: {
          article: { select: { id: true, title: true, slug: true } },
          user: { select: { id: true, name: true } },
        },
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
    const body = z
      .object({
        articleId: z.string().min(1),
        body: z.string().min(1),
        parentId: z.string().optional().nullable(),
        authorName: z.string().optional().nullable(),
        authorEmail: z.string().email().optional().nullable(),
      })
      .parse(await req.json());

    const article = await prisma.article.findFirst({
      where: { id: body.articleId, deletedAt: null, status: "published" },
    });
    if (!article) throw new Error("Article not found");

    const sessionUser = await getSessionUser();
    const item = await prisma.comment.create({
      data: {
        articleId: body.articleId,
        body: body.body,
        parentId: body.parentId,
        authorName: body.authorName || sessionUser?.name || null,
        authorEmail: body.authorEmail || sessionUser?.email || null,
        userId: sessionUser?.id || null,
        status: "pending",
        ip: req.headers.get("x-forwarded-for"),
      },
    });
    return item;
  });
}
