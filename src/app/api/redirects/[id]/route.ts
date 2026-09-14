import { NextRequest } from "next/server";
import { z } from "zod";
import { handleApi } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs";
type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  return handleApi(async () => {
    await requirePermission("redirects", "read");
    const { id } = await params;
    const item = await prisma.redirect.findUnique({ where: { id } });
    if (!item) throw new Error("Redirect not found");
    return item;
  });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  return handleApi(async () => {
    const user = await requirePermission("redirects", "update");
    const { id } = await params;
    const body = z
      .object({
        fromPath: z.string().min(1).optional(),
        toPath: z.string().min(1).optional(),
        statusCode: z.number().int().optional(),
      })
      .parse(await req.json());
    const existing = await prisma.redirect.findUnique({ where: { id } });
    if (!existing) throw new Error("Redirect not found");
    const item = await prisma.redirect.update({ where: { id }, data: body });
    await writeAudit({ userId: user.id, action: "update", module: "redirects", recordId: id });
    return item;
  });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  return handleApi(async () => {
    const user = await requirePermission("redirects", "delete");
    const { id } = await params;
    await prisma.redirect.delete({ where: { id } });
    await writeAudit({ userId: user.id, action: "delete", module: "redirects", recordId: id });
    return { deleted: true };
  });
}
