import Link from "next/link";
import type { Lang } from "@/lib/language";
import { brandName } from "@/lib/language";
import { Newsletter } from "./Newsletter";

const LEGAL = [
  { href: "/about", ur: "ہمارے بارے میں", en: "About" },
  { href: "/contact", ur: "رابطہ", en: "Contact" },
  { href: "/privacy", ur: "پرائیویسی", en: "Privacy" },
  { href: "/terms", ur: "شرائط", en: "Terms" },
  { href: "/disclaimer", ur: "ڈس کلیمر", en: "Disclaimer" },
  { href: "/editorial-policy", ur: "ادارتی پالیسی", en: "Editorial policy" },
  { href: "/corrections", ur: "تصحیحات", en: "Corrections" },
];

export function Footer({ lang }: { lang: Lang }) {
  const brand = brandName(lang);
  return (
    <footer className="mt-auto bg-[var(--ink)] text-[#cfcfcf]">
      <div className="mx-auto grid max-w-[var(--maxw)] gap-8 px-4 py-10 md:grid-cols-[1.2fr_1fr]">
        <div>
          <p className="brand-lockup mb-3 text-2xl text-white">{brand}</p>
          <p className="max-w-md text-sm leading-relaxed text-[#aaa]">
            {lang === "ur"
              ? "دی پاکستان ٹائمز اردو — آزاد صحافت، قومی اور عالمی کوریج۔"
              : "The Pakistan Times — independent journalism covering Pakistan and the world."}
          </p>
          <div className="mt-6">
            <Newsletter lang={lang} />
          </div>
        </div>
        <div>
          <p className="ui-sans mb-3 text-sm font-bold uppercase tracking-wide text-white">
            {lang === "ur" ? "ادارہ" : "Organization"}
          </p>
          <ul className="ui-sans grid grid-cols-2 gap-2 text-sm">
            {LEGAL.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="hover:text-white">
                  {lang === "ur" ? item.ur : item.en}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 px-4 py-4 text-center text-xs text-[#888]">
        © {new Date().getFullYear()} {brand}
      </div>
    </footer>
  );
}
