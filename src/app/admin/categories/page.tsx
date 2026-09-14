"use client";

import { ResourceCrudPage } from "@/components/admin/ResourceCrudPage";
import { StatusBadge } from "@/components/admin/StatusBadge";

type Category = {
  id: string;
  name: string;
  nameUr?: string | null;
  slug: string;
  status?: string;
  sortOrder?: number;
  _count?: { articles?: number };
};

export default function CategoriesPage() {
  return (
    <ResourceCrudPage<Category>
      title="Categories"
      description="Organize articles by section (EN / اردو)."
      endpoint="/api/categories"
      defaults={{ status: "active", sortOrder: 0 }}
      fields={[
        { name: "name", label: "Name (EN)", required: true },
        { name: "nameUr", label: "نام (اردو)", urdu: true },
        { name: "slug", label: "Slug", hint: "Optional — auto from name" },
        { name: "description", label: "Description", type: "textarea" },
        {
          name: "status",
          label: "Status",
          type: "select",
          options: [
            { value: "active", label: "active" },
            { value: "inactive", label: "inactive" },
          ],
        },
        { name: "sortOrder", label: "Sort order", type: "number" },
      ]}
      columns={[
        { key: "name", header: "Name", render: (r) => r.nameUr || r.name },
        { key: "slug", header: "Slug", render: (r) => r.slug },
        { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
        {
          key: "count",
          header: "Articles",
          render: (r) => r._count?.articles ?? "—",
        },
      ]}
    />
  );
}
