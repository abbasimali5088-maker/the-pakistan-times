import { NextRequest } from "next/server";
import { z } from "zod";
import { handleApi } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import {
  RATE_FIELDS,
  RATE_META_KEYS,
  defaultRatesMap,
  ratesToPublicItems,
} from "@/lib/market-rates";
import {
  ensureRatesRefreshJob,
  loadStoredRatesMap,
  nextRatesRefreshAt,
  persistRatesMap,
  syncLiveRatesToDb,
} from "@/lib/fetch-live-rates";

export const runtime = "nodejs";
export const maxDuration = 60;

const ALLOWED_KEYS = new Set([
  ...RATE_FIELDS.map((f) => f.key),
  ...RATE_META_KEYS,
]);

export async function GET(req: NextRequest) {
  return handleApi(async () => {
    const url = new URL(req.url);
    const publicOnly = url.searchParams.get("public") === "1";
    if (!publicOnly) await requirePermission("settings", "read");

    await ensureRatesRefreshJob();

    const rates = await loadStoredRatesMap();
    const items = ratesToPublicItems(rates);
    return {
      rates,
      items,
      updatedLabel: rates.updatedLabel,
      updatedLabelUr: rates.updatedLabelUr,
      sourceNote: rates.sourceNote,
      defaults: defaultRatesMap(),
      autoRefresh: {
        enabled: true,
        intervalHours: 2,
        sources: [
          "oilprices.pk / fuel.trackmate (OGRA petrol-diesel, effective date aware)",
          "open.er-api.com (forex)",
          "gold-api.com (gold/silver → PKR/tola)",
        ],
        note: "No paid API key. Syncs on stale page load + Vercel Cron every 2h + Admin Fetch live.",
      },
    };
  });
}

export async function PUT(req: NextRequest) {
  return handleApi(async () => {
    const user = await requirePermission("settings", "update");
    const json = await req.json();
    const incoming = z.record(z.string(), z.string()).parse(json.rates ?? json);

    const filtered: Record<string, string> = {};
    for (const [key, value] of Object.entries(incoming)) {
      if (ALLOWED_KEYS.has(key)) filtered[key] = value;
    }

    const results = await persistRatesMap(filtered);
    await writeAudit({
      userId: user.id,
      action: "upsert",
      module: "rates",
      newValue: { count: results.length },
    });

    const rates = await loadStoredRatesMap();
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

/** Admin: fetch live rates now from free public APIs. */
export async function POST(req: NextRequest) {
  return handleApi(async () => {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "sync";
    const user = await requirePermission("settings", "update");

    if (action !== "sync" && action !== "live") {
      throw new Error("Unknown action — use ?action=sync");
    }

    const live = await syncLiveRatesToDb();
    await ensureRatesRefreshJob(nextRatesRefreshAt());
    await writeAudit({
      userId: user.id,
      action: "live_sync",
      module: "rates",
      newValue: { sources: live.sources, errors: live.errors, syncedAt: live.syncedAt },
    });

    return {
      ok: live.sources.length > 0,
      rates: live.rates,
      items: ratesToPublicItems(live.rates),
      sources: live.sources,
      errors: live.errors,
      syncedAt: live.syncedAt,
      nextRefreshAt: nextRatesRefreshAt().toISOString(),
    };
  });
}
