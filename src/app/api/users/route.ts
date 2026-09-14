import { NextRequest } from "next/server";
import { z } from "zod";
import { getPagination, handleApi } from "@/lib/api";
import { requirePermission, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs";

const createSchema = z.object({
  email: z.string().email(),
  username: z.string().min(2),
  password: z.string().min(8),
  name: z.string().min(1),
  status: z.string().optional(),
  roleIds: z.array(z.string()).optional(),
});

export async function GET(req: NextRequest) {
  return handleApi(async () => {
    await requirePermission("users", "read");
    const url = new URL(req.url);
    const q = url.searchParams.get("q");
    const status = url.searchParams.get("status");
    const { skip, take, page, pageSize } = getPagination(url);
    const where = {
      deletedAt: null,
      status: status || undefined,
      OR: q
        ? [
            { email: { contains: q } },
            { username: { contains: q } },
            { name: { contains: q } },
          ]
        : undefined,
    };
    const [total, items] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
          status: true,
          twoFactorEnabled: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
          roles: { include: { role: true } },
          authorProfile: { select: { id: true, slug: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
    ]);
    return { items, total, page, pageSize };
  });
}

export async function POST(req: NextRequest) {
  return handleApi(async () => {
    const actor = await requirePermission("users", "create");
    const body = createSchema.parse(await req.json());
    const passwordHash = await hashPassword(body.password);
    const item = await prisma.user.create({
      data: {
        email: body.email,
        username: body.username,
        name: body.name,
        passwordHash,
        status: body.status || "active",
        roles: body.roleIds?.length
          ? { create: body.roleIds.map((roleId) => ({ roleId })) }
          : undefined,
      },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        status: true,
        roles: { include: { role: true } },
      },
    });
    await writeAudit({
      userId: actor.id,
      action: "create",
      module: "users",
      recordId: item.id,
      newValue: { email: item.email, username: item.username },
    });
    return item;
  });
}
