import Link from "next/link";
import type { Lang } from "@/lib/language";
import { brandName } from "@/lib/language";
import {
  SOCIAL_LABELS,
  SOCIAL_LINK_KEYS,
  type SocialKey,
} from "@/lib/site-settings";
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

export type FooterSiteSettings = {
  aboutUr?: string;
  aboutEn?: string;
  copyrightUr?: string;
  copyrightEn?: string;
  contactEmail?: string;
  contactPhone?: string;
  social?: Partial<Record<SocialKey, string>>;
};

export function Footer({
  lang,
  site,
}: {
  lang: Lang;
  site?: FooterSiteSettings;
}) {
  const brand = brandName(lang);
  const about =
    lang === "ur"
      ? site?.aboutUr || "دی پاکستان ٹائمز اردو — آزاد صحافت، قومی اور عالمی کوریج۔"
      : site?.aboutEn ||
        "The Pakistan Times — independent journalism covering Pakistan and the world.";
  const copyright =
    lang === "ur"
      ? site?.copyrightUr || `© ${new Date().getFullYear()} ${brand}`
      : site?.copyrightEn || `© ${new Date().getFullYear()} ${brand}`;

  const socialLinks = SOCIAL_LINK_KEYS.map((key) => {
    const href = site?.social?.[key]?.trim();
    if (!href) return null;
    return { key, href, label: lang === "ur" ? SOCIAL_LABELS[key].ur : SOCIAL_LABELS[key].en };
  }).filter(Boolean) as Array<{ key: SocialKey; href: string; label: string }>;

  return (
    <footer className="mt-auto bg-[var(--ink)] text-[#cfcfcf]">
      <div className="mx-auto grid max-w-[var(--maxw)] gap-8 px-4 py-10 md:grid-cols-[1.2fr_1fr]">
        <div>
          <p className="brand-lockup mb-3 text-2xl text-white">{brand}</p>
          <p className="max-w-md text-sm leading-relaxed text-[#aaa]">{about}</p>
          {site?.contactEmail || site?.contactPhone ? (
            <p className="meta mt-3 text-[#999]">
              {site.contactEmail ? (
                <a className="hover:text-white" href={`mailto:${site.contactEmail}`}>
                  {site.contactEmail}
                </a>
              ) : null}
              {site.contactEmail && site.contactPhone ? " · " : null}
              {site.contactPhone ? (
                <a className="hover:text-white" href={`tel:${site.contactPhone.replace(/\s+/g, "")}`}>
                  {site.contactPhone}
                </a>
              ) : null}
            </p>
          ) : null}
          {socialLinks.length > 0 ? (
            <ul className="ui-sans mt-5 flex flex-wrap gap-2">
              {socialLinks.map((item) => (
                <li key={item.key}>
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex rounded-md border border-white/15 px-3 py-1.5 text-xs font-medium text-white/90 transition hover:border-white/40 hover:bg-white/10 hover:text-white"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
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
        {copyright}
      </div>
    </footer>
  );
}
