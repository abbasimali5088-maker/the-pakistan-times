"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminShell";
import { DataTable } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { adminFetch, AdminApiError } from "@/lib/admin-fetch";
import { formatDate } from "@/lib/utils";

type Job = {
  id: string;
  type: string;
  status: string;
  runAt?: string;
  attempts?: number;
  lastError?: string | null;
  createdAt?: string;
};

export default function JobsPage() {
  const [rows, setRows] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminFetch<{ items?: Job[] } | Job[]>("/api/jobs", {
        allowNotFound: true,
      });
      if (!data) {
        setRows([]);
        setError("Jobs API not available yet.");
      } else {
        setRows(Array.isArray(data) ? data : data.items || []);
      }
    } catch (err) {
      setRows([]);
      setError(err instanceof AdminApiError ? err.message : "Failed to load jobs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <AdminPageHeader title="Jobs" description="Background job queue." />
      <DataTable
        loading={loading}
        error={error}
        rows={rows}
        rowKey={(r) => r.id}
        empty="No jobs in queue."
        columns={[
          { key: "type", header: "Type", render: (r) => r.type },
          { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
          {
            key: "runAt",
            header: "Run at",
            render: (r) => formatDate(r.runAt) || "—",
          },
          { key: "attempts", header: "Attempts", render: (r) => r.attempts ?? 0 },
          {
            key: "error",
            header: "Last error",
            render: (r) => r.lastError || "—",
          },
        ]}
      />
    </div>
  );
}
