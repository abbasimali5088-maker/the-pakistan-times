"use client";

import { ResourceCrudPage } from "@/components/admin/ResourceCrudPage";
import { StatusBadge } from "@/components/admin/StatusBadge";

type Ad = {
  id: string;
  name: string;
  unitKey: string;
  status?: string;
  device?: string;
  priority?: number;
};

export default function AdsPage() {
  return (
    <ResourceCrudPage<Ad>
      title="Ads"
      description="Advertisement units and creatives."
      endpoint="/api/ads"
      defaults={{ status: "active", device: "all", priority: 0 }}
      fields={[
        { name: "name", label: "Name", required: true },
        { name: "unitKey", label: "Unit key", required: true },
        { name: "imageUrl", label: "Image URL", type: "url" },
        { name: "targetUrl", label: "Target URL", type: "url" },
        { name: "code", label: "Embed code", type: "textarea" },
        {
          name: "device",
          label: "Device",
          type: "select",
          options: [
            { value: "all", label: "all" },
            { value: "desktop", label: "desktop" },
            { value: "mobile", label: "mobile" },
          ],
        },
        { name: "priority", label: "Priority", type: "number" },
        {
          name: "status",
          label: "Status",
          type: "select",
          options: [
            { value: "active", label: "active" },
            { value: "paused", label: "paused" },
          ],
        },
      ]}
      columns={[
        { key: "name", header: "Name", render: (r) => r.name },
        { key: "unit", header: "Unit", render: (r) => r.unitKey },
        { key: "device", header: "Device", render: (r) => r.device || "all" },
        { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
      ]}
    />
  );
}
