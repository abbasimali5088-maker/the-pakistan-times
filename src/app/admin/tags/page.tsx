"use client";

import { ResourceCrudPage } from "@/components/admin/ResourceCrudPage";

type Tag = {
  id: string;
  name: string;
  nameUr?: string | null;
  slug: string;
  usageCount?: number;
};

export default function TagsPage() {
  return (
    <ResourceCrudPage<Tag>
      title="Tags"
      description="Topic tags for articles."
      endpoint="/api/tags"
      fields={[
        { name: "name", label: "Name (EN)", required: true },
        { name: "nameUr", label: "نام (اردو)", urdu: true },
        { name: "slug", label: "Slug" },
        { name: "description", label: "Description", type: "textarea" },
      ]}
      columns={[
        { key: "name", header: "Name", render: (r) => r.nameUr || r.name },
        { key: "slug", header: "Slug", render: (r) => r.slug },
        { key: "usage", header: "Usage", render: (r) => r.usageCount ?? 0 },
      ]}
    />
  );
}
