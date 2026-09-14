import { NextRequest } from "next/server";
import { getPagination, handleApi } from "@/lib/api";
import { prisma } from "@/lib/db";
import { articlePublicInclude, serializeArticle } from "@/lib/content";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  return handleApi(async () => {
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").trim();
    const { page, pageSize, skip, take } = getPagination(url);

    if (!q) {
      return { items: [], page, pageSize, total: 0, totalPages: 0 };
    }

    const where = {
      deletedAt: null,
      status: "published",
      OR: [
        { publishAt: null },
        { publishAt: { lte: new Date() } },
      ],
      AND: [
        {
          OR: [
            { title: { contains: q } },
            { titleUr: { contains: q } },
            { excerpt: { contains: q } },
            { excerptUr: { contains: q } },
            { body: { contains: q } },
            { bodyUr: { contains: q } },
          ],
        },
      ],
    };

    const [total, rows] = await Promise.all([
      prisma.article.count({ where }),
      prisma.article.findMany({
        where,
        include: articlePublicInclude,
        orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
        skip,
        take,
      }),
    ]);

    return {
      items: rows.map(serializeArticle),
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  });
}
