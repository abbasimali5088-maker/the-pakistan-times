import { prisma } from "./db";

export async function writeAudit(input: {
  userId?: string | null;
  action: string;
  module: string;
  recordId?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  ip?: string | null;
  userAgent?: string | null;
}) {
  await prisma.auditLog.create({
    data: {
      userId: input.userId || null,
      action: input.action,
      module: input.module,
      recordId: input.recordId || null,
      oldValue: input.oldValue == null ? null : JSON.stringify(input.oldValue),
      newValue: input.newValue == null ? null : JSON.stringify(input.newValue),
      ip: input.ip || null,
      userAgent: input.userAgent || null,
    },
  });
}

export async function enqueueJob(type: string, payload: unknown = {}, runAt = new Date()) {
  return prisma.job.create({
    data: {
      type,
      payloadJson: JSON.stringify(payload),
      runAt,
      status: "pending",
    },
  });
}
