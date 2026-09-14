"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminShell";
import { DataTable } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { adminFetch, AdminApiError } from "@/lib/admin-fetch";
import { formatDate } from "@/lib/utils";

type SeoIssue = {
  id: string;
  entityType: string;
  entityId: string;
  issueCode: string;
  severity: string;
  message: string;
  resolved?: boolean;
  createdAt?: string;
};

export default function SeoPage() {
  const [rows, setRows] = useState<SeoIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminFetch<{ items?: SeoIssue[] } | SeoIssue[]>("/api/seo", {
        allowNotFound: true,
      });
      if (!data) {
        setRows([]);
        setError("SEO API not available yet.");
      } else {
        setRows(Array.isArray(data) ? data : data.items || []);
      }
    } catch (err) {
      setRows([]);
      setError(err instanceof AdminApiError ? err.message : "Failed to load SEO audit");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <AdminPageHeader title="SEO" description="Content SEO audit issues." />
      <DataTable
        loading={loading}
        error={error}
        rows={rows}
        rowKey={(r) => r.id}
        empty="No SEO issues."
        columns={[
          { key: "severity", header: "Severity", render: (r) => <StatusBadge status={r.severity} /> },
          { key: "code", header: "Code", render: (r) => r.issueCode },
          { key: "message", header: "Message", render: (r) => r.message },
          {
            key: "entity",
            header: "Entity",
            render: (r) => (
              <span className="font-mono text-xs">
                {r.entityType}:{r.entityId}
              </span>
            ),
          },
          {
            key: "resolved",
            header: "Resolved",
            render: (r) => (r.resolved ? "Yes" : "No"),
          },
          {
            key: "when",
            header: "Found",
            render: (r) => formatDate(r.createdAt) || "—",
          },
        ]}
      />
    </div>
  );
}
