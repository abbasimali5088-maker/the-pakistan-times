"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { AdminPageHeader, AdminPanel } from "@/components/admin/AdminShell";
import { FormField, TextInput } from "@/components/admin/FormField";
import { adminFetch, AdminApiError } from "@/lib/admin-fetch";
import {
  RATE_FIELDS,
  defaultRatesMap,
  emptyRatesMap,
  normalizeRatesMap,
  type RatesMap,
} from "@/lib/market-rates";

export default function RatesPage() {
  const [values, setValues] = useState<RatesMap>(emptyRatesMap());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminFetch<{ rates?: RatesMap }>("/api/rates");
      setValues(normalizeRatesMap({ ...defaultRatesMap(), ...(data.rates || {}) }));
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : "Failed to load rates");
      setValues(defaultRatesMap());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function set(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      await adminFetch("/api/rates", {
        method: "PUT",
        body: JSON.stringify({ rates: values }),
      });
      setNotice("Rates saved — gold, petrol and forex will show on the public website.");
      await load();
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="text-sm text-slate-500">Loading rates…</p>;

  return (
    <div>
      <AdminPageHeader
        title="Market rates"
        description="سونا، پیٹرول، ڈیزل اور کرنسی ریٹس — بغیر کسی بیرونی API key کے یہاں سے سیٹ کریں۔ Public API: GET /api/rates?public=1"
      />

      {error ? (
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {notice}
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="space-y-6">
        <AdminPanel title="Gold & silver (PKR / tola)">
          <div className="grid gap-4 sm:grid-cols-2">
            {RATE_FIELDS.filter((f) =>
              ["gold24k", "gold22k", "gold21k", "silver"].includes(f.key),
            ).map((f) => (
              <FormField key={f.key} label={`${f.label} / ${f.labelUr}`}>
                <TextInput
                  id={f.key}
                  value={values[f.key] || ""}
                  placeholder={f.placeholder}
                  onChange={(e) => set(f.key, e.target.value)}
                />
              </FormField>
            ))}
          </div>
        </AdminPanel>

        <AdminPanel title="Fuel (PKR / litre)">
          <div className="grid gap-4 sm:grid-cols-2">
            {RATE_FIELDS.filter((f) =>
              ["petrol", "hiOctane", "diesel"].includes(f.key),
            ).map((f) => (
              <FormField key={f.key} label={`${f.label} / ${f.labelUr}`}>
                <TextInput
                  id={f.key}
                  value={values[f.key] || ""}
                  placeholder={f.placeholder}
                  onChange={(e) => set(f.key, e.target.value)}
                />
              </FormField>
            ))}
          </div>
        </AdminPanel>

        <AdminPanel title="Currency (PKR)">
          <div className="grid gap-4 sm:grid-cols-2">
            {RATE_FIELDS.filter((f) =>
              ["usd", "eur", "gbp", "sar", "aed"].includes(f.key),
            ).map((f) => (
              <FormField key={f.key} label={`${f.label} / ${f.labelUr}`}>
                <TextInput
                  id={f.key}
                  value={values[f.key] || ""}
                  placeholder={f.placeholder}
                  onChange={(e) => set(f.key, e.target.value)}
                />
              </FormField>
            ))}
          </div>
        </AdminPanel>

        <AdminPanel title="Labels">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Updated label (English)">
              <TextInput
                id="updatedLabel"
                value={values.updatedLabel || ""}
                onChange={(e) => set("updatedLabel", e.target.value)}
              />
            </FormField>
            <FormField label="Updated label (Urdu)">
              <TextInput
                id="updatedLabelUr"
                value={values.updatedLabelUr || ""}
                onChange={(e) => set("updatedLabelUr", e.target.value)}
              />
            </FormField>
            <FormField label="Source note">
              <TextInput
                id="sourceNote"
                value={values.sourceNote || ""}
                onChange={(e) => set("sourceNote", e.target.value)}
              />
            </FormField>
          </div>
        </AdminPanel>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {busy ? "Saving…" : "Save rates"}
          </button>
          <p className="text-xs text-slate-500">
            API: <code className="rounded bg-slate-100 px-1">GET /api/rates?public=1</code>
          </p>
        </div>
      </form>
    </div>
  );
}
