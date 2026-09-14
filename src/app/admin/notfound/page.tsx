"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminShell";
import { DataTable } from "@/components/admin/DataTable";
import { adminFetch, AdminApiError } from "@/lib/admin-fetch";
import { formatDate } from "@/lib/utils";

type Hit = {
  id: string;
  url: string;
  hits: number;
  referrer?: string | null;
  lastSeen?: string;
  firstSeen?: string;
};

export default function NotFoundPage() {
  const [rows, setRows] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminFetch<{ items?: Hit[] } | Hit[]>("/api/notfound", {
        allowNotFound: true,
      });
      if (!data) {
        setRows([]);
        setError("404 monitor API not available yet.");
      } else {
        setRows(Array.isArray(data) ? data : data.items || []);
      }
    } catch (err) {
      setRows([]);
      setError(err instanceof AdminApiError ? err.message : "Failed to load 404 hits");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <AdminPageHeader title="404 monitor" description="Tracked missing URLs." />
      <DataTable
        loading={loading}
        error={error}
        rows={rows}
        rowKey={(r) => r.id}
        empty="No 404 hits recorded."
        columns={[
          { key: "url", header: "URL", render: (r) => r.url },
          { key: "hits", header: "Hits", render: (r) => r.hits },
          { key: "referrer", header: "Referrer", render: (r) => r.referrer || "—" },
          {
            key: "last",
            header: "Last seen",
            render: (r) => formatDate(r.lastSeen) || "—",
          },
        ]}
      />
    </div>
  );
}
