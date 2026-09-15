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
/** Local Sarafa premium over international spot (approx). */
const PK_GOLD_PREMIUM = 1.004;

type FetchPart = {
  rates: Partial<RatesMap>;
  source: string;
  ok: boolean;
  error?: string;
  meta?: Record<string, string>;
};

function karachiToday(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" }); // YYYY-MM-DD
}

function parseDateLoose(raw?: string | null): string | null {
  if (!raw) return null;
  const s = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // e.g. 15-September-2026
  const m = s.match(/^(\d{1,2})[- ]([A-Za-z]+)[- ](\d{4})$/);
  if (!m) return null;
  const months: Record<string, string> = {
    january: "01",
    february: "02",
    march: "03",
    april: "04",
    may: "05",
    june: "06",
    july: "07",
    august: "08",
    september: "09",
    october: "10",
    november: "11",
    december: "12",
  };
  const mm = months[m[2].toLowerCase()];
  if (!mm) return null;
  return `${m[3]}-${mm}-${m[1].padStart(2, "0")}`;
}

async function fetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      "User-Agent": "ThePakistanTimesRatesBot/1.0 (+https://thepakistantimes.local)",
      ...(init?.headers || {}),
    },
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return res.json();
}

type FuelCandidate = {
  petrol?: number;
  diesel?: number;
  hiOctane?: number;
  effectiveDate?: string | null;
  source: string;
};

async function fetchOilpricesPk(): Promise<FuelCandidate | null> {
  const data = (await fetchJson("https://oilprices.pk/api/latest")) as {
    effectiveDate?: string;
    products?: Array<{ product?: string; pricePkr?: number }>;
  };
  const products = data.products || [];
  const nameOf = (p: { product?: string }) => (p.product || "").toLowerCase();
  const petrol = products.find((p) => nameOf(p).includes("motor spirit"));
  const diesel = products.find(
    (p) => nameOf(p).includes("high speed diesel") || /\bhsd\b/.test(nameOf(p)),
  );
  return {
    petrol: petrol?.pricePkr,
    diesel: diesel?.pricePkr,
    effectiveDate: data.effectiveDate || null,
    source: "oilprices.pk",
  };
}

async function fetchTrackmateFuel(): Promise<FuelCandidate | null> {
  const data = (await fetchJson("https://fuel.trackmate.page/api/prices")) as {
    prices?: Array<{
      source?: string;
      product?: string;
      price_pkr?: number;
      city?: string | null;
      effective_date?: string | null;
    }>;
  };
  const prices = data.prices || [];

  // Prefer PakWheels national board (has effective_date) for petrol/diesel
  const pwPetrol = prices.find((p) => p.source === "pakwheels" && p.product === "petrol");
  const pwDiesel = prices.find(
    (p) => p.source === "pakwheels" && (p.product === "hsd" || p.product === "diesel"),
  );
  const shellPetrol = prices.find((p) => p.source === "shell" && p.product === "petrol");
  const shellDiesel = prices.find(
    (p) => p.source === "shell" && (p.product === "hsd" || p.product === "diesel"),
  );

  // Hi-octane: PSO city board — use Lahore/Karachi median-ish fixed city
  const octaneRows = prices.filter(
    (p) => p.source === "pso" && p.product === "octane_plus" && typeof p.price_pkr === "number",
  );
  const preferredCity =
    octaneRows.find((p) => (p.city || "").toLowerCase() === "lahore") ||
    octaneRows.find((p) => (p.city || "").toLowerCase() === "karachi") ||
    octaneRows[0];

  const petrol = pwPetrol?.price_pkr ?? shellPetrol?.price_pkr;
  const diesel = pwDiesel?.price_pkr ?? shellDiesel?.price_pkr;
  const effective =
    parseDateLoose(pwPetrol?.effective_date) ||
    parseDateLoose(pwDiesel?.effective_date) ||
    null;

  return {
    petrol,
    diesel,
    hiOctane: preferredCity?.price_pkr,
    effectiveDate: effective,
    source: "fuel.trackmate.page",
  };
}

/**
 * Pick the fuel board that is effective for Karachi "today".
 * OGRA often publishes tomorrow's rate early — do not show it before that date.
 */
