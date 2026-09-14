"use client";

import type { Lang } from "@/lib/language";

export function ShareButtons({
  lang,
  title,
  url,
}: {
  lang: Lang;
  title: string;
  url: string;
}) {
  const encoded = encodeURIComponent(url);
  const text = encodeURIComponent(title);

  const links = [
    {
      label: "X",
      href: `https://twitter.com/intent/tweet?url=${encoded}&text=${text}`,
    },
    {
      label: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encoded}`,
    },
    {
      label: "WhatsApp",
      href: `https://api.whatsapp.com/send?text=${text}%20${encoded}`,
    },
  ];

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="ui-sans flex flex-wrap items-center gap-2">
      <span className="text-sm font-bold text-[var(--muted)]">
        {lang === "ur" ? "شیئر کریں" : "Share"}
      </span>
      {links.map((link) => (
        <a
          key={link.label}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-ghost btn px-3 py-1.5 text-sm"
        >
          {link.label}
        </a>
      ))}
      <button type="button" onClick={copy} className="btn-ghost btn px-3 py-1.5 text-sm">
        {lang === "ur" ? "کاپی لنک" : "Copy link"}
      </button>
    </div>
  );
}
