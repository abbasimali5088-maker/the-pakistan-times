"use client";

import { FormEvent, useState } from "react";
import type { Lang } from "@/lib/language";

export function Newsletter({ lang }: { lang: Lang }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "err">("idle");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!res.ok || json.success === false) throw new Error("fail");
      setEmail("");
      setStatus("ok");
    } catch {
      setStatus("err");
    }
  }

  return (
    <section className="border border-[var(--line)] bg-[var(--accent-soft)] p-5">
      <h2 className="mb-1 text-xl font-bold">
        {lang === "ur" ? "نیوز لیٹر" : "Newsletter"}
      </h2>
      <p className="meta mb-4">
        {lang === "ur"
          ? "اہم خبریں براہ راست اپنے ان باکس میں حاصل کریں۔"
          : "Get the day’s essential briefings in your inbox."}
      </p>
      <form onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={lang === "ur" ? "ای میل ایڈریس" : "Email address"}
          className="flex-1 border border-[var(--line)] bg-white px-3 py-2"
        />
        <button type="submit" className="btn" disabled={status === "loading"}>
          {lang === "ur" ? "شامل ہوں" : "Subscribe"}
        </button>
      </form>
      {status === "ok" ? (
        <p className="mt-2 text-sm text-[var(--accent-deep)]">
          {lang === "ur" ? "سبسکرپشن کامیاب۔" : "You are subscribed."}
        </p>
      ) : null}
      {status === "err" ? (
        <p className="mt-2 text-sm text-[var(--danger)]">
          {lang === "ur" ? "سبسکرپشن نہیں ہو سکی۔" : "Subscription failed."}
        </p>
      ) : null}
    </section>
  );
}
