import { NextRequest } from "next/server";
import { z } from "zod";
import { handleApi } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs";
type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  return handleApi(async () => {
    const { id } = await params;
    const url = new URL(req.url);
    const publicOnly = url.searchParams.get("public") === "1";
    const item = await prisma.quiz.findUnique({
      where: { id },
      include: {
        questions: { orderBy: { sortOrder: "asc" } },
        _count: { select: { attempts: true } },
      },
    });
    if (!item) throw new Error("Quiz not found");
    if (publicOnly || item.status === "published") {
      if (item.status !== "published") throw new Error("Quiz not found");
      return {
        ...item,
        questions: item.questions.map((q) => ({
          id: q.id,
          question: q.question,
          options: JSON.parse(q.optionsJson) as string[],
          sortOrder: q.sortOrder,
        })),
      };
    }
    await requirePermission("quizzes", "read");
    return {
      ...item,
      questions: item.questions.map((q) => ({
        ...q,
        options: JSON.parse(q.optionsJson) as string[],
      })),
    };
  });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  return handleApi(async () => {
    const { id } = await params;
    const body = z
      .object({
        title: z.string().min(1).optional(),
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
        action: z.enum(["attempt"]).optional(),
        answers: z.array(z.number().int()).optional(),
      })
      .parse(await req.json());

    if (body.action === "attempt") {
      const quiz = await prisma.quiz.findUnique({
        where: { id },
        include: { questions: { orderBy: { sortOrder: "asc" } } },
      });
      if (!quiz || quiz.status !== "published") throw new Error("Quiz not available");
      const answers = body.answers || [];
      let score = 0;
      quiz.questions.forEach((q, idx) => {
        if (answers[idx] === q.correctIndex) score += 1;
      });
      const attempt = await prisma.quizAttempt.create({
        data: {
          quizId: id,
          score,
          total: quiz.questions.length,
          answersJson: JSON.stringify(answers),
        },
      });
      return {
        attemptId: attempt.id,
        score,
        total: quiz.questions.length,
        results: quiz.questions.map((q, idx) => ({
          questionId: q.id,
          correct: answers[idx] === q.correctIndex,
          correctIndex: q.correctIndex,
          explanation: q.explanation,
        })),
      };
    }

    const user = await requirePermission("quizzes", "update");
    const existing = await prisma.quiz.findUnique({ where: { id } });
    if (!existing) throw new Error("Quiz not found");

    if (body.questions) {
      await prisma.quizQuestion.deleteMany({ where: { quizId: id } });
      await prisma.quizQuestion.createMany({
        data: body.questions.map((q, idx) => ({
          quizId: id,
          question: q.question,
          optionsJson: JSON.stringify(q.options),
          correctIndex: q.correctIndex,
          explanation: q.explanation,
          sortOrder: q.sortOrder ?? idx,
        })),
      });
    }

    const item = await prisma.quiz.update({
      where: { id },
      data: {
        title: body.title,
        description: body.description,
        status: body.status,
      },
      include: { questions: { orderBy: { sortOrder: "asc" } } },
    });
    await writeAudit({ userId: user.id, action: "update", module: "quizzes", recordId: id });
    return item;
  });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  return handleApi(async () => {
    const user = await requirePermission("quizzes", "delete");
    const { id } = await params;
    await prisma.quiz.delete({ where: { id } });
    await writeAudit({ userId: user.id, action: "delete", module: "quizzes", recordId: id });
    return { deleted: true };
  });
}
