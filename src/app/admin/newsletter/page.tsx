"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminPageHeader, AdminPanel } from "@/components/admin/AdminShell";
import { DataTable } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { adminFetch, AdminApiError } from "@/lib/admin-fetch";
import { formatDate } from "@/lib/utils";

type Subscriber = {
  id: string;
  email: string;
  name?: string | null;
  status?: string;
  createdAt?: string;
};

type Campaign = {
  id: string;
  subject: string;
  status?: string;
  scheduledAt?: string | null;
  sentAt?: string | null;
};

export default function NewsletterPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminFetch<{
        subscribers?: Subscriber[];
        campaigns?: Campaign[];
        items?: Subscriber[];
      }>("/api/newsletter", { allowNotFound: true });
      if (!data) {
        setError("Newsletter API not available yet.");
        setSubscribers([]);
        setCampaigns([]);
      } else {
        setSubscribers(data.subscribers || data.items || []);
        setCampaigns(data.campaigns || []);
      }
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : "Failed to load newsletter");
      setSubscribers([]);
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <AdminPageHeader title="Newsletter" description="Subscribers and campaigns." />
      {error ? (
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {error}
        </div>
      ) : null}

      <div className="space-y-4">
        <AdminPanel title="Subscribers">
          <DataTable
            loading={loading}
            rows={subscribers}
            rowKey={(r) => r.id}
            empty="No subscribers."
            columns={[
              { key: "email", header: "Email", render: (r) => r.email },
              { key: "name", header: "Name", render: (r) => r.name || "—" },
              { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
              {
                key: "when",
                header: "Joined",
                render: (r) => formatDate(r.createdAt) || "—",
              },
            ]}
          />
        </AdminPanel>
        <AdminPanel title="Campaigns">
          <DataTable
            loading={loading}
            rows={campaigns}
            rowKey={(r) => r.id}
            empty="No campaigns."
            columns={[
              { key: "subject", header: "Subject", render: (r) => r.subject },
              { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
              {
                key: "sent",
                header: "Sent",
                render: (r) => formatDate(r.sentAt || r.scheduledAt) || "—",
              },
            ]}
          />
        </AdminPanel>
      </div>
    </div>
  );
}
