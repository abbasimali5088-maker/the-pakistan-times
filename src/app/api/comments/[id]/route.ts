import { NextRequest } from "next/server";
import { z } from "zod";
import { handleApi } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs";
type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  return handleApi(async () => {
    const user = await requirePermission("comments", "update");
    const { id } = await params;
    const body = z
      .object({
        status: z.enum(["pending", "approved", "rejected", "spam"]),
      })
      .parse(await req.json());
    const existing = await prisma.comment.findUnique({ where: { id } });
    if (!existing) throw new Error("Comment not found");
    const item = await prisma.comment.update({
      where: { id },
      data: { status: body.status },
    });
    await writeAudit({
      userId: user.id,
      action: "moderate",
      module: "comments",
      recordId: id,
      oldValue: { status: existing.status },
      newValue: { status: body.status },
    });
    return item;
  });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  return handleApi(async () => {
    const user = await requirePermission("comments", "delete");
    const { id } = await params;
    await prisma.comment.delete({ where: { id } });
    await writeAudit({ userId: user.id, action: "delete", module: "comments", recordId: id });
    return { deleted: true };
  });
}
