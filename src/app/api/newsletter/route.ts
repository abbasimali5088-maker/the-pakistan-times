import { NextRequest } from "next/server";
import { randomBytes } from "crypto";
import { z } from "zod";
import { getPagination, handleApi } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  return handleApi(async () => {
    const body = z
      .object({
        email: z.string().email(),
        name: z.string().optional().nullable(),
        listId: z.string().optional().nullable(),
      })
      .parse(await req.json());

    const existing = await prisma.newsletterSubscriber.findFirst({
      where: { email: body.email, listId: body.listId ?? null },
    });
    if (existing) {
      if (existing.status !== "active") {
        const revived = await prisma.newsletterSubscriber.update({
          where: { id: existing.id },
          data: { status: "active", unsubscribedAt: null, name: body.name ?? existing.name },
        });
        return { subscribed: true, id: revived.id };
      }
      return { subscribed: true, id: existing.id };
    }

    const item = await prisma.newsletterSubscriber.create({
      data: {
        email: body.email,
        name: body.name,
        listId: body.listId,
        token: randomBytes(24).toString("hex"),
        status: "active",
      },
    });
    return { subscribed: true, id: item.id };
  });
}

export async function GET(req: NextRequest) {
  return handleApi(async () => {
    await requirePermission("newsletter", "read");
    const url = new URL(req.url);
    const type = url.searchParams.get("type") || "subscribers";
    const { skip, take, page, pageSize } = getPagination(url);

    if (type === "campaigns") {
      const [total, items] = await Promise.all([
        prisma.newsletterCampaign.count(),
        prisma.newsletterCampaign.findMany({
          include: { list: true },
          orderBy: { createdAt: "desc" },
          skip,
          take,
        }),
      ]);
      return { type, items, total, page, pageSize };
    }

    const status = url.searchParams.get("status");
    const where = { status: status || undefined };
    const [total, items] = await Promise.all([
      prisma.newsletterSubscriber.count({ where }),
      prisma.newsletterSubscriber.findMany({
        where,
        include: { list: true },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
    ]);
    return { type: "subscribers", items, total, page, pageSize };
  });
}
