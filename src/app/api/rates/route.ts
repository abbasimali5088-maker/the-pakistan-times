import { NextRequest } from "next/server";
import { z } from "zod";
import { handleApi } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { getDefaultSite } from "@/lib/content";
import {
  RATES_GROUP,
  RATE_FIELDS,
  RATE_META_KEYS,
  defaultRatesMap,
  normalizeRatesMap,
  ratesToPublicItems,
  type RatesMap,
} from "@/lib/market-rates";

export const runtime = "nodejs";

const ALLOWED_KEYS = new Set([
  ...RATE_FIELDS.map((f) => f.key),
  ...RATE_META_KEYS,
]);

async function loadRatesMap(): Promise<RatesMap> {
  const rows = await prisma.setting.findMany({
    where: { group: RATES_GROUP },
  });
  const raw: RatesMap = {};
  for (const row of rows) raw[row.key] = row.value;
  return normalizeRatesMap(raw);
}

export async function GET(req: NextRequest) {
  return handleApi(async () => {
    const url = new URL(req.url);
    const publicOnly = url.searchParams.get("public") === "1";
    if (!publicOnly) await requirePermission("settings", "read");

    const rates = await loadRatesMap();
    const items = ratesToPublicItems(rates);
    return {
      rates,
      items,
      updatedLabel: rates.updatedLabel,
      updatedLabelUr: rates.updatedLabelUr,
      sourceNote: rates.sourceNote,
      defaults: defaultRatesMap(),
    };
  });
}

export async function PUT(req: NextRequest) {
  return handleApi(async () => {
    const user = await requirePermission("settings", "update");
    const json = await req.json();
    const incoming = z.record(z.string(), z.string()).parse(json.rates ?? json);

    const site = await getDefaultSite();
    const siteId = site?.id ?? null;
    const results = [];

    for (const [key, value] of Object.entries(incoming)) {
      if (!ALLOWED_KEYS.has(key)) continue;
      const existing =
        (siteId
          ? await prisma.setting.findFirst({
              where: { siteId, group: RATES_GROUP, key },
            })
          : null) ||
        (await prisma.setting.findFirst({
          where: { siteId: null, group: RATES_GROUP, key },
        }));

      const item = existing
        ? await prisma.setting.update({
            where: { id: existing.id },
            data: { value, siteId: existing.siteId ?? siteId },
          })
        : await prisma.setting.create({
            data: { siteId, group: RATES_GROUP, key, value },
          });
      results.push(item);
    }

    await writeAudit({
      userId: user.id,
      action: "upsert",
      module: "rates",
      newValue: { count: results.length },
    });

    const rates = await loadRatesMap();
    return {
      saved: results.length,
      rates,
      items: ratesToPublicItems(rates),
    };
  });
}

export async function PATCH(req: NextRequest) {
  return PUT(req);
}
