import Link from "next/link";
import type { Lang } from "@/lib/language";
import { brandName, pickText } from "@/lib/language";
import type { MenuItem, PublicCategory } from "@/lib/public-types";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { Navigation } from "./Navigation";
import { SearchBox } from "./SearchBox";

export function Header({
  lang,
  menuItems,
  categories,
  taglineUr,
  taglineEn,
}: {
  lang: Lang;
  menuItems: MenuItem[];
  categories: PublicCategory[];
  taglineUr?: string;
  taglineEn?: string;
}) {
  const brand = brandName(lang);
  const newsWord = lang === "ur" ? "خبریں" : "NEWS";
  const tagline =
    lang === "ur"
      ? taglineUr || "آزاد، حقیقت پر مبنی صحافت"
      : taglineEn || "Independent reporting from the newsroom";

  return (
    <header className="site-header">
      <div className="flex items-center justify-between gap-3 bg-[var(--ink)] px-4 py-2 text-xs text-white/80 ui-sans">
        <span>{lang === "ur" ? "پاکستان اور دنیا سے تازہ خبریں" : "Pakistan & world news desk"}</span>
        <LanguageSwitcher lang={lang} />
      </div>

      <div className="border-b border-[var(--line)] bg-[rgba(255,252,246,0.88)] px-4 py-5 text-center">
        <Link href="/" className="brand-lockup inline-block text-[var(--ink)]">
          <span className="text-[var(--accent)]">{brand}</span>
        </Link>
        <p className="meta mx-auto mt-2 max-w-xl">{tagline}</p>
      </div>

      <div className="bg-[var(--accent)] text-white">
        <div className="mx-auto flex max-w-[var(--maxw)] items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-baseline gap-2">
            <span className="ui-sans text-xl font-black tracking-wide">{newsWord}</span>
            <span className="text-lg opacity-95">
              {pickText(lang, "دی پاکستان ٹائمز", "The Pakistan Times")}
            </span>
          </div>
          <div className="md:hidden">
            <SearchBox lang={lang} compact />
          </div>
        </div>
      </div>

      <Navigation lang={lang} items={menuItems} categories={categories} />
    </header>
  );
}
