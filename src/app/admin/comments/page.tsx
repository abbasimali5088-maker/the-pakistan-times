"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminShell";
import { DataTable } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { adminFetch, AdminApiError } from "@/lib/admin-fetch";
import { formatDate } from "@/lib/utils";

type Comment = {
  id: string;
  body: string;
  authorName?: string | null;
  authorEmail?: string | null;
  status: string;
  createdAt?: string;
  article?: { title?: string; slug?: string } | null;
};

export default function CommentsPage() {
  const [rows, setRows] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("pending");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const qs = filter ? `?status=${encodeURIComponent(filter)}` : "";
    try {
      const data = await adminFetch<{ items?: Comment[] } | Comment[]>(`/api/comments${qs}`, {
        allowNotFound: true,
      });
      if (!data) {
        setRows([]);
        setError("Comments API not available yet.");
      } else {
        setRows(Array.isArray(data) ? data : data.items || []);
      }
    } catch (err) {
      setRows([]);
      setError(err instanceof AdminApiError ? err.message : "Failed to load comments");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function moderate(id: string, status: "approved" | "rejected" | "spam") {
    try {
      await adminFetch(`/api/comments/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await load();
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : "Moderation failed");
    }
  }

  return (
    <div>
      <AdminPageHeader
        title="Comments"
        description="Moderate reader comments."
        actions={
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="spam">Spam</option>
          </select>
        }
      />

      <DataTable
        loading={loading}
        error={error}
        rows={rows}
        rowKey={(r) => r.id}
        empty="No comments."
        columns={[
          {
            key: "body",
            header: "Comment",
            render: (r) => (
              <div>
                <p className="max-w-md whitespace-pre-wrap">{r.body}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {r.authorName || r.authorEmail || "Anonymous"}
                  {r.article?.title ? ` · ${r.article.title}` : ""}
                </p>
              </div>
            ),
          },
          { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
          {
            key: "when",
            header: "When",
            render: (r) => formatDate(r.createdAt) || "—",
          },
          {
            key: "actions",
            header: "Moderate",
            render: (r) => (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => moderate(r.id, "approved")}
                  className="text-sm font-medium text-[#0B7A3B] hover:underline"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => moderate(r.id, "rejected")}
                  className="text-sm font-medium text-orange-700 hover:underline"
                >
                  Reject
                </button>
                <button
                  type="button"
                  onClick={() => moderate(r.id, "spam")}
                  className="text-sm font-medium text-red-700 hover:underline"
                >
                  Spam
                </button>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
