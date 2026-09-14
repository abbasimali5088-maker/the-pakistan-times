import { NextRequest } from "next/server";
import { z } from "zod";
import { getPagination, handleApi } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs";

const redirectSchema = z.object({
  fromPath: z.string().min(1),
  toPath: z.string().min(1),
  statusCode: z.number().int().optional(),
});

export async function GET(req: NextRequest) {
  return handleApi(async () => {
    await requirePermission("redirects", "read");
    const url = new URL(req.url);
    const q = url.searchParams.get("q");
    const { skip, take, page, pageSize } = getPagination(url);
    const where = q
      ? { OR: [{ fromPath: { contains: q } }, { toPath: { contains: q } }] }
      : {};
    const [total, items] = await Promise.all([
      prisma.redirect.count({ where }),
      prisma.redirect.findMany({ where, orderBy: { updatedAt: "desc" }, skip, take }),
    ]);
    return { items, total, page, pageSize };
  });
}

export async function POST(req: NextRequest) {
  return handleApi(async () => {
    const user = await requirePermission("redirects", "create");
    const body = redirectSchema.parse(await req.json());
    const item = await prisma.redirect.create({
      data: {
        fromPath: body.fromPath,
        toPath: body.toPath,
        statusCode: body.statusCode ?? 301,
      },
    });
    await writeAudit({ userId: user.id, action: "create", module: "redirects", recordId: item.id });
    return item;
  });
}
