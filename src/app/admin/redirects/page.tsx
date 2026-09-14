"use client";

import { ResourceCrudPage } from "@/components/admin/ResourceCrudPage";

type Redirect = {
  id: string;
  fromPath: string;
  toPath: string;
  statusCode?: number;
  hits?: number;
};

export default function RedirectsPage() {
  return (
    <ResourceCrudPage<Redirect>
      title="Redirects"
      description="URL redirects (301/302)."
      endpoint="/api/redirects"
      defaults={{ statusCode: 301 }}
      fields={[
        { name: "fromPath", label: "From path", required: true, placeholder: "/old-path" },
        { name: "toPath", label: "To path", required: true, placeholder: "/new-path" },
        {
          name: "statusCode",
          label: "Status code",
          type: "select",
          options: [
            { value: "301", label: "301" },
            { value: "302", label: "302" },
            { value: "307", label: "307" },
            { value: "308", label: "308" },
          ],
        },
      ]}
      columns={[
        { key: "from", header: "From", render: (r) => r.fromPath },
        { key: "to", header: "To", render: (r) => r.toPath },
        { key: "code", header: "Code", render: (r) => r.statusCode ?? 301 },
        { key: "hits", header: "Hits", render: (r) => r.hits ?? 0 },
      ]}
    />
  );
}
