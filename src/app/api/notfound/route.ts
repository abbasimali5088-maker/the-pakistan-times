import { NextRequest } from "next/server";
import { z } from "zod";
import { getPagination, handleApi } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  return handleApi(async () => {
    await requirePermission("notfound", "read");
    const url = new URL(req.url);
    const { skip, take, page, pageSize } = getPagination(url);
    const [total, items] = await Promise.all([
      prisma.notFoundHit.count(),
      prisma.notFoundHit.findMany({
        orderBy: [{ hits: "desc" }, { lastSeen: "desc" }],
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
        url: z.string().min(1),
        referrer: z.string().optional().nullable(),
      })
      .parse(await req.json());

    const existing = await prisma.notFoundHit.findUnique({ where: { url: body.url } });
    if (existing) {
      const item = await prisma.notFoundHit.update({
        where: { id: existing.id },
        data: {
          hits: { increment: 1 },
          lastSeen: new Date(),
          referrer: body.referrer ?? existing.referrer,
        },
      });
      return item;
    }
    const item = await prisma.notFoundHit.create({
      data: { url: body.url, referrer: body.referrer },
    });
    return item;
  });
}
