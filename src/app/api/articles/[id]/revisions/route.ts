import { NextRequest } from "next/server";
import { handleApi } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  return handleApi(async () => {
    await requirePermission("revisions", "read");
    const { id } = await params;
    const article = await prisma.article.findFirst({
      where: { OR: [{ id }, { slug: id }], deletedAt: null },
      select: { id: true },
    });
    if (!article) throw new Error("Article not found");
    const revisions = await prisma.articleRevision.findMany({
      where: { articleId: article.id },
      orderBy: { version: "desc" },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    return { items: revisions };
  });
}
