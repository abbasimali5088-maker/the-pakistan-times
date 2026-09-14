"use client";

import { ResourceCrudPage } from "@/components/admin/ResourceCrudPage";
import { StatusBadge } from "@/components/admin/StatusBadge";

type Poll = {
  id: string;
  question: string;
  status?: string;
};

export default function PollsPage() {
  return (
    <ResourceCrudPage<Poll>
      title="Polls"
      description="Reader polls."
      endpoint="/api/polls"
      defaults={{ status: "draft" }}
      fields={[
        { name: "question", label: "Question", required: true, type: "textarea" },
        {
          name: "status",
          label: "Status",
          type: "select",
          options: [
            { value: "draft", label: "draft" },
            { value: "active", label: "active" },
            { value: "closed", label: "closed" },
          ],
        },
        {
          name: "options",
          label: "Options",
          hint: "Comma-separated option labels",
          placeholder: "Yes, No, Maybe",
        },
      ]}
      toPayload={(values) => ({
        question: values.question,
        status: values.status,
        options: values.options
          ? values.options
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
              .map((label) => ({ label }))
          : undefined,
      })}
      columns={[
        { key: "question", header: "Question", render: (r) => r.question },
        { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
      ]}
    />
  );
}
