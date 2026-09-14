"use client";

import { ResourceCrudPage } from "@/components/admin/ResourceCrudPage";
import { StatusBadge } from "@/components/admin/StatusBadge";

type Block = {
  id: string;
  sectionKey: string;
  title?: string | null;
  articleId?: string | null;
  sortOrder?: number;
  isVisible?: boolean;
  priority?: number;
};

export default function HomepagePage() {
  return (
    <ResourceCrudPage<Block>
      title="Homepage"
      description="Curate homepage section blocks."
      endpoint="/api/homepage"
      defaults={{ isVisible: true, sortOrder: 0, priority: 0 }}
      fields={[
        { name: "sectionKey", label: "Section key", required: true, placeholder: "hero, top_stories…" },
        { name: "title", label: "Title" },
        { name: "articleId", label: "Article ID" },
        { name: "sortOrder", label: "Sort order", type: "number" },
        { name: "priority", label: "Priority", type: "number" },
        { name: "isVisible", label: "Visible", type: "checkbox" },
        { name: "configJson", label: "Config JSON", type: "textarea" },
      ]}
      columns={[
        { key: "section", header: "Section", render: (r) => r.sectionKey },
        { key: "title", header: "Title", render: (r) => r.title || "—" },
        { key: "article", header: "Article", render: (r) => r.articleId || "—" },
        { key: "order", header: "Order", render: (r) => r.sortOrder ?? 0 },
        {
          key: "visible",
          header: "Visible",
          render: (r) => <StatusBadge status={r.isVisible ? "active" : "draft"} />,
        },
      ]}
    />
  );
}
