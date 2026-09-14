import { NextRequest } from "next/server";
import { z } from "zod";
import { handleApi } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  return handleApi(async () => {
    const url = new URL(req.url);
    const publicOnly = url.searchParams.get("public") === "1";
    const group = url.searchParams.get("group");
    if (!publicOnly) await requirePermission("settings", "read");

    const rows = await prisma.setting.findMany({
      where: publicOnly
        ? {
            group: group
              ? group
              : { in: ["site", "seo", "social", "branding"] },
          }
        : { group: group || undefined },
      orderBy: [{ group: "asc" }, { key: "asc" }],
    });

    const map: Record<string, Record<string, string>> = {};
    for (const row of rows) {
      if (!map[row.group]) map[row.group] = {};
      map[row.group][row.key] = row.value;
    }
    return { settings: map, items: rows };
  });
}

export async function PUT(req: NextRequest) {
  return handleApi(async () => {
    const user = await requirePermission("settings", "update");
    const body = z
      .object({
        siteId: z.string().optional().nullable(),
        settings: z.array(
          z.object({
            group: z.string().min(1),
            key: z.string().min(1),
            value: z.string(),
          }),
        ),
      })
      .parse(await req.json());

    const results = [];
    for (const s of body.settings) {
      const existing = await prisma.setting.findFirst({
        where: {
          siteId: body.siteId ?? null,
          group: s.group,
          key: s.key,
        },
      });
      const item = existing
        ? await prisma.setting.update({
            where: { id: existing.id },
            data: { value: s.value },
          })
        : await prisma.setting.create({
            data: {
              siteId: body.siteId ?? null,
              group: s.group,
              key: s.key,
              value: s.value,
            },
          });
      results.push(item);
    }

    await writeAudit({
      userId: user.id,
      action: "upsert",
      module: "settings",
      newValue: { count: results.length },
    });
    return { items: results };
  });
}
