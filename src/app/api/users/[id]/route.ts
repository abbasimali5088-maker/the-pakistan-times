import { NextRequest } from "next/server";
import { z } from "zod";
import { handleApi } from "@/lib/api";
import { requirePermission, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs";
type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  return handleApi(async () => {
    await requirePermission("users", "read");
    const { id } = await params;
    const item = await prisma.user.findFirst({
      where: { id, deletedAt: null },
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
        authorProfile: true,
      },
    });
    if (!item) throw new Error("User not found");
    return item;
  });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  return handleApi(async () => {
    const actor = await requirePermission("users", "update");
    const { id } = await params;
    const body = z
      .object({
        email: z.string().email().optional(),
        username: z.string().min(2).optional(),
        name: z.string().min(1).optional(),
        status: z.string().optional(),
        password: z.string().min(8).optional(),
        roleIds: z.array(z.string()).optional(),
        action: z.enum(["reset_password", "disable", "enable"]).optional(),
      })
      .parse(await req.json());

    const existing = await prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new Error("User not found");

    let status = body.status ?? existing.status;
    let passwordHash: string | undefined;

    if (body.action === "disable") status = "disabled";
    if (body.action === "enable") status = "active";
    if (body.action === "reset_password" || body.password) {
      if (!body.password) throw new Error("password required");
      passwordHash = await hashPassword(body.password);
    }

    if (body.roleIds) {
      await prisma.userRole.deleteMany({ where: { userId: id } });
      if (body.roleIds.length) {
        await prisma.userRole.createMany({
          data: body.roleIds.map((roleId) => ({ userId: id, roleId })),
        });
      }
    }

    const item = await prisma.user.update({
      where: { id },
      data: {
        email: body.email,
        username: body.username,
        name: body.name,
        status,
        passwordHash,
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
      action: body.action || "update",
      module: "users",
      recordId: id,
      oldValue: { status: existing.status },
      newValue: { status: item.status },
    });
    return item;
  });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  return handleApi(async () => {
    const actor = await requirePermission("users", "delete");
    const { id } = await params;
    await prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), status: "disabled" },
    });
    await prisma.session.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await writeAudit({ userId: actor.id, action: "delete", module: "users", recordId: id });
    return { deleted: true };
  });
}