async function fetchFuel(): Promise<FetchPart> {
  const today = karachiToday();
  const parts = await Promise.allSettled([fetchOilpricesPk(), fetchTrackmateFuel()]);
  const candidates = parts
    .filter((p): p is PromiseFulfilledResult<FuelCandidate | null> => p.status === "fulfilled")
    .map((p) => p.value)
    .filter((c): c is FuelCandidate => !!c && (c.petrol != null || c.diesel != null));

  if (candidates.length === 0) {
    const err =
      parts.find((p) => p.status === "rejected")?.status === "rejected"
        ? String((parts.find((p) => p.status === "rejected") as PromiseRejectedResult).reason)
        : "No fuel source";
    return { rates: {}, source: "fuel", ok: false, error: err };
  }

  // Prefer candidate whose effectiveDate <= today, closest to today
  const valid = candidates
    .map((c) => ({
      ...c,
      eff: parseDateLoose(c.effectiveDate) || c.effectiveDate || null,
    }))
    .filter((c) => !c.eff || c.eff <= today);

  const pool = valid.length > 0 ? valid : candidates;
  // Prefer oilprices.pk when its date is already in effect; else trackmate
  const ranked = [...pool].sort((a, b) => {
    const aOil = a.source.includes("oilprices") ? 0 : 1;
    const bOil = b.source.includes("oilprices") ? 0 : 1;
    if (aOil !== bOil) return aOil - bOil;
    const ae = a.effectiveDate || "";
    const be = b.effectiveDate || "";
    return be.localeCompare(ae);
  });

  const best = ranked[0];
  // Merge hi-octane from any candidate that has it
  const hi =
    ranked.find((c) => c.hiOctane != null)?.hiOctane ??
    candidates.find((c) => c.hiOctane != null)?.hiOctane;

  const rates: Partial<RatesMap> = {};
  if (best.petrol != null) rates.petrol = Number(best.petrol).toFixed(2);
  if (best.diesel != null) rates.diesel = Number(best.diesel).toFixed(2);
  if (hi != null) rates.hiOctane = Number(hi).toFixed(2);

  const eff = parseDateLoose(best.effectiveDate) || best.effectiveDate || today;
  return {
    rates,
    source: `${best.source} (effective ${eff})`,
    ok: Object.keys(rates).length > 0,
    meta: { effectiveDate: eff, karachiToday: today },
  };
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

    // International spot → PKR/tola, plus small local market premium
    const gold24 = gold.price * pkrPerUsd * TOLA_PER_TROY_OZ * PK_GOLD_PREMIUM;
    const rates: Partial<RatesMap> = {
      gold24k: Math.round(gold24).toString(),
      gold22k: Math.round(gold24 * (22 / 24)).toString(),
      gold21k: Math.round(gold24 * (21 / 24)).toString(),
    };
    if (silver.price && Number.isFinite(silver.price)) {
      rates.silver = Math.round(
        silver.price * pkrPerUsd * TOLA_PER_TROY_OZ * PK_GOLD_PREMIUM,
      ).toString();
    }

    return { rates, source: "gold-api.com→PKR/tola", ok: true };
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
  fuelEffectiveDate?: string;
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
  const fuelDate = fuel.meta?.effectiveDate || karachiToday();

  updated.updatedLabel = `Live ${fuelDate} · ${karachi}`;
  updated.updatedLabelUr = `لائیو ${fuelDate} · ${karachi}`;
  updated.sourceNote = [
    "Pakistan live APIs (no paid key)",
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

  const merged: RatesMap = { ...base };
  for (const [key, value] of Object.entries(updated)) {
    if (value != null && value !== "") merged[key] = value;
  }

  return {
    rates: normalizeRatesMap(merged),
    updated,
    sources,
    errors,
    syncedAt,
    fuelEffectiveDate: fuelDate,
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
  return normalizeRatesMap({ ...defaultRatesMap(), ...raw });
}

/** Sync live rates into DB. Returns summary for APIs/jobs. */
export async function syncLiveRatesToDb() {
  const existing = await loadStoredRatesMap();
  const live = await fetchLiveRates(existing);
  await persistRatesMap(live.updated);
  return live;
}

/** True if we have not synced for Karachi "today" (or label missing Live). */
export function ratesLookStale(rates: RatesMap): boolean {
  const today = karachiToday();
  const label = `${rates.updatedLabel || ""} ${rates.sourceNote || ""}`;
  if (!/live/i.test(label) && !/auto-synced|pakistan live/i.test(label)) return true;
  // If petrol empty or still seed placeholder
  if (!rates.petrol || rates.petrol === "264.61") return true;
  // Stale if label has no today's date and no recent sync cue
  if (label.includes(today)) return false;
  // Parse ISO-ish from source — if updatedLabel has older date, refresh
  const m = label.match(/(\d{4}-\d{2}-\d{2})/);
  if (m && m[1] < today) return true;
  // Also stale if last sync text is older than 3 hours — check via missing today's Karachi date in label
  return !label.includes(today) && !/\d{1,2}[-/ ][A-Za-z]{3}/.test(label);
}

/**
 * If rates are stale, sync now (used on public page / API so daily petrol stays correct).
 */
export async function syncIfStale() {
  const existing = await loadStoredRatesMap();
  if (!ratesLookStale(existing)) {
    return { synced: false, rates: existing };
  }
  const live = await syncLiveRatesToDb();
  await ensureRatesRefreshJob(nextRatesRefreshAt());
  return { synced: true, rates: live.rates, live };
}

const REFRESH_INTERVAL_MS = 2 * 60 * 60 * 1000; // every 2 hours (OGRA daily pricing)

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

export { karachiToday };
