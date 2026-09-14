import { NextRequest } from "next/server";
import { handleApi } from "@/lib/api";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  return handleApi(async () => {
    const url = new URL(req.url);
    const publicOnly = url.searchParams.get("public") === "1";
    const slug = url.searchParams.get("slug");

    if (slug) {
      const page = await prisma.staticPage.findFirst({
        where: {
          slug,
          ...(publicOnly ? { status: "published" } : {}),
        },
      });
      if (!page) throw new Error("Page not found");
      return page;
    }

    const items = await prisma.staticPage.findMany({
      where: publicOnly ? { status: "published" } : undefined,
      orderBy: { title: "asc" },
    });
    return { items };
  });
}
