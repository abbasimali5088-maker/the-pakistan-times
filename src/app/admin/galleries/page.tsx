"use client";

import { ResourceCrudPage } from "@/components/admin/ResourceCrudPage";
import { StatusBadge } from "@/components/admin/StatusBadge";

type Gallery = {
  id: string;
  title: string;
  slug?: string;
  status?: string;
};

export default function GalleriesPage() {
  return (
    <ResourceCrudPage<Gallery>
      title="Galleries"
      description="Photo galleries."
      endpoint="/api/galleries"
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
            { value: "published", label: "published" },
          ],
        },
      ]}
      columns={[
        { key: "title", header: "Title", render: (r) => r.title },
        { key: "slug", header: "Slug", render: (r) => r.slug || "—" },
        { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
      ]}
    />
  );
}
