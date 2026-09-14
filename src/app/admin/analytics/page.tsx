"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminShell";
import { StatCard } from "@/components/admin/StatCard";
import { DataTable } from "@/components/admin/DataTable";
import { adminFetch, AdminApiError } from "@/lib/admin-fetch";
import { formatDate } from "@/lib/utils";

type AnalyticsPayload = {
  totals?: Record<string, number | string>;
  stats?: Record<string, number | string>;
  events?: Array<{
    id: string;
    eventType: string;
    path?: string | null;
    articleId?: string | null;
    createdAt?: string;
  }>;
  items?: Array<{
    id: string;
    eventType: string;
    path?: string | null;
    articleId?: string | null;
    createdAt?: string;
  }>;
};

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsPayload>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch<AnalyticsPayload>("/api/analytics", { allowNotFound: true });
      if (!res) {
        setError("Analytics API not available yet.");
        setData({});
      } else {
        setData(res);
      }
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : "Failed to load analytics");
      setData({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = { ...(data.totals || {}), ...(data.stats || {}) };
  const events = data.events || data.items || [];

  return (
    <div>
      <AdminPageHeader title="Analytics" description="Traffic and engagement signals." />
      {error ? (
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {error}
        </div>
      ) : null}

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Object.keys(stats).length
          ? Object.entries(stats).map(([k, v]) => (
              <StatCard key={k} label={k.replace(/_/g, " ")} value={v} />
            ))
          : ["Page views", "Article views", "Sessions", "Referrers"].map((l) => (
              <StatCard key={l} label={l} value={loading ? "…" : "—"} />
            ))}
      </div>

      <DataTable
        loading={loading}
        rows={events}
        rowKey={(r) => r.id}
        empty="No analytics events."
        columns={[
          { key: "type", header: "Event", render: (r) => r.eventType },
          { key: "path", header: "Path", render: (r) => r.path || "—" },
          {
            key: "article",
            header: "Article",
            render: (r) => r.articleId || "—",
          },
          {
            key: "when",
            header: "When",
            render: (r) => formatDate(r.createdAt) || "—",
          },
        ]}
      />
    </div>
  );
}
