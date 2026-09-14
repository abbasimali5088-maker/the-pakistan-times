"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminShell";
import { DataTable } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { adminFetch, AdminApiError } from "@/lib/admin-fetch";
import { formatDate } from "@/lib/utils";

type Notification = {
  id: string;
  type: string;
  title: string;
  body?: string | null;
  link?: string | null;
  isRead?: boolean;
  createdAt?: string;
};

export default function NotificationsPage() {
  const [rows, setRows] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminFetch<{ items?: Notification[] } | Notification[]>(
        "/api/notifications",
        { allowNotFound: true },
      );
      if (!data) {
        setRows([]);
        setError("Notifications API not available yet.");
      } else {
        setRows(Array.isArray(data) ? data : data.items || []);
      }
    } catch (err) {
      setRows([]);
      setError(err instanceof AdminApiError ? err.message : "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function markRead(id: string) {
    try {
      await adminFetch(`/api/notifications/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ isRead: true }),
      });
      await load();
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : "Update failed");
    }
  }

  return (
    <div>
      <AdminPageHeader title="Notifications" description="Dashboard alerts and messages." />
      <DataTable
        loading={loading}
        error={error}
        rows={rows}
        rowKey={(r) => r.id}
        empty="No notifications."
        columns={[
          {
            key: "title",
            header: "Notification",
            render: (r) => (
              <div>
                <p className="font-medium">{r.title}</p>
                {r.body ? <p className="text-xs text-slate-500">{r.body}</p> : null}
              </div>
            ),
          },
          { key: "type", header: "Type", render: (r) => <StatusBadge status={r.type} /> },
          {
            key: "read",
            header: "Read",
            render: (r) => (r.isRead ? "Yes" : "No"),
          },
          {
            key: "when",
            header: "When",
            render: (r) => formatDate(r.createdAt) || "—",
          },
          {
            key: "actions",
            header: "",
            render: (r) =>
              !r.isRead ? (
                <button
                  type="button"
                  onClick={() => markRead(r.id)}
                  className="text-sm font-medium text-[#0B7A3B] hover:underline"
                >
                  Mark read
                </button>
              ) : null,
          },
        ]}
      />
    </div>
  );
}
