"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AdminPageHeader, AdminPanel } from "@/components/admin/AdminShell";
import { DataTable } from "@/components/admin/DataTable";
import { FormField, TextSelect, TextTextarea } from "@/components/admin/FormField";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { adminFetch, AdminApiError } from "@/lib/admin-fetch";
import { formatDate } from "@/lib/utils";

type LiveUpdate = {
  id: string;
  body: string;
  type?: string;
  status?: string;
  isPinned?: boolean;
  publishedAt?: string;
};

type LiveStory = {
  id: string;
  title: string;
  slug: string;
  status?: string;
  updates?: LiveUpdate[];
};

export default function LiveStoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [story, setStory] = useState<LiveStory | null>(null);
  const [updates, setUpdates] = useState<LiveUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [type, setType] = useState("text");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminFetch<LiveStory>(`/api/live/${id}`, { allowNotFound: true });
      if (!data) {
        setError("Live story API not available yet.");
        setStory(null);
        setUpdates([]);
      } else {
        setStory(data);
        setUpdates(data.updates || []);
      }
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : "Failed to load live story");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function addUpdate(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await adminFetch(`/api/live/${id}/updates`, {
        method: "POST",
        body: JSON.stringify({ body, type, status: "published" }),
      });
      setBody("");
      await load();
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : "Failed to post update");
    } finally {
      setBusy(false);
    }
  }

  async function removeUpdate(updateId: string) {
    try {
      await adminFetch(`/api/live/${id}/updates/${updateId}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : "Delete failed");
    }
  }

  if (loading) return <p className="text-sm text-slate-500">Loading…</p>;

  return (
    <div>
      <AdminPageHeader
        title={story?.title || "Live story"}
        description={story?.slug ? `/${story.slug}` : "Rolling updates"}
        actions={
          <Link href="/admin/live" className="text-sm text-slate-600 hover:text-[#0B7A3B]">
            ← All live stories
          </Link>
        }
      />

      {error ? (
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {error}
        </div>
      ) : null}

      {story ? <StatusBadge status={story.status} className="mb-4" /> : null}

      <AdminPanel title="Post update" className="mb-4">
        <form onSubmit={addUpdate} className="space-y-3">
          <FormField label="Update body">
            <TextTextarea required value={body} onChange={(e) => setBody(e.target.value)} />
          </FormField>
          <FormField label="Type" className="max-w-xs">
            <TextSelect value={type} onChange={(e) => setType(e.target.value)}>
              <option value="text">text</option>
              <option value="image">image</option>
              <option value="quote">quote</option>
              <option value="video">video</option>
            </TextSelect>
          </FormField>
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-[#0B7A3B] px-4 py-2 text-sm font-medium text-white hover:bg-[#096b33] disabled:opacity-60"
          >
            {busy ? "Posting…" : "Post update"}
          </button>
        </form>
      </AdminPanel>

      <DataTable
        rows={updates}
        rowKey={(r) => r.id}
        empty="No updates yet."
        columns={[
          {
            key: "body",
            header: "Update",
            render: (r) => <p className="max-w-xl whitespace-pre-wrap">{r.body}</p>,
          },
          { key: "type", header: "Type", render: (r) => r.type || "text" },
          { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
          {
            key: "when",
            header: "Published",
            render: (r) => formatDate(r.publishedAt) || "—",
          },
          {
            key: "actions",
            header: "",
            render: (r) => (
              <ConfirmButton label="Delete" confirmLabel="Delete?" onConfirm={() => removeUpdate(r.id)} />
            ),
          },
        ]}
      />
    </div>
  );
}
