"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { AdminPageHeader, AdminPanel } from "@/components/admin/AdminShell";
import { FormField, TextInput, TextTextarea } from "@/components/admin/FormField";
import { adminFetch, AdminApiError } from "@/lib/admin-fetch";

type SettingsMap = Record<string, Record<string, string>>;

const GROUPS: Array<{
  key: string;
  title: string;
  fields: Array<{ key: string; label: string; type?: "text" | "textarea"; urdu?: boolean }>;
}> = [
  {
    key: "general",
    title: "General",
    fields: [
      { key: "siteNameEn", label: "Site name (EN)" },
      { key: "siteNameUr", label: "سائٹ کا نام (اردو)", urdu: true },
      { key: "tagline", label: "Tagline" },
      { key: "contactEmail", label: "Contact email" },
    ],
  },
  {
    key: "theme",
    title: "Theme",
    fields: [
      { key: "accentColor", label: "Accent color" },
      { key: "logoUrl", label: "Logo URL" },
      { key: "fontFamily", label: "Font family" },
      { key: "customCss", label: "Custom CSS", type: "textarea" },
    ],
  },
  {
    key: "seo",
    title: "SEO defaults",
    fields: [
      { key: "defaultTitle", label: "Default title" },
      { key: "defaultDescription", label: "Default description", type: "textarea" },
      { key: "ogImage", label: "Default OG image" },
    ],
  },
  {
    key: "social",
    title: "Social",
    fields: [
      { key: "facebook", label: "Facebook URL" },
      { key: "twitter", label: "Twitter / X URL" },
      { key: "youtube", label: "YouTube URL" },
      { key: "instagram", label: "Instagram URL" },
    ],
  },
];

export default function SettingsPage() {
  const [values, setValues] = useState<SettingsMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminFetch<
        SettingsMap | { settings: SettingsMap | Record<string, string> } | { items: Array<{ group: string; key: string; value: string }> }
      >("/api/settings", { allowNotFound: true });
      if (!data) {
        setError("Settings API not available yet.");
        setValues({
          general: {},
          theme: { accentColor: "#0B7A3B" },
          seo: {},
          social: {},
        });
      } else if ("settings" in data && data.settings && typeof data.settings === "object") {
        const raw = data.settings as SettingsMap | Record<string, string>;
        const first = Object.values(raw)[0];
        if (first && typeof first === "object") {
          setValues(raw as SettingsMap);
        } else {
          setValues({ general: raw as Record<string, string> });
        }
      } else if ("items" in data && Array.isArray(data.items)) {
        const map: SettingsMap = {};
        for (const row of data.items) {
          map[row.group] ||= {};
          map[row.group][row.key] = row.value;
        }
        setValues(map);
      } else {
        setValues(data as SettingsMap);
      }
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : "Failed to load settings");
      setValues({ general: {}, theme: {}, seo: {}, social: {} });
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
      setNotice("Settings saved.");
    } catch (err) {
      // try PATCH as alternate
      try {
        await adminFetch("/api/settings", {
          method: "PATCH",
          body: JSON.stringify({ settings: values }),
        });
        setNotice("Settings saved.");
      } catch (err2) {
        setError(
          err2 instanceof AdminApiError
            ? err2.message
            : err instanceof AdminApiError
              ? err.message
              : "Save failed",
        );
      }
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="text-sm text-slate-500">Loading settings…</p>;

  return (
    <div>
      <AdminPageHeader title="Settings" description="General, theme, SEO, and social configuration." />

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

      <form onSubmit={onSubmit} className="space-y-4">
        {GROUPS.map((group) => (
          <AdminPanel key={group.key} title={group.title}>
            <div className="grid gap-3 md:grid-cols-2">
              {group.fields.map((f) => (
                <FormField
                  key={f.key}
                  label={f.label}
                  urdu={f.urdu}
                  className={f.type === "textarea" ? "md:col-span-2" : undefined}
                >
                  {f.type === "textarea" ? (
                    <TextTextarea
                      urdu={f.urdu}
                      value={get(group.key, f.key)}
                      onChange={(e) => set(group.key, f.key, e.target.value)}
                    />
                  ) : (
                    <TextInput
                      urdu={f.urdu}
                      value={get(group.key, f.key)}
                      onChange={(e) => set(group.key, f.key, e.target.value)}
                    />
                  )}
                </FormField>
              ))}
            </div>
          </AdminPanel>
        ))}
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-[#0B7A3B] px-4 py-2 text-sm font-medium text-white hover:bg-[#096b33] disabled:opacity-60"
        >
          {busy ? "Saving…" : "Save settings"}
        </button>
      </form>
    </div>
  );
}
