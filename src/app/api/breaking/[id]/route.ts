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
    await requirePermission("breaking", "read");
    const { id } = await params;
    const item = await prisma.breakingNews.findUnique({
      where: { id },
      include: {
        article: { select: { id: true, title: true, slug: true } },
        approver: { select: { id: true, name: true } },
      },
    });
    if (!item) throw new Error("Breaking news not found");
    return item;
  });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  return handleApi(async () => {
    const user = await requirePermission("breaking", "update");
    const { id } = await params;
    const body = z
      .object({
        headline: z.string().min(1).optional(),
        headlineUr: z.string().optional().nullable(),
        priority: z.number().int().optional(),
        status: z.string().optional(),
        startAt: z.string().optional().nullable(),
        endAt: z.string().optional().nullable(),
        articleId: z.string().optional().nullable(),
        authorId: z.string().optional().nullable(),
        action: z.enum(["activate", "deactivate"]).optional(),
      })
      .parse(await req.json());

    const existing = await prisma.breakingNews.findUnique({ where: { id } });
    if (!existing) throw new Error("Breaking news not found");

    let status = body.status ?? existing.status;
    let approverId = existing.approverId;
    if (body.action === "activate") {
      await requirePermission("breaking", "approve");
      status = "active";
      approverId = user.id;
    }
    if (body.action === "deactivate") {
      status = "inactive";
    }

    const item = await prisma.breakingNews.update({
      where: { id },
      data: {
        headline: body.headline,
        headlineUr: body.headlineUr,
        priority: body.priority,
        status,
        startAt:
          body.startAt === undefined
            ? undefined
            : body.startAt
              ? new Date(body.startAt)
              : null,
        endAt:
          body.endAt === undefined ? undefined : body.endAt ? new Date(body.endAt) : null,
        articleId: body.articleId,
        authorId: body.authorId,
        approverId,
      },
    });
    await writeAudit({
      userId: user.id,
      action: body.action || "update",
      module: "breaking",
      recordId: id,
    });
    return item;
  });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  return handleApi(async () => {
    const user = await requirePermission("breaking", "delete");
    const { id } = await params;
    await prisma.breakingNews.delete({ where: { id } });
    await writeAudit({ userId: user.id, action: "delete", module: "breaking", recordId: id });
    return { deleted: true };
  });
}
