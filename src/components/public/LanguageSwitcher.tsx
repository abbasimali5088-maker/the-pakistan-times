"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { Lang } from "@/lib/language";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({ lang }: { lang: Lang }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function setLang(next: Lang) {
    document.cookie = `lang=${next};path=/;max-age=31536000;samesite=lax`;
    const url = new URL(window.location.href);
    url.searchParams.set("lang", next);
    startTransition(() => {
      router.replace(url.pathname + url.search);
      router.refresh();
    });
  }

  return (
    <div className="lang-switch ui-sans inline-flex gap-1" role="group" aria-label="Language">
      <button
        type="button"
        className={cn(
          "border px-2.5 py-1 text-xs font-bold transition",
          lang === "ur"
            ? "border-[var(--accent)] bg-[var(--accent)] text-white"
            : "border-white/40 bg-transparent text-white hover:border-white",
        )}
        aria-pressed={lang === "ur"}
        disabled={pending}
        onClick={() => setLang("ur")}
      >
        اردو
      </button>
      <button
        type="button"
        className={cn(
          "border px-2.5 py-1 text-xs font-bold transition",
          lang === "en"
            ? "border-[var(--accent)] bg-[var(--accent)] text-white"
            : "border-white/40 bg-transparent text-white hover:border-white",
        )}
        aria-pressed={lang === "en"}
        disabled={pending}
        onClick={() => setLang("en")}
      >
        EN
      </button>
    </div>
  );
}
