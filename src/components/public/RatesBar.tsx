import type { Lang } from "@/lib/language";
import { pickText } from "@/lib/language";
import type { PublicRateItem } from "@/lib/market-rates";

const TICKER_KEYS = ["gold24k", "petrol", "diesel", "usd", "eur", "sar"] as const;

export function RatesBar({
  lang,
  items,
  updatedLabel,
  updatedLabelUr,
}: {
  lang: Lang;
  items: PublicRateItem[];
  updatedLabel?: string;
  updatedLabelUr?: string;
}) {
  const selected = TICKER_KEYS.map((key) => items.find((i) => i.key === key)).filter(
    Boolean,
  ) as PublicRateItem[];
  if (selected.length === 0) return null;

  const updated = pickText(lang, updatedLabelUr || "آج اپڈیٹ", updatedLabel || "Updated today");
  const doubled = [...selected, ...selected];

  return (
    <div
      className="border-b border-[var(--line)] bg-[rgba(255,252,246,0.95)]"
      aria-label={lang === "ur" ? "مارکیٹ ریٹس" : "Market rates"}
    >
      <div className="mx-auto flex max-w-[var(--maxw)] items-center gap-3 overflow-hidden px-3 py-2">
        <span className="ui-sans shrink-0 bg-[var(--masthead-red)] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
          {lang === "ur" ? "ریٹس" : "Rates"}
        </span>
        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="ticker-track ui-sans text-sm text-[var(--ink)]">
            {doubled.map((item, idx) => (
              <span key={`${item.key}-${idx}`} className="inline-flex items-baseline gap-1.5">
                <strong className="font-bold">
                  {pickText(lang, item.labelUr, item.label)}
                </strong>
                <span className="text-[var(--masthead-red)] font-semibold">{item.display}</span>
                <span className="text-[var(--muted)] text-xs">
                  {pickText(lang, item.unitUr, item.unit)}
                </span>
              </span>
            ))}
          </div>
        </div>
        <span className="ui-sans hidden shrink-0 text-[11px] text-[var(--muted)] sm:inline">
          {updated}
        </span>
      </div>
    </div>
  );
}
