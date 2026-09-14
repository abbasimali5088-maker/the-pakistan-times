import { NextRequest } from "next/server";
import { z } from "zod";
import { getPagination, handleApi } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs";

const quizSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  status: z.string().optional(),
  questions: z
    .array(
      z.object({
        question: z.string().min(1),
        options: z.array(z.string()).min(2),
        correctIndex: z.number().int().nonnegative(),
        explanation: z.string().optional().nullable(),
        sortOrder: z.number().int().optional(),
      }),
    )
    .optional(),
});

export async function GET(req: NextRequest) {
  return handleApi(async () => {
    const url = new URL(req.url);
    const publicOnly = url.searchParams.get("public") === "1";
    if (!publicOnly) await requirePermission("quizzes", "read");
    const { skip, take, page, pageSize } = getPagination(url);
    const where = {
      status: publicOnly ? "published" : url.searchParams.get("status") || undefined,
    };
    const [total, items] = await Promise.all([
      prisma.quiz.count({ where }),
      prisma.quiz.findMany({
        where,
        include: { _count: { select: { questions: true, attempts: true } } },
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
    const user = await requirePermission("quizzes", "create");
    const body = quizSchema.parse(await req.json());
    const item = await prisma.quiz.create({
      data: {
        title: body.title,
        description: body.description,
        status: body.status || "draft",
        questions: body.questions?.length
          ? {
              create: body.questions.map((q, idx) => ({
                question: q.question,
                optionsJson: JSON.stringify(q.options),
                correctIndex: q.correctIndex,
                explanation: q.explanation,
                sortOrder: q.sortOrder ?? idx,
              })),
            }
          : undefined,
      },
      include: { questions: { orderBy: { sortOrder: "asc" } } },
    });
    await writeAudit({ userId: user.id, action: "create", module: "quizzes", recordId: item.id });
    return item;
  });
}
