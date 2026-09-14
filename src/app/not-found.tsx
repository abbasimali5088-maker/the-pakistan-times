"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function NotFound() {
  useEffect(() => {
    const url = window.location.pathname + window.location.search;
    fetch("/api/notfound", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        referrer: document.referrer || undefined,
      }),
    }).catch(() => undefined);
  }, []);

  return (
    <div className="site-shell">
      <main className="site-main flex flex-col items-center justify-center py-24 text-center">
        <p className="ui-sans mb-2 text-sm font-bold uppercase tracking-[0.2em] text-[var(--accent)]">
          404
        </p>
        <h1 className="mb-3 text-3xl sm:text-4xl">صفحہ نہیں ملا / Page not found</h1>
        <p className="meta mb-8 max-w-md">
          جو لنک آپ نے کھولا ہے وہ دستیاب نہیں یا منتقل ہو چکا ہے۔
        </p>
        <Link href="/" className="btn">
          واپس ہوم / Back home
        </Link>
      </main>
    </div>
  );
}
