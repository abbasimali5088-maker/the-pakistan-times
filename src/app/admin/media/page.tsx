"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { AdminPageHeader, AdminPanel } from "@/components/admin/AdminShell";
import { DataTable } from "@/components/admin/DataTable";
import { FormField, TextInput } from "@/components/admin/FormField";
import { adminFetch, AdminApiError } from "@/lib/admin-fetch";
import { formatDate } from "@/lib/utils";

type MediaItem = {
  id: string;
  url: string;
  alt?: string | null;
  caption?: string | null;
  mimeType?: string | null;
  createdAt?: string;
};

export default function MediaPage() {
  const [rows, setRows] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [alt, setAlt] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminFetch<{ items?: MediaItem[] } | MediaItem[]>("/api/media", {
        allowNotFound: true,
      });
      if (!data) {
        setRows([]);
        setError("Media API not available yet.");
      } else {
        setRows(Array.isArray(data) ? data : data.items || []);
      }
    } catch (err) {
      setRows([]);
      setError(err instanceof AdminApiError ? err.message : "Failed to load media");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await adminFetch("/api/media", {
        method: "POST",
        body: JSON.stringify({ url, alt: alt || null }),
      });
      setUrl("");
      setAlt("");
      await load();
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : "Failed to add media");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <AdminPageHeader title="Media" description="Library of images and assets." />

      <AdminPanel title="Add by URL" className="mb-4">
        <form onSubmit={onAdd} className="grid gap-3 md:grid-cols-2">
          <FormField label="URL" className="md:col-span-2">
            <TextInput
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://…"
            />
          </FormField>
          <FormField label="Alt text">
            <TextInput value={alt} onChange={(e) => setAlt(e.target.value)} />
          </FormField>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={busy}
              className="rounded-md bg-[#0B7A3B] px-4 py-2 text-sm font-medium text-white hover:bg-[#096b33] disabled:opacity-60"
            >
              {busy ? "Adding…" : "Add media"}
            </button>
          </div>
        </form>
      </AdminPanel>

      <DataTable
        loading={loading}
        error={error}
        rows={rows}
        rowKey={(r) => r.id}
        empty="No media items."
        columns={[
          {
            key: "preview",
            header: "Preview",
            render: (r) =>
              r.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.url} alt={r.alt || ""} className="h-12 w-16 rounded object-cover" />
              ) : (
                "—"
              ),
          },
          {
            key: "url",
            header: "URL",
            render: (r) => (
              <a href={r.url} target="_blank" rel="noreferrer" className="text-[#0B7A3B] hover:underline">
                {r.url}
              </a>
            ),
          },
          { key: "alt", header: "Alt", render: (r) => r.alt || "—" },
          {
            key: "created",
            header: "Added",
            render: (r) => formatDate(r.createdAt) || "—",
          },
        ]}
      />
    </div>
  );
}
