"use client";

import { ResourceCrudPage } from "@/components/admin/ResourceCrudPage";
import { StatusBadge } from "@/components/admin/StatusBadge";

type User = {
  id: string;
  email: string;
  username: string;
  name: string;
  status?: string;
};

export default function UsersPage() {
  return (
    <ResourceCrudPage<User>
      title="Users"
      description="CMS user accounts."
      endpoint="/api/users"
      defaults={{ status: "active" }}
      fields={[
        { name: "name", label: "Name", required: true },
        { name: "email", label: "Email", required: true },
        { name: "username", label: "Username", required: true },
        { name: "password", label: "Password", hint: "Required on create" },
        {
          name: "status",
          label: "Status",
          type: "select",
          options: [
            { value: "active", label: "active" },
            { value: "disabled", label: "disabled" },
          ],
        },
        { name: "roleIds", label: "Role IDs", hint: "Comma-separated role ids" },
      ]}
      toPayload={(values) => ({
        name: values.name,
        email: values.email,
        username: values.username,
        password: values.password || undefined,
        status: values.status,
        roleIds: values.roleIds
          ? values.roleIds
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined,
      })}
      columns={[
        { key: "name", header: "Name", render: (r) => r.name },
        { key: "email", header: "Email", render: (r) => r.email },
        { key: "username", header: "Username", render: (r) => r.username },
        { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
      ]}
    />
  );
}
