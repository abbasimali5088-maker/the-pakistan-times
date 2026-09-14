"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="site-shell">
      <main className="site-main flex flex-col items-center justify-center py-24 text-center">
        <p className="ui-sans mb-2 text-sm font-bold uppercase tracking-[0.2em] text-[var(--danger)]">
          Error
        </p>
        <h1 className="mb-3 text-3xl">کچھ غلط ہو گیا / Something went wrong</h1>
        <p className="meta mb-8 max-w-md">
          عارضی مسئلہ پیش آیا۔ دوبارہ کوشش کریں۔
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <button type="button" className="btn" onClick={reset}>
            دوبارہ کوشش / Try again
          </button>
          <Link href="/" className="btn btn-ghost">
            ہوم / Home
          </Link>
        </div>
      </main>
    </div>
  );
}
