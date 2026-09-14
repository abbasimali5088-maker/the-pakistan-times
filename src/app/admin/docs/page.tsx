"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminPageHeader, AdminPanel } from "@/components/admin/AdminShell";
import { adminFetch, AdminApiError } from "@/lib/admin-fetch";

export default function DocsPage() {
  const [docs, setDocs] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminFetch<unknown>("/api/docs", { allowNotFound: true });
      if (data == null) {
        setError("Docs API not available yet.");
        setDocs(null);
      } else {
        setDocs(data);
      }
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : "Failed to load API docs");
      setDocs(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <AdminPageHeader
        title="API Docs"
        description="OpenAPI / endpoint reference from /api/docs."
      />
      {loading ? <p className="text-sm text-slate-500">Loading…</p> : null}
      {error ? (
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {error}
        </div>
      ) : null}
      {docs != null ? (
        <AdminPanel>
          <pre className="max-h-[70vh] overflow-auto rounded-md bg-slate-950 p-4 text-xs leading-relaxed text-slate-100">
            {typeof docs === "string" ? docs : JSON.stringify(docs, null, 2)}
          </pre>
        </AdminPanel>
      ) : null}
    </div>
  );
}
