"use client";

import { ResourceCrudPage } from "@/components/admin/ResourceCrudPage";
import { StatusBadge } from "@/components/admin/StatusBadge";

type Author = {
  id: string;
  name: string;
  slug: string;
  email?: string | null;
  position?: string | null;
  status?: string;
};

export default function AuthorsPage() {
  return (
    <ResourceCrudPage<Author>
      title="Authors"
      description="Bylines and contributor profiles."
      endpoint="/api/authors"
      defaults={{ status: "active" }}
      fields={[
        { name: "name", label: "Name", required: true },
        { name: "slug", label: "Slug" },
        { name: "email", label: "Email" },
        { name: "position", label: "Position" },
        { name: "bio", label: "Bio", type: "textarea" },
        { name: "photoUrl", label: "Photo URL", type: "url" },
        {
          name: "status",
          label: "Status",
          type: "select",
          options: [
            { value: "active", label: "active" },
            { value: "inactive", label: "inactive" },
          ],
        },
      ]}
      columns={[
        { key: "name", header: "Name", render: (r) => r.name },
        { key: "email", header: "Email", render: (r) => r.email || "—" },
        { key: "position", header: "Position", render: (r) => r.position || "—" },
        { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
      ]}
    />
  );
}
