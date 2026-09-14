"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminShell";
import { DataTable } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { adminFetch, AdminApiError } from "@/lib/admin-fetch";
import { formatDate } from "@/lib/utils";

type AuditRow = {
  id: string;
  action: string;
  module: string;
  recordId?: string | null;
  createdAt?: string;
  user?: { name?: string; email?: string } | null;
  ip?: string | null;
};

export default function AuditPage() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminFetch<{ items?: AuditRow[] } | AuditRow[]>("/api/audit", {
        allowNotFound: true,
      });
      if (!data) {
        setRows([]);
        setError("Audit API not available yet.");
      } else {
        setRows(Array.isArray(data) ? data : data.items || []);
      }
    } catch (err) {
      setRows([]);
      setError(err instanceof AdminApiError ? err.message : "Failed to load audit log");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <AdminPageHeader title="Audit log" description="Security and editorial change history." />
      <DataTable
        loading={loading}
        error={error}
        rows={rows}
        rowKey={(r) => r.id}
        empty="No audit entries."
        columns={[
          {
            key: "when",
            header: "When",
            render: (r) => formatDate(r.createdAt) || "—",
          },
          { key: "action", header: "Action", render: (r) => <StatusBadge status={r.action} /> },
          { key: "module", header: "Module", render: (r) => r.module },
          {
            key: "user",
            header: "User",
            render: (r) => r.user?.name || r.user?.email || "—",
          },
          {
            key: "record",
            header: "Record",
            render: (r) => <span className="font-mono text-xs">{r.recordId || "—"}</span>,
          },
          { key: "ip", header: "IP", render: (r) => r.ip || "—" },
        ]}
      />
    </div>
  );
}
