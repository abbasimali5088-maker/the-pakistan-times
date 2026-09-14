"use client";

import Link from "next/link";
import { ResourceCrudPage } from "@/components/admin/ResourceCrudPage";
import { StatusBadge } from "@/components/admin/StatusBadge";

type LiveStory = {
  id: string;
  title: string;
  slug: string;
  status?: string;
};

export default function LiveStoriesPage() {
  return (
    <ResourceCrudPage<LiveStory>
      title="Live stories"
      description="Live blogs and rolling coverage."
      endpoint="/api/live"
      defaults={{ status: "draft" }}
      fields={[
        { name: "title", label: "Title", required: true },
        { name: "slug", label: "Slug" },
        { name: "description", label: "Description", type: "textarea" },
        {
          name: "status",
          label: "Status",
          type: "select",
          options: [
            { value: "draft", label: "draft" },
            { value: "live", label: "live" },
            { value: "ended", label: "ended" },
          ],
        },
      ]}
      columns={[
        {
          key: "title",
          header: "Title",
          render: (r) => (
            <Link href={`/admin/live/${r.id}`} className="font-medium text-[#0B7A3B] hover:underline">
              {r.title}
            </Link>
          ),
        },
        { key: "slug", header: "Slug", render: (r) => r.slug },
        { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
      ]}
      rowActions={(r) => (
        <Link href={`/admin/live/${r.id}`} className="text-sm text-slate-600 hover:underline">
          Updates
        </Link>
      )}
    />
  );
}
