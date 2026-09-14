import { NextRequest } from "next/server";
import { handleApi } from "@/lib/api";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  return handleApi(async () => {
    const publicOnly = new URL(req.url).searchParams.get("public") === "1";
    const items = await prisma.liveStory.findMany({
      where: publicOnly
        ? { status: { in: ["live", "published", "active"] } }
        : undefined,
      include: {
        category: true,
        updates: {
          where: publicOnly ? { status: "published" } : undefined,
          orderBy: { publishedAt: "desc" },
          take: 3,
        },
      },
      orderBy: { updatedAt: "desc" },
    });
    return { items };
  });
}
