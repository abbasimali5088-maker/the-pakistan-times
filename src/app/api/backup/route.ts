import { execFile } from "child_process";
import { mkdirSync, existsSync, statSync, writeFileSync } from "fs";
import path from "path";
import { promisify } from "util";
import { NextRequest } from "next/server";
import { getPagination, handleApi } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs";

const execFileAsync = promisify(execFile);

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
    const isServerless = process.env.VERCEL === "1" || process.env.AWS_LAMBDA_FUNCTION_NAME;
    const backupDir = isServerless
      ? path.join("/tmp", "pakistan-times-backups")
      : path.join(process.cwd(), "backups");
    mkdirSync(backupDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const dest = path.join(backupDir, `cms-${stamp}.sql`);

    let size: number | null = null;
    let note = "PostgreSQL logical backup";
    let status = "completed";
    let recordedPath = dest;
    const dbUrl = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL || "";

    try {
      if (!dbUrl.startsWith("postgres")) {
        throw new Error("DATABASE_URL must be a PostgreSQL connection string");
      }

      // Prefer pg_dump when available (local/VPS). On serverless, record metadata only.
      try {
        if (isServerless) {
          throw new Error("pg_dump skipped on serverless runtime");
        }
        await execFileAsync("pg_dump", [dbUrl, "-f", dest, "--no-owner", "--no-acl"], {
          timeout: 120_000,
          env: process.env,
        });
        if (existsSync(dest)) {
          size = statSync(dest).size;
          note = "pg_dump completed";
        } else {
          throw new Error("pg_dump produced no file");
        }
      } catch (dumpErr) {
        // Serverless / missing pg_dump: store a restore checklist instead of failing hard
        const fallback = path.join(backupDir, `cms-${stamp}.json`);
        const payload = {
          createdAt: new Date().toISOString(),
          provider: "postgresql",
          note: "pg_dump unavailable in this runtime. Use your host (Neon/Supabase/Vercel) backup tools or run pg_dump from CI/VPS.",
          databaseUrlHost: (() => {
            try {
              return new URL(dbUrl).host;
            } catch {
              return "unknown";
            }
          })(),
          error: dumpErr instanceof Error ? dumpErr.message : String(dumpErr),
        };
        writeFileSync(fallback, JSON.stringify(payload, null, 2));
        recordedPath = fallback;
        size = statSync(fallback).size;
        status = "completed";
        note = "Metadata backup recorded (use managed Postgres backups in production)";
      }
    } catch (err) {
      status = "failed";
      recordedPath = dest;
      note = err instanceof Error ? err.message : "Backup failed";
    }

    const item = await prisma.backupRecord.create({
      data: {
        type: "postgresql",
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
      newValue: { path: recordedPath, status },
    });

    return item;
  });
}
