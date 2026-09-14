"use client";

import { ResourceCrudPage } from "@/components/admin/ResourceCrudPage";
import { StatusBadge } from "@/components/admin/StatusBadge";

type Video = {
  id: string;
  title: string;
  slug?: string;
  status?: string;
  url?: string | null;
};

export default function VideosPage() {
  return (
    <ResourceCrudPage<Video>
      title="Videos"
      description="Video library entries."
      endpoint="/api/videos"
      defaults={{ status: "draft" }}
      fields={[
        { name: "title", label: "Title", required: true },
        { name: "slug", label: "Slug" },
        { name: "url", label: "Video URL", type: "url" },
        { name: "description", label: "Description", type: "textarea" },
        {
          name: "status",
          label: "Status",
          type: "select",
          options: [
            { value: "draft", label: "draft" },
            { value: "published", label: "published" },
          ],
        },
      ]}
      columns={[
        { key: "title", header: "Title", render: (r) => r.title },
        { key: "url", header: "URL", render: (r) => r.url || "—" },
        { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
      ]}
    />
  );
}
