import { NextRequest } from "next/server";
import { handleApi } from "@/lib/api";
import { prisma } from "@/lib/db";
import { articlePublicInclude, serializeArticle } from "@/lib/content";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  return handleApi(async () => {
    const url = new URL(req.url);
    const publicOnly = url.searchParams.get("public") === "1";
    const now = new Date();

    const blocks = await prisma.homepageBlock.findMany({
      where: publicOnly
        ? {
            isVisible: true,
            OR: [{ startAt: null }, { startAt: { lte: now } }],
            AND: [{ OR: [{ endAt: null }, { endAt: { gte: now } }] }],
          }
        : undefined,
      include: { article: { include: articlePublicInclude } },
      orderBy: [{ sectionKey: "asc" }, { sortOrder: "asc" }, { priority: "desc" }],
    });

    const serialized = blocks.map((b) => ({
      id: b.id,
      sectionKey: b.sectionKey,
      title: b.title,
      sortOrder: b.sortOrder,
      priority: b.priority,
      isVisible: b.isVisible,
      configJson: b.configJson,
      article: b.article ? serializeArticle(b.article) : null,
    }));

    const sections: Record<string, typeof serialized> = {};
    for (const block of serialized) {
      sections[block.sectionKey] ||= [];
      sections[block.sectionKey].push(block);
    }

    return { blocks: serialized, sections };
  });
}
