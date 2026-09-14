"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { Lang } from "@/lib/language";

export function SearchBox({
  lang,
  compact = false,
  initialQuery = "",
}: {
  lang: Lang;
  compact?: boolean;
  initialQuery?: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState(initialQuery);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const query = q.trim();
    if (!query) return;
    router.push(`/search?q=${encodeURIComponent(query)}`);
  }

  return (
    <form onSubmit={onSubmit} className="search-box relative" role="search">
      <label className="sr-only" htmlFor={compact ? "nav-search" : "page-search"}>
        {lang === "ur" ? "تلاش" : "Search"}
      </label>
      <input
        id={compact ? "nav-search" : "page-search"}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={lang === "ur" ? "تلاش کریں…" : "Search news…"}
        className={
          compact
            ? "w-[9.5rem] border-0 bg-white px-3 py-1.5 text-sm text-[var(--ink)] outline-none sm:w-40"
            : "w-full border border-[var(--line)] bg-white/90 px-4 py-3 text-base outline-none focus:border-[var(--accent)]"
        }
      />
      {!compact && (
        <button type="submit" className="btn mt-3 w-full sm:mt-0 sm:absolute sm:inset-y-1 sm:end-1 sm:w-auto">
          {lang === "ur" ? "تلاش" : "Search"}
        </button>
      )}
    </form>
  );
}
