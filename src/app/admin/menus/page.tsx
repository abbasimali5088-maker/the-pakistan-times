"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminPageHeader, AdminPanel } from "@/components/admin/AdminShell";
import { DataTable } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { adminFetch, AdminApiError } from "@/lib/admin-fetch";

type MenuItem = {
  id: string;
  label: string;
  labelUr?: string | null;
  url: string;
  sortOrder?: number;
  status?: string;
};

type Menu = {
  id: string;
  name: string;
  location?: string;
  status?: string;
  items?: MenuItem[];
};

export default function MenusPage() {
  const [menus, setMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminFetch<{ items?: Menu[] } | Menu[]>("/api/menus", {
        allowNotFound: true,
      });
      if (!data) {
        setMenus([]);
        setError("Menus API not available yet.");
      } else {
        const list = Array.isArray(data) ? data : data.items || [];
        setMenus(list);
        setActive((prev) => prev || list[0]?.id || null);
      }
    } catch (err) {
      setMenus([]);
      setError(err instanceof AdminApiError ? err.message : "Failed to load menus");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const current = menus.find((m) => m.id === active);
  const items = current?.items || [];

  return (
    <div>
      <AdminPageHeader title="Menus" description="Navigation structures for the public site." />

      {error ? (
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
          <AdminPanel title="Menus">
            <ul className="space-y-1">
              {menus.length === 0 ? (
                <li className="text-sm text-slate-500">No menus.</li>
              ) : (
                menus.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => setActive(m.id)}
                      className={`w-full rounded-md px-3 py-2 text-left text-sm ${
                        active === m.id
                          ? "bg-[#0B7A3B] text-white"
                          : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {m.name}
                      <span className="mt-0.5 block text-[11px] opacity-80">
                        {m.location || "main"}
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </AdminPanel>

          <DataTable
            rows={items}
            rowKey={(r) => r.id}
            empty="No menu items."
            columns={[
              {
                key: "label",
                header: "Label",
                render: (r) => r.labelUr || r.label,
              },
              { key: "url", header: "URL", render: (r) => r.url },
              { key: "order", header: "Order", render: (r) => r.sortOrder ?? 0 },
              { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
            ]}
          />
        </div>
      )}
    </div>
  );
}
