"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminPageHeader, AdminPanel } from "@/components/admin/AdminShell";
import { DataTable } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { adminFetch, AdminApiError } from "@/lib/admin-fetch";
import { formatDate } from "@/lib/utils";

type Backup = {
  id: string;
  type: string;
  path: string;
  size?: number | null;
  status?: string;
  verified?: boolean;
  createdAt?: string;
  note?: string | null;
};

export default function BackupPage() {
  const [rows, setRows] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminFetch<{ items?: Backup[] } | Backup[]>("/api/backup", {
        allowNotFound: true,
      });
      if (!data) {
        setRows([]);
        setError("Backup API not available yet.");
      } else {
        setRows(Array.isArray(data) ? data : data.items || []);
      }
    } catch (err) {
      setRows([]);
      setError(err instanceof AdminApiError ? err.message : "Failed to load backups");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createBackup() {
    setBusy(true);
    setError(null);
    try {
      await adminFetch("/api/backup", {
        method: "POST",
        body: JSON.stringify({ type: "manual" }),
      });
      await load();
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : "Backup failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <AdminPageHeader
        title="Backup"
        description="Database and content backups."
        actions={
          <ConfirmButton
            label={busy ? "Creating…" : "Create backup"}
            confirmLabel="Start backup?"
            variant="primary"
            disabled={busy}
            onConfirm={createBackup}
          />
        }
      />
      <AdminPanel>
        <DataTable
          loading={loading}
          error={error}
          rows={rows}
          rowKey={(r) => r.id}
          empty="No backups yet."
          columns={[
            { key: "type", header: "Type", render: (r) => r.type },
            { key: "path", header: "Path", render: (r) => <span className="font-mono text-xs">{r.path}</span> },
            {
              key: "size",
              header: "Size",
              render: (r) => (r.size != null ? `${r.size} B` : "—"),
            },
            { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
            {
              key: "when",
              header: "Created",
              render: (r) => formatDate(r.createdAt) || "—",
            },
          ]}
        />
      </AdminPanel>
    </div>
  );
}
