import { NextRequest } from "next/server";
import { handleApi } from "@/lib/api";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  return handleApi(async () => {
    const { id } = await params;
    const item = await prisma.liveStory.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      include: {
        category: true,
        updates: {
          where: { status: "published" },
          orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }],
        },
      },
    });
    if (!item) throw new Error("Live story not found");
    return item;
  });
}
