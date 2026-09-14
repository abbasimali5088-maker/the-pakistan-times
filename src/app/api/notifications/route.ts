import { NextRequest } from "next/server";
import { z } from "zod";
import { getPagination, handleApi } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  return handleApi(async () => {
    const user = await requireUser();
    const url = new URL(req.url);
    const unreadOnly = url.searchParams.get("unread") === "1";
    const { skip, take, page, pageSize } = getPagination(url);
    const where = {
      userId: user.id,
      isRead: unreadOnly ? false : undefined,
    };
    const [total, items, unreadCount] = await Promise.all([
      prisma.notification.count({ where }),
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      prisma.notification.count({ where: { userId: user.id, isRead: false } }),
    ]);
    return { items, total, page, pageSize, unreadCount };
  });
}

export async function PATCH(req: NextRequest) {
  return handleApi(async () => {
    const user = await requireUser();
    const body = z
      .object({
        ids: z.array(z.string()).optional(),
        all: z.boolean().optional(),
      })
      .parse(await req.json());

    if (body.all) {
      const result = await prisma.notification.updateMany({
        where: { userId: user.id, isRead: false },
        data: { isRead: true },
      });
      return { marked: result.count };
    }

    if (!body.ids?.length) throw new Error("ids or all required");
    const result = await prisma.notification.updateMany({
      where: { userId: user.id, id: { in: body.ids } },
      data: { isRead: true },
    });
    return { marked: result.count };
  });
}
