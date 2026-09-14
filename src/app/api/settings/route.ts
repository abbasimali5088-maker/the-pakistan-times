import { NextRequest } from "next/server";
import { z } from "zod";
import { handleApi } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { getDefaultSite } from "@/lib/content";
import {
  flattenSettingsMap,
  normalizeSettingsMap,
  type SettingsMap,
} from "@/lib/site-settings";

export const runtime = "nodejs";

const PUBLIC_GROUPS = ["general", "social", "theme", "seo", "footer", "integrations", "branding", "site"];

function rowsToMap(rows: Array<{ group: string; key: string; value: string }>): SettingsMap {
  const map: SettingsMap = {};
  for (const row of rows) {
    map[row.group] ||= {};
    map[row.group][row.key] = row.value;
  }
  return normalizeSettingsMap(map);
}

function parseIncomingSettings(raw: unknown): Array<{ group: string; key: string; value: string }> {
  // Format A: [{ group, key, value }]
  const asArray = z
    .array(z.object({ group: z.string().min(1), key: z.string().min(1), value: z.string() }))
    .safeParse(raw);
  if (asArray.success) return asArray.data;

  // Format B: { general: { siteNameEn: "..." }, social: { facebook: "..." } }
  const asMap = z.record(z.string(), z.record(z.string(), z.string())).safeParse(raw);
  if (asMap.success) return flattenSettingsMap(asMap.data);

  throw new z.ZodError([
    {
      code: "custom",
      path: ["settings"],
      message: "settings must be a nested map or an array of { group, key, value }",
    },
  ]);
}

export async function GET(req: NextRequest) {
  return handleApi(async () => {
    const url = new URL(req.url);
    const publicOnly = url.searchParams.get("public") === "1";
    const group = url.searchParams.get("group");
    if (!publicOnly) await requirePermission("settings", "read");

    const rows = await prisma.setting.findMany({
      where: publicOnly
        ? { group: group ? group : { in: PUBLIC_GROUPS } }
        : { group: group || undefined },
      orderBy: [{ group: "asc" }, { key: "asc" }],
    });

    const settings = rowsToMap(rows);
    return { settings, items: rows };
  });
}

async function upsertSettings(req: NextRequest) {
  const user = await requirePermission("settings", "update");
  const json = await req.json();
  const siteIdInput = z.string().optional().nullable().parse(json.siteId ?? null);
  const list = parseIncomingSettings(json.settings);

  const site = siteIdInput ? await prisma.site.findUnique({ where: { id: siteIdInput } }) : await getDefaultSite();
  const siteId = site?.id ?? null;

  const results = [];
  for (const s of list) {
    // Prefer updating the site-scoped row; fall back to null-site row; else create site-scoped.
    const existing =
      (siteId
        ? await prisma.setting.findFirst({ where: { siteId, group: s.group, key: s.key } })
        : null) ||
      (await prisma.setting.findFirst({
        where: { siteId: null, group: s.group, key: s.key },
      }));

    const item = existing
      ? await prisma.setting.update({
          where: { id: existing.id },
          data: { value: s.value, siteId: existing.siteId ?? siteId },
        })
      : await prisma.setting.create({
          data: {
            siteId,
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

  const settings = rowsToMap(results);
  return { items: results, settings, saved: results.length };
}

export async function PUT(req: NextRequest) {
  return handleApi(async () => upsertSettings(req));
}

export async function PATCH(req: NextRequest) {
  return handleApi(async () => upsertSettings(req));
}
