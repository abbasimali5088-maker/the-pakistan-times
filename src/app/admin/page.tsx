"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminPageHeader, AdminPanel } from "@/components/admin/AdminShell";
import { StatCard } from "@/components/admin/StatCard";
import { DataTable } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { adminFetch, AdminApiError } from "@/lib/admin-fetch";
import { formatDate } from "@/lib/utils";

type DashboardData = {
  stats?: Record<string, number | string>;
  counts?: Record<string, number | string>;
  recentActivity?: Array<{
    id: string;
    action: string;
    module: string;
    recordId?: string | null;
    createdAt: string;
    user?: { name?: string; email?: string } | null;
  }>;
  audit?: Array<{
    id: string;
    action: string;
    module: string;
    recordId?: string | null;
    createdAt: string;
    user?: { name?: string; email?: string } | null;
  }>;
};

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await adminFetch<DashboardData>("/api/dashboard", { allowNotFound: true });
        if (cancelled) return;
        if (!res) {
          setError("Dashboard API not available yet.");
          setData({});
        } else {
          setData(res);
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof AdminApiError ? err.message : "Failed to load dashboard");
        setData({});
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = { ...(data?.counts || {}), ...(data?.stats || {}) };
  const statEntries = Object.entries(stats);
  const activity = data?.recentActivity || data?.audit || [];

  return (
    <div>
      <AdminPageHeader
        title="Dashboard"
        description="Overview of editorial activity and content health."
        actions={
          <Link
            href="/admin/articles/new"
            className="rounded-md bg-[#0B7A3B] px-3 py-2 text-sm font-medium text-white hover:bg-[#096b33]"
          >
            New article
          </Link>
        }
      />

      {loading ? (
        <p className="text-sm text-slate-500">Loading dashboard…</p>
      ) : (
        <>
          {error ? (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {error}
            </div>
          ) : null}

          <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {statEntries.length ? (
              statEntries.map(([key, value]) => (
                <StatCard key={key} label={key.replace(/_/g, " ")} value={value} />
              ))
            ) : (
              <>
                <StatCard label="Articles" value="—" hint="Waiting for API" />
                <StatCard label="Published" value="—" />
                <StatCard label="Comments" value="—" />
                <StatCard label="Users" value="—" />
              </>
            )}
          </div>

          <AdminPanel title="Recent activity">
            <DataTable
              rows={activity}
              rowKey={(r) => r.id}
              empty="No recent audit activity."
              columns={[
                {
                  key: "when",
                  header: "When",
                  render: (r) => formatDate(r.createdAt) || "—",
                },
                {
                  key: "action",
                  header: "Action",
                  render: (r) => <StatusBadge status={r.action} />,
                },
                {
                  key: "module",
                  header: "Module",
                  render: (r) => r.module,
                },
                {
                  key: "user",
                  header: "User",
                  render: (r) => r.user?.name || r.user?.email || "—",
                },
                {
                  key: "record",
                  header: "Record",
                  render: (r) => (
                    <span className="font-mono text-xs text-slate-500">{r.recordId || "—"}</span>
                  ),
                },
              ]}
            />
          </AdminPanel>
        </>
      )}
    </div>
  );
}
