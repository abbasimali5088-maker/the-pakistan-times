"use client";

import { ResourceCrudPage } from "@/components/admin/ResourceCrudPage";

type Role = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  isSystem?: boolean;
};

export default function RolesPage() {
  return (
    <ResourceCrudPage<Role>
      title="Roles"
      description="Roles and permission bundles."
      endpoint="/api/roles"
      fields={[
        { name: "name", label: "Name", required: true },
        { name: "slug", label: "Slug" },
        { name: "description", label: "Description", type: "textarea" },
      ]}
      columns={[
        { key: "name", header: "Name", render: (r) => r.name },
        { key: "slug", header: "Slug", render: (r) => r.slug },
        { key: "description", header: "Description", render: (r) => r.description || "—" },
        {
          key: "system",
          header: "System",
          render: (r) => (r.isSystem ? "Yes" : "No"),
        },
      ]}
    />
  );
}
