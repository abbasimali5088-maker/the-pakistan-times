"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/AdminShell";
import { DataTable } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { FormField, TextInput, TextSelect } from "@/components/admin/FormField";
import { ARTICLE_STATUSES } from "@/lib/constants";
import { adminFetch, AdminApiError } from "@/lib/admin-fetch";
import { formatDate } from "@/lib/utils";

type ArticleRow = {
  id: string;
  title: string;
  titleEn?: string;
  slug: string;
  status: string;
  priority?: string;
  publishedAt?: string | null;
  updatedAt?: string;
  category?: { name: string } | null;
};

export default function ArticlesClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState(searchParams.get("status") || "");
  const [q, setQ] = useState(searchParams.get("q") || "");
  const [rows, setRows] = useState<ArticleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (q) params.set("q", q);
    params.set("pageSize", "50");
    try {
      const data = await adminFetch<{ items: ArticleRow[]; total?: number }>(
        `/api/articles?${params}`,
        { allowNotFound: true },
      );
      if (!data) {
        setRows([]);
        setError("Articles API not available yet.");
      } else {
        setRows(data.items || []);
        setTotal(data.total ?? data.items?.length ?? 0);
      }
    } catch (err) {
      setRows([]);
      setError(err instanceof AdminApiError ? err.message : "Failed to load articles");
    } finally {
      setLoading(false);
    }
  }, [status, q]);

  useEffect(() => {
    void load();
  }, [load]);

  function onFilter(e: FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (q) params.set("q", q);
    router.replace(`/admin/articles${params.toString() ? `?${params}` : ""}`);
    void load();
  }

  return (
    <div>
      <AdminPageHeader
        title="Articles"
        description={total ? `${total} articles` : "Manage news articles"}
        actions={
          <Link
            href="/admin/articles/new"
            className="rounded-md bg-[#0B7A3B] px-3 py-2 text-sm font-medium text-white hover:bg-[#096b33]"
          >
            New article
          </Link>
        }
      />

      <form
        onSubmit={onFilter}
        className="mb-4 flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-end"
      >
        <FormField label="Status" className="sm:w-48">
          <TextSelect value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            {ARTICLE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </TextSelect>
        </FormField>
        <FormField label="Search" className="flex-1">
          <TextInput
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Title or body…"
          />
        </FormField>
        <button
          type="submit"
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Filter
        </button>
      </form>

      <DataTable
        loading={loading}
        error={error}
        rows={rows}
        rowKey={(r) => r.id}
        empty="No articles found."
        columns={[
          {
            key: "title",
            header: "Title",
            render: (r) => (
              <div>
                <Link
                  href={`/admin/articles/${r.id}`}
                  className="font-medium text-[#0B7A3B] hover:underline"
                >
                  {r.titleEn || r.title}
                </Link>
                <p className="text-xs text-slate-400">/{r.slug}</p>
              </div>
            ),
          },
          {
            key: "category",
            header: "Category",
            render: (r) => r.category?.name || "—",
          },
          {
            key: "status",
            header: "Status",
            render: (r) => <StatusBadge status={r.status} />,
          },
          {
            key: "priority",
            header: "Priority",
            render: (r) => <StatusBadge status={r.priority} />,
          },
          {
            key: "updated",
            header: "Updated",
            render: (r) => formatDate(r.updatedAt || r.publishedAt) || "—",
          },
        ]}
      />
    </div>
  );
}
