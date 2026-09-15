import {
  RATES_GROUP,
  defaultRatesMap,
  normalizeRatesMap,
  type RatesMap,
} from "@/lib/market-rates";
import { prisma } from "@/lib/db";
import { getDefaultSite } from "@/lib/content";
import { enqueueJob } from "@/lib/audit";

const TOLA_PER_TROY_OZ = 11.6638038 / 31.1034768; // ≈ 0.375

type FetchPart = {
  rates: Partial<RatesMap>;
  source: string;
  ok: boolean;
  error?: string;
};

async function fetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      "User-Agent": "ThePakistanTimesRatesBot/1.0",
      ...(init?.headers || {}),
    },
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return res.json();
}

async function fetchFuel(): Promise<FetchPart> {
  try {
    const data = (await fetchJson("https://oilprices.pk/api/latest")) as {
      effectiveDate?: string;
      products?: Array<{ product?: string; pricePkr?: number }>;
    };
    const products = data.products || [];
    const find = (...needles: string[]) =>
      products.find((p) => {
        const name = (p.product || "").toLowerCase();
        return needles.some((n) => name.includes(n.toLowerCase()));
      });

    // Prefer "Motor Spirit" — do NOT match LPG ("Liquefied Petroleum Gas")
    const petrol =
      find("motor spirit") ||
      products.find((p) => {
        const name = (p.product || "").toLowerCase();
        return /\bpetrol\b/.test(name) && !name.includes("liquefied") && !name.includes("lpg");
      });
    const diesel = find("high speed diesel", "hsd") || find("diesel");
    const rates: Partial<RatesMap> = {};
    if (petrol?.pricePkr != null) rates.petrol = String(petrol.pricePkr);
    if (diesel?.pricePkr != null) rates.diesel = String(diesel.pricePkr);

    return {
      rates,
      source: `oilprices.pk${data.effectiveDate ? ` (${data.effectiveDate})` : ""}`,
      ok: Object.keys(rates).length > 0,
      error: Object.keys(rates).length ? undefined : "No petrol/diesel in response",
    };
  } catch (err) {
    return {
      rates: {},
      source: "oilprices.pk",
      ok: false,
      error: err instanceof Error ? err.message : "Fuel fetch failed",
    };
  }
}

async function fetchForex(): Promise<FetchPart> {
  try {
    const data = (await fetchJson("https://open.er-api.com/v6/latest/USD")) as {
      result?: string;
      rates?: Record<string, number>;
    };
    if (data.result !== "success" || !data.rates?.PKR) {
      throw new Error("Unexpected forex payload");
    }
    const r = data.rates;
    const pkr = r.PKR;
    const rates: Partial<RatesMap> = {
      usd: pkr.toFixed(2),
    };
    if (r.EUR) rates.eur = (pkr / r.EUR).toFixed(2);
    if (r.GBP) rates.gbp = (pkr / r.GBP).toFixed(2);
    if (r.SAR) rates.sar = (pkr / r.SAR).toFixed(2);
    if (r.AED) rates.aed = (pkr / r.AED).toFixed(2);

    return { rates, source: "open.er-api.com", ok: true };
  } catch (err) {
    return {
      rates: {},
      source: "open.er-api.com",
      ok: false,
      error: err instanceof Error ? err.message : "Forex fetch failed",
    };
  }
}

async function fetchMetals(pkrPerUsd: number): Promise<FetchPart> {
  try {
    const [gold, silver] = await Promise.all([
      fetchJson("https://api.gold-api.com/price/XAU") as Promise<{ price?: number }>,
      fetchJson("https://api.gold-api.com/price/XAG") as Promise<{ price?: number }>,
    ]);
    if (!gold.price || !Number.isFinite(gold.price)) throw new Error("No gold price");

    const gold24 = gold.price * pkrPerUsd * TOLA_PER_TROY_OZ;
    const rates: Partial<RatesMap> = {
      gold24k: Math.round(gold24).toString(),
      gold22k: Math.round(gold24 * (22 / 24)).toString(),
      gold21k: Math.round(gold24 * (21 / 24)).toString(),
    };
    if (silver.price && Number.isFinite(silver.price)) {
      rates.silver = Math.round(silver.price * pkrPerUsd * TOLA_PER_TROY_OZ).toString();
    }

    return { rates, source: "gold-api.com", ok: true };
  } catch (err) {
    return {
      rates: {},
      source: "gold-api.com",
      ok: false,
      error: err instanceof Error ? err.message : "Metals fetch failed",
    };
  }
}

