"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { AdminPageHeader, AdminPanel } from "@/components/admin/AdminShell";
import { FormField, TextInput, TextTextarea } from "@/components/admin/FormField";
import { adminFetch, AdminApiError } from "@/lib/admin-fetch";
import {
  SETTING_GROUPS,
  defaultSettingsMap,
  emptySettingsMap,
  normalizeSettingsMap,
  type SettingsMap,
} from "@/lib/site-settings";

export default function SettingsPage() {
  const [values, setValues] = useState<SettingsMap>(emptySettingsMap());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [activeTab, setActiveTab] = useState(SETTING_GROUPS[0]?.key || "general");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminFetch<{
        settings?: SettingsMap;
        items?: Array<{ group: string; key: string; value: string }>;
      }>("/api/settings");

      if (data?.settings) {
        setValues(normalizeSettingsMap({ ...defaultSettingsMap(), ...data.settings }));
      } else if (data?.items) {
        const map: SettingsMap = {};
        for (const row of data.items) {
          map[row.group] ||= {};
          map[row.group][row.key] = row.value;
        }
        setValues(normalizeSettingsMap({ ...defaultSettingsMap(), ...map }));
      } else {
        setValues(defaultSettingsMap());
      }
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : "Failed to load settings");
      setValues(defaultSettingsMap());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function get(group: string, key: string) {
    return values[group]?.[key] ?? "";
  }

  function set(group: string, key: string, value: string) {
    setValues((prev) => ({
      ...prev,
      [group]: { ...(prev[group] || {}), [key]: value },
    }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      await adminFetch("/api/settings", {
        method: "PUT",
        body: JSON.stringify({ settings: values }),
      });
      setNotice("Settings saved — social links and site details will show on the public website.");
      await load();
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="text-sm text-slate-500">Loading settings…</p>;

  const activeGroup = SETTING_GROUPS.find((g) => g.key === activeTab) || SETTING_GROUPS[0];

  return (
    <div>
      <AdminPageHeader
        title="Settings"
        description="سائٹ کا نام، سوشل لنکس (Facebook, WhatsApp, X, Instagram…)، تھیم، SEO اور فوٹر — سب یہاں سے بغیر کوڈنگ کے سیٹ کریں۔"
      />

      {error ? (
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {notice}
        </div>
      ) : null}

      <div className="mb-4 flex flex-wrap gap-2">
        {SETTING_GROUPS.map((g) => (
          <button
            key={g.key}
            type="button"
            onClick={() => setActiveTab(g.key)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              activeTab === g.key
                ? "bg-[#0B7A3B] text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {g.title}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        {activeGroup ? (
          <AdminPanel
            title={activeGroup.title}
            description={
              activeGroup.description
                ? `${activeGroup.titleUr} — ${activeGroup.description}`
                : activeGroup.titleUr
            }
          >
            <div className="grid gap-3 md:grid-cols-2">
              {activeGroup.fields.map((f) => {
                const inputType =
                  f.type === "email" || f.type === "url" || f.type === "tel" || f.type === "color"
                    ? f.type === "color"
                      ? "text"
                      : f.type
                    : "text";
                return (
                  <FormField
                    key={f.key}
                    label={f.labelUr ? `${f.label} / ${f.labelUr}` : f.label}
                    hint={f.hint}
                    urdu={f.urdu}
                    className={f.type === "textarea" ? "md:col-span-2" : undefined}
                  >
                    {f.type === "textarea" ? (
                      <TextTextarea
                        urdu={f.urdu}
                        value={get(activeGroup.key, f.key)}
                        placeholder={f.placeholder}
                        onChange={(e) => set(activeGroup.key, f.key, e.target.value)}
                      />
                    ) : (
                      <div className="flex gap-2">
                        {f.type === "color" ? (
                          <input
                            type="color"
                            aria-label={f.label}
                            value={/^#[0-9A-Fa-f]{6}$/.test(get(activeGroup.key, f.key))
                              ? get(activeGroup.key, f.key)
                              : "#0B7A3B"}
                            onChange={(e) => set(activeGroup.key, f.key, e.target.value)}
                            className="h-10 w-12 cursor-pointer rounded border border-slate-300 bg-white p-1"
                          />
                        ) : null}
                        <TextInput
                          type={inputType}
                          urdu={f.urdu}
                          value={get(activeGroup.key, f.key)}
                          placeholder={f.placeholder}
                          onChange={(e) => set(activeGroup.key, f.key, e.target.value)}
                          className="flex-1"
                        />
                      </div>
                    )}
                  </FormField>
                );
              })}
            </div>
          </AdminPanel>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-[#0B7A3B] px-4 py-2 text-sm font-medium text-white hover:bg-[#096b33] disabled:opacity-60"
          >
            {busy ? "Saving…" : "Save all settings"}
          </button>
          <p className="text-xs text-slate-500">
            Save ایک بار دبائیں — تمام ٹیبز (Social سمیت) ایک ساتھ محفوظ ہو جاتے ہیں۔
          </p>
        </div>
      </form>
    </div>
  );
}
