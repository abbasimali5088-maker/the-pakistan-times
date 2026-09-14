"use client";

import { ResourceCrudPage } from "@/components/admin/ResourceCrudPage";
import { StatusBadge } from "@/components/admin/StatusBadge";

type StaticPage = {
  id: string;
  title: string;
  slug: string;
  status?: string;
};

export default function PagesAdminPage() {
  return (
    <ResourceCrudPage<StaticPage>
      title="Pages"
      description="Static / legal CMS pages."
      endpoint="/api/pages"
      defaults={{ status: "published" }}
      fields={[
        { name: "title", label: "Title", required: true },
        { name: "slug", label: "Slug", required: true },
        { name: "body", label: "Body (EN)", type: "textarea", required: true },
        { name: "bodyUr", label: "متن (اردو)", type: "textarea", urdu: true },
        {
          name: "status",
          label: "Status",
          type: "select",
          options: [
            { value: "draft", label: "draft" },
            { value: "published", label: "published" },
          ],
        },
        { name: "seoTitle", label: "SEO title" },
        { name: "seoDescription", label: "SEO description", type: "textarea" },
      ]}
      columns={[
        { key: "title", header: "Title", render: (r) => r.title },
        { key: "slug", header: "Slug", render: (r) => r.slug },
        { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
      ]}
    />
  );
}
