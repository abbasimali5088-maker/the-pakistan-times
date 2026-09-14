import { copyFileSync, existsSync, mkdirSync, statSync } from "fs";
import path from "path";
import { NextRequest } from "next/server";
import { getPagination, handleApi } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  return handleApi(async () => {
    await requirePermission("backup", "read");
    const url = new URL(req.url);
    const { skip, take, page, pageSize } = getPagination(url);
    const [total, items] = await Promise.all([
      prisma.backupRecord.count(),
      prisma.backupRecord.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
    ]);
    return { items, total, page, pageSize };
  });
}

export async function POST(_req: NextRequest) {
  return handleApi(async () => {
    const user = await requirePermission("backup", "create");
    const dbUrl = process.env.DATABASE_URL || "file:./dev.db";
    const filePath = dbUrl.startsWith("file:") ? dbUrl.replace(/^file:/, "") : dbUrl;
    const absDb = path.isAbsolute(filePath)
      ? filePath
      : path.join(process.cwd(), filePath.replace(/^\.\//, ""));

    const backupDir = path.join(process.cwd(), "backups");
    mkdirSync(backupDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const dest = path.join(backupDir, `cms-${stamp}.db`);

    let size: number | null = null;
    let note = `Copied from ${absDb}`;
    let status = "completed";
    let recordedPath = dest;

    try {
      const candidates = [
        absDb,
        path.join(process.cwd(), "data", "dev.db"),
        path.join(process.cwd(), "prisma", "dev.db"),
      ];
      const source = candidates.find((p) => existsSync(p));
      if (!source) {
        status = "failed";
        recordedPath = absDb;
        note = `Database file not found. Tried: ${candidates.join(", ")}. Recorded path for manual backup.`;
      } else {
        copyFileSync(source, dest);
        size = statSync(dest).size;
        note = `Copied from ${source}`;
      }
    } catch (err) {
      status = "failed";
      recordedPath = absDb;
      note = err instanceof Error ? err.message : "Backup failed";
    }

    const item = await prisma.backupRecord.create({
      data: {
        type: "sqlite",
        path: recordedPath,
        size,
        status,
        verified: status === "completed",
        note,
      },
    });

    await writeAudit({
      userId: user.id,
      action: "create",
      module: "backup",
      recordId: item.id,
      newValue: { path: item.path, status },
    });
    return item;
  });
}
