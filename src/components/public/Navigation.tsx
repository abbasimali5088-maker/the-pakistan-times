"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Lang } from "@/lib/language";
import { pickText } from "@/lib/language";
import type { MenuItem, PublicCategory } from "@/lib/public-types";
import { SearchBox } from "./SearchBox";

function normalizeMenuUrl(url: string, categories: PublicCategory[]) {
  if (!url || url === "/") return url || "/";
  if (
    url.startsWith("/category/") ||
    url.startsWith("http") ||
    url.startsWith("/live") ||
    url.startsWith("/videos") ||
    url.startsWith("/galleries") ||
    url.startsWith("/latest") ||
    url.startsWith("/breaking") ||
    url.startsWith("/search") ||
    url.startsWith("/about") ||
    url.startsWith("/contact") ||
    url.startsWith("/author") ||
    url.startsWith("/tag")
  ) {
    return url;
  }
  const slug = url.replace(/^\//, "").split("/")[0];
  if (categories.some((c) => c.slug === slug)) return `/category/${slug}`;
  return url;
}

export function Navigation({
  lang,
  items,
  categories,
}: {
  lang: Lang;
  items: MenuItem[];
  categories: PublicCategory[];
  pathname?: string;
}) {
  const pathname = usePathname() || "/";
  const links =
    items.length > 0
      ? items.map((item) => ({
          href: normalizeMenuUrl(item.url, categories),
          label: pickText(lang, item.labelUr, item.label, item.label),
        }))
      : [
          { href: "/", label: lang === "ur" ? "ہوم" : "Home" },
          { href: "/latest", label: lang === "ur" ? "تازہ ترین" : "Latest" },
          ...categories.slice(0, 8).map((c) => ({
            href: `/category/${c.slug}`,
            label: pickText(lang, c.nameUr || c.name, c.nameEn || c.name, c.name),
          })),
          { href: "/live", label: lang === "ur" ? "لائیو" : "Live" },
          { href: "/videos", label: lang === "ur" ? "ویڈیوز" : "Videos" },
        ];

  return (
    <nav className="bg-[var(--ink)]" aria-label={lang === "ur" ? "مرکزی مینو" : "Main"}>
      <div className="mx-auto flex max-w-[var(--maxw)] items-center gap-2 overflow-x-auto px-3">
        <ul className="flex min-w-0 flex-1 items-center">
          {links.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <li key={link.href + link.label}>
                <Link
                  href={link.href}
                  className="nav-link whitespace-nowrap"
                  aria-current={active ? "page" : undefined}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="hidden shrink-0 py-2 md:block">
          <SearchBox lang={lang} compact />
        </div>
      </div>
    </nav>
  );
}