export type LiveRatesResult = {
  rates: RatesMap;
  updated: Partial<RatesMap>;
  sources: string[];
  errors: string[];
  syncedAt: string;
};

export async function fetchLiveRates(existing?: RatesMap): Promise<LiveRatesResult> {
  const base = normalizeRatesMap({ ...defaultRatesMap(), ...(existing || {}) });
  const [fuel, forex] = await Promise.all([fetchFuel(), fetchForex()]);

  const pkrPerUsd = Number(forex.rates.usd || base.usd) || 278;
  const metals = await fetchMetals(pkrPerUsd);

  const updated: Partial<RatesMap> = {
    ...fuel.rates,
    ...forex.rates,
    ...metals.rates,
  };

  const now = new Date();
  const syncedAt = now.toISOString();
  const karachi = now.toLocaleString("en-PK", {
    timeZone: "Asia/Karachi",
    dateStyle: "medium",
    timeStyle: "short",
  });

  updated.updatedLabel = `Live · ${karachi}`;
  updated.updatedLabelUr = `لائیو · ${karachi}`;
  updated.sourceNote = [
    "Auto-synced from free public APIs (no API key)",
    fuel.ok ? fuel.source : null,
    forex.ok ? forex.source : null,
    metals.ok ? metals.source : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const sources = [fuel, forex, metals].filter((p) => p.ok).map((p) => p.source);
  const errors = [fuel, forex, metals]
    .filter((p) => !p.ok)
    .map((p) => `${p.source}: ${p.error || "failed"}`);

  return {
    rates: normalizeRatesMap({ ...base, ...updated }),
    updated,
    sources,
    errors,
    syncedAt,
  };
}

export async function persistRatesMap(rates: Partial<RatesMap> | RatesMap) {
  const site = await getDefaultSite();
  const siteId = site?.id ?? null;
  const results = [];

  for (const [key, value] of Object.entries(rates)) {
    if (value == null) continue;
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
          data: { value: String(value), siteId: existing.siteId ?? siteId },
        })
      : await prisma.setting.create({
          data: { siteId, group: RATES_GROUP, key, value: String(value) },
        });
    results.push(item);
  }

  return results;
}

export async function loadStoredRatesMap(): Promise<RatesMap> {
  const rows = await prisma.setting.findMany({ where: { group: RATES_GROUP } });
  const raw: RatesMap = {};
  for (const row of rows) raw[row.key] = row.value;
  return normalizeRatesMap(raw);
}

/** Sync live rates into DB. Returns summary for APIs/jobs. */
export async function syncLiveRatesToDb() {
  const existing = await loadStoredRatesMap();
  const live = await fetchLiveRates(existing);
  // Only write keys that were successfully fetched (+ labels)
  const toSave = { ...live.updated };
  await persistRatesMap(toSave);
  return live;
}

const REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000; // every 6 hours

/** Ensure a recurring refresh_rates job exists (idempotent). */
export async function ensureRatesRefreshJob(runAt = new Date(Date.now() + REFRESH_INTERVAL_MS)) {
  const pending = await prisma.job.findFirst({
    where: { type: "refresh_rates", status: "pending" },
    orderBy: { runAt: "asc" },
  });
  if (pending) return pending;
  return enqueueJob("refresh_rates", { reason: "schedule" }, runAt);
}

export function nextRatesRefreshAt() {
  return new Date(Date.now() + REFRESH_INTERVAL_MS);
}
