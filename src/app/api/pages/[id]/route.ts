import { NextRequest } from "next/server";
import { handleApi } from "@/lib/api";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  return handleApi(async () => {
    const { id } = await params;
    const publicOnly = new URL(req.url).searchParams.get("public") === "1";
    const page = await prisma.staticPage.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
        ...(publicOnly ? { status: "published" } : {}),
      },
    });
    if (!page) throw new Error("Page not found");
    return page;
  });
}
