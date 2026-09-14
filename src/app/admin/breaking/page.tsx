"use client";

import { ResourceCrudPage } from "@/components/admin/ResourceCrudPage";
import { StatusBadge } from "@/components/admin/StatusBadge";

type Breaking = {
  id: string;
  headline: string;
  headlineUr?: string | null;
  priority?: number;
  status?: string;
};

export default function BreakingPage() {
  return (
    <ResourceCrudPage<Breaking>
      title="Breaking news"
      description="Manage ticker / alert headlines."
      endpoint="/api/breaking"
      defaults={{ status: "draft", priority: 1 }}
      fields={[
        { name: "headline", label: "Headline (EN)", required: true },
        { name: "headlineUr", label: "عنوان (اردو)", urdu: true },
        { name: "priority", label: "Priority", type: "number" },
        {
          name: "status",
          label: "Status",
          type: "select",
          options: [
            { value: "draft", label: "draft" },
            { value: "active", label: "active" },
            { value: "expired", label: "expired" },
          ],
        },
        { name: "articleId", label: "Linked article ID" },
        { name: "startAt", label: "Start at (ISO)" },
        { name: "endAt", label: "End at (ISO)" },
      ]}
      columns={[
        { key: "headline", header: "Headline", render: (r) => r.headlineUr || r.headline },
        { key: "priority", header: "Priority", render: (r) => r.priority ?? "—" },
        { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
      ]}
    />
  );
}
