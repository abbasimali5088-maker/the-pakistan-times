"use client";

import { ResourceCrudPage } from "@/components/admin/ResourceCrudPage";
import { StatusBadge } from "@/components/admin/StatusBadge";

type Quiz = {
  id: string;
  title: string;
  description?: string | null;
  status?: string;
};

export default function QuizzesPage() {
  return (
    <ResourceCrudPage<Quiz>
      title="Quizzes"
      description="Interactive quizzes."
      endpoint="/api/quizzes"
      defaults={{ status: "draft" }}
      fields={[
        { name: "title", label: "Title", required: true },
        { name: "description", label: "Description", type: "textarea" },
        {
          name: "status",
          label: "Status",
          type: "select",
          options: [
            { value: "draft", label: "draft" },
            { value: "published", label: "published" },
            { value: "archived", label: "archived" },
          ],
        },
      ]}
      columns={[
        { key: "title", header: "Title", render: (r) => r.title },
        { key: "description", header: "Description", render: (r) => r.description || "—" },
        { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
      ]}
    />
  );
}
