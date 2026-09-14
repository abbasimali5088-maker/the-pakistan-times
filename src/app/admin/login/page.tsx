"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { adminFetch, AdminApiError } from "@/lib/admin-fetch";
import { FormField, TextInput } from "@/components/admin/FormField";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@thepakistantimes.local");
  const [password, setPassword] = useState("pak123");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await adminFetch("/api/auth", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      router.replace("/admin");
      router.refresh();
    } catch (err) {
      const msg =
        err instanceof AdminApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Login failed";
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-100 px-4">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse at top left, rgba(11,122,59,0.18), transparent 50%), radial-gradient(ellipse at bottom right, rgba(20,20,20,0.06), transparent 45%)",
        }}
      />
      <div className="relative w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <p className="font-urdu text-2xl font-semibold text-[#0B7A3B]" dir="rtl">
            دی پاکستان ٹائمز
          </p>
          <h1 className="mt-2 text-lg font-semibold text-slate-900">Admin sign in</h1>
          <p className="mt-1 text-sm text-slate-500">Editorial CMS access</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <FormField label="Email" hint="Default: admin@thepakistantimes.local">
            <TextInput
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </FormField>
          <FormField label="Password">
            <TextInput
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </FormField>

          {error ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-[#0B7A3B] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#096b33] disabled:opacity-60"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
