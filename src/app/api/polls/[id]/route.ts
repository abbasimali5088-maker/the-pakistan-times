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
    const { id } = await params;
    const item = await prisma.poll.findUnique({
      where: { id },
      include: { options: true, _count: { select: { votes: true } } },
    });
    if (!item) throw new Error("Poll not found");
    if (item.status !== "active") await requirePermission("polls", "read");
    return item;
  });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  return handleApi(async () => {
    const { id } = await params;
    const body = z
      .object({
        question: z.string().min(1).optional(),
        status: z.string().optional(),
        startAt: z.string().optional().nullable(),
        endAt: z.string().optional().nullable(),
        options: z.array(z.object({ label: z.string().min(1) })).min(2).optional(),
        action: z.enum(["vote"]).optional(),
        optionId: z.string().optional(),
        voterKey: z.string().optional(),
      })
      .parse(await req.json());

    if (body.action === "vote") {
      if (!body.optionId || !body.voterKey) throw new Error("optionId and voterKey required");
      const poll = await prisma.poll.findUnique({
        where: { id },
        include: { options: true },
      });
      if (!poll || poll.status !== "active") throw new Error("Poll not available");
      const option = poll.options.find((o) => o.id === body.optionId);
      if (!option) throw new Error("Option not found");

      const existing = await prisma.pollVote.findUnique({
        where: { pollId_voterKey: { pollId: id, voterKey: body.voterKey } },
      });
      if (existing) throw new Error("Already voted");

      await prisma.$transaction([
        prisma.pollVote.create({
          data: { pollId: id, optionId: body.optionId, voterKey: body.voterKey },
        }),
        prisma.pollOption.update({
          where: { id: body.optionId },
          data: { votes: { increment: 1 } },
        }),
      ]);

      return prisma.poll.findUnique({
        where: { id },
        include: { options: true, _count: { select: { votes: true } } },
      });
    }

    const user = await requirePermission("polls", "update");
    const existing = await prisma.poll.findUnique({ where: { id } });
    if (!existing) throw new Error("Poll not found");

    if (body.options) {
      await prisma.pollOption.deleteMany({ where: { pollId: id } });
      await prisma.pollOption.createMany({
        data: body.options.map((o) => ({ pollId: id, label: o.label })),
      });
    }

    const item = await prisma.poll.update({
      where: { id },
      data: {
        question: body.question,
        status: body.status,
        startAt:
          body.startAt === undefined
            ? undefined
            : body.startAt
              ? new Date(body.startAt)
              : null,
        endAt:
          body.endAt === undefined ? undefined : body.endAt ? new Date(body.endAt) : null,
      },
      include: { options: true },
    });
    await writeAudit({ userId: user.id, action: "update", module: "polls", recordId: id });
    return item;
  });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  return handleApi(async () => {
    const user = await requirePermission("polls", "delete");
    const { id } = await params;
    await prisma.poll.delete({ where: { id } });
    await writeAudit({ userId: user.id, action: "delete", module: "polls", recordId: id });
    return { deleted: true };
  });
}
