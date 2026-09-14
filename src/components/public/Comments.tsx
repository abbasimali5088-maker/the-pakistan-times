"use client";

import { FormEvent, useState } from "react";
import type { Lang } from "@/lib/language";

export function Comments({
  articleId,
  lang,
}: {
  articleId: string;
  lang: Lang;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "err">("idle");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleId, authorName: name, authorEmail: email, body }),
      });
      const json = await res.json();
      if (!res.ok || json.success === false) throw new Error("fail");
      setName("");
      setEmail("");
      setBody("");
      setStatus("ok");
    } catch {
      setStatus("err");
    }
  }

  return (
    <section className="mt-10 border-t border-[var(--line)] pt-8">
      <h2 className="section-title">
        {lang === "ur" ? "تبصرے" : "Comments"}
      </h2>
      <p className="meta mb-4">
        {lang === "ur"
          ? "آپ کا تبصرہ اشاعت سے پہلے جائزہ لیا جائے گا۔"
          : "Comments are reviewed before publication."}
      </p>
      <form onSubmit={onSubmit} className="grid gap-3">
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={lang === "ur" ? "نام" : "Name"}
          className="border border-[var(--line)] bg-white/80 px-3 py-2"
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={lang === "ur" ? "ای میل (اختیاری)" : "Email (optional)"}
          className="border border-[var(--line)] bg-white/80 px-3 py-2"
        />
        <textarea
          required
          rows={4}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={lang === "ur" ? "اپنا تبصرہ لکھیں…" : "Write your comment…"}
          className="border border-[var(--line)] bg-white/80 px-3 py-2"
        />
        <button type="submit" className="btn w-fit" disabled={status === "loading"}>
          {status === "loading"
            ? lang === "ur"
              ? "ارسال ہو رہا ہے…"
              : "Sending…"
            : lang === "ur"
              ? "تبصرہ بھیجیں"
              : "Post comment"}
        </button>
        {status === "ok" ? (
          <p className="text-sm text-[var(--accent)]">
            {lang === "ur" ? "شکریہ، تبصرہ موصول ہو گیا۔" : "Thanks — your comment was received."}
          </p>
        ) : null}
        {status === "err" ? (
          <p className="text-sm text-[var(--danger)]">
            {lang === "ur" ? "تبصرہ بھیجنے میں مسئلہ ہوا۔" : "Could not submit comment."}
          </p>
        ) : null}
      </form>
    </section>
  );
}
