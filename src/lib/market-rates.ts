/** Market rates (gold, petrol, forex) managed from Admin → Rates. No external API key required. */

export type RateFieldDef = {
  key: string;
  label: string;
  labelUr: string;
  unit: string;
  unitUr: string;
  placeholder?: string;
};

export const RATE_FIELDS: RateFieldDef[] = [
  {
    key: "gold24k",
    label: "Gold 24K (per tola)",
    labelUr: "سونا 24 قیراط (فی تولہ)",
    unit: "PKR / tola",
    unitUr: "روپے / تولہ",
    placeholder: "285000",
  },
  {
    key: "gold22k",
    label: "Gold 22K (per tola)",
    labelUr: "سونا 22 قیراط (فی تولہ)",
    unit: "PKR / tola",
    unitUr: "روپے / تولہ",
    placeholder: "261000",
  },
  {
    key: "gold21k",
    label: "Gold 21K (per tola)",
    labelUr: "سونا 21 قیراط (فی تولہ)",
    unit: "PKR / tola",
    unitUr: "روپے / تولہ",
    placeholder: "249000",
  },
  {
    key: "silver",
    label: "Silver (per tola)",
    labelUr: "چاندی (فی تولہ)",
    unit: "PKR / tola",
    unitUr: "روپے / تولہ",
    placeholder: "3200",
  },
  {
    key: "petrol",
    label: "Petrol",
    labelUr: "پیٹرول",
    unit: "PKR / litre",
    unitUr: "روپے / لیٹر",
    placeholder: "264.61",
  },
  {
    key: "hiOctane",
    label: "Hi-Octane",
    labelUr: "ہائی آکٹین",
    unit: "PKR / litre",
    unitUr: "روپے / لیٹر",
    placeholder: "289.96",
  },
  {
    key: "diesel",
    label: "Diesel",
    labelUr: "ڈیزل",
    unit: "PKR / litre",
    unitUr: "روپے / لیٹر",
    placeholder: "266.50",
  },
  {
    key: "usd",
    label: "US Dollar",
    labelUr: "امریکی ڈالر",
    unit: "PKR",
    unitUr: "روپے",
    placeholder: "278.50",
  },
  {
    key: "eur",
    label: "Euro",
    labelUr: "یورو",
    unit: "PKR",
    unitUr: "روپے",
    placeholder: "302.00",
  },
  {
    key: "gbp",
    label: "British Pound",
    labelUr: "برطانوی پاؤنڈ",
    unit: "PKR",
    unitUr: "روپے",
    placeholder: "355.00",
  },
  {
    key: "sar",
    label: "Saudi Riyal",
    labelUr: "سعودی ریال",
    unit: "PKR",
    unitUr: "روپے",
    placeholder: "74.20",
  },
  {
    key: "aed",
    label: "UAE Dirham",
    labelUr: "اماراتی درہم",
    unit: "PKR",
    unitUr: "روپے",
    placeholder: "75.80",
  },
];

export const RATES_GROUP = "rates";

export const RATE_META_KEYS = ["updatedLabel", "updatedLabelUr", "sourceNote"] as const;

export type RatesMap = Record<string, string>;

export function emptyRatesMap(): RatesMap {
  const map: RatesMap = {};
  for (const f of RATE_FIELDS) map[f.key] = "";
  for (const k of RATE_META_KEYS) map[k] = "";
  return map;
}

export function defaultRatesMap(): RatesMap {
  return {
    gold24k: "285000",
    gold22k: "261000",
    gold21k: "249000",
    silver: "3200",
    petrol: "264.61",
    hiOctane: "289.96",
    diesel: "266.50",
    usd: "278.50",
    eur: "302.00",
    gbp: "355.00",
    sar: "74.20",
    aed: "75.80",
    updatedLabel: "Updated today",
    updatedLabelUr: "آج اپڈیٹ",
    sourceNote: "Editable from Admin → Rates (no external API key required)",
  };
}

export function normalizeRatesMap(raw: RatesMap | Record<string, string> | undefined | null): RatesMap {
  const map = emptyRatesMap();
  const defaults = defaultRatesMap();
  for (const key of Object.keys(map)) {
    const value = raw?.[key];
    map[key] = (value && String(value).trim()) || defaults[key] || "";
  }
  return map;
}

export function formatRateValue(value: string): string {
  const n = Number(String(value).replace(/,/g, ""));
  if (!Number.isFinite(n)) return value;
  return n.toLocaleString("en-PK", { maximumFractionDigits: 2 });
}

export type PublicRateItem = {
  key: string;
  label: string;
  labelUr: string;
  value: string;
  display: string;
  unit: string;
  unitUr: string;
};

export function ratesToPublicItems(rates: RatesMap): PublicRateItem[] {
  return RATE_FIELDS.filter((f) => rates[f.key]?.trim()).map((f) => ({
    key: f.key,
    label: f.label,
    labelUr: f.labelUr,
    value: rates[f.key],
    display: formatRateValue(rates[f.key]),
    unit: f.unit,
    unitUr: f.unitUr,
  }));
}
