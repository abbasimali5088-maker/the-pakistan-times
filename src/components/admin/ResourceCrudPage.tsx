"use client";

import { FormEvent, useCallback, useEffect, useState, type ReactNode } from "react";
import { AdminPageHeader, AdminPanel } from "@/components/admin/AdminShell";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { FormField, TextInput, TextSelect, TextTextarea } from "@/components/admin/FormField";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { adminFetch, AdminApiError } from "@/lib/admin-fetch";

export type FieldDef = {
  name: string;
  label: string;
  type?: "text" | "textarea" | "number" | "select" | "checkbox" | "url";
  urdu?: boolean;
  options?: Array<{ value: string; label: string }>;
  required?: boolean;
  placeholder?: string;
  hint?: string;
};

type ResourceCrudProps<T extends { id: string }> = {
  title: string;
  description?: string;
  endpoint: string;
  fields: FieldDef[];
  columns: Column<T>[];
  empty?: string;
  /** Map API payload → rows */
  mapItems?: (data: unknown) => T[];
  /** Extra actions in header */
  headerActions?: ReactNode;
  /** Allow create form */
  creatable?: boolean;
  /** Allow inline edit via PATCH */
  editable?: boolean;
  /** Allow DELETE */
  deletable?: boolean;
  /** Default create payload values */
  defaults?: Record<string, string | number | boolean>;
  /** Transform form values before POST/PATCH */
  toPayload?: (values: Record<string, string>) => Record<string, unknown>;
  /** Custom row actions */
  rowActions?: (row: T, reload: () => void) => ReactNode;
};

function extractItems<T>(data: unknown): T[] {
  if (!data) return [];
  if (Array.isArray(data)) return data as T[];
  if (typeof data === "object") {
    const obj = data as Record<string, unknown>;
    for (const key of ["items", "results", "rows", "data", "records"]) {
      if (Array.isArray(obj[key])) return obj[key] as T[];
    }
  }
  return [];
}

export function ResourceCrudPage<T extends { id: string }>({
  title,
  description,
  endpoint,
  fields,
  columns,
  empty,
  mapItems,
  headerActions,
  creatable = true,
  editable = true,
  deletable = true,
  defaults = {},
  toPayload,
  rowActions,
}: ResourceCrudProps<T>) {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const f of fields) {
      const d = defaults[f.name];
      init[f.name] = d === undefined || d === null ? "" : String(d);
    }
    return init;
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminFetch<unknown>(endpoint, { allowNotFound: true });
      if (data == null) {
        setRows([]);
        setError(`${title} API not available yet.`);
      } else {
        setRows(mapItems ? mapItems(data) : extractItems<T>(data));
      }
    } catch (err) {
      setRows([]);
      setError(err instanceof AdminApiError ? err.message : `Failed to load ${title}`);
    } finally {
      setLoading(false);
    }
  }, [endpoint, mapItems, title]);

  useEffect(() => {
    void load();
  }, [load]);

  function resetForm() {
    const init: Record<string, string> = {};
    for (const f of fields) {
      const d = defaults[f.name];
      init[f.name] = d === undefined || d === null ? "" : String(d);
    }
    setForm(init);
    setEditingId(null);
  }

  function startEdit(row: T) {
    const next: Record<string, string> = {};
    const raw = row as unknown as Record<string, unknown>;
    for (const f of fields) {
      const val = raw[f.name];
      next[f.name] = val === undefined || val === null ? "" : String(val);
    }
    setForm(next);
    setEditingId(row.id);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNotice(null);
    setError(null);
    const payload = toPayload
      ? toPayload(form)
      : Object.fromEntries(
          Object.entries(form).map(([k, v]) => {
            const field = fields.find((f) => f.name === k);
            if (field?.type === "number") return [k, v === "" ? null : Number(v)];
            if (field?.type === "checkbox") return [k, v === "true" || v === "1"];
            return [k, v === "" ? null : v];
          }),
        );

    try {
      if (editingId) {
        await adminFetch(`${endpoint.replace(/\?.*$/, "")}/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        setNotice("Updated.");
      } else {
        await adminFetch(endpoint.replace(/\?.*$/, ""), {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setNotice("Created.");
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string) {
    setError(null);
    try {
      await adminFetch(`${endpoint.replace(/\?.*$/, "")}/${id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : "Delete failed");
    }
  }

  const actionColumn: Column<T> = {
    key: "_actions",
    header: "Actions",
    render: (row) => (
      <div className="flex flex-wrap items-center gap-2">
        {editable ? (
          <button
            type="button"
            onClick={() => startEdit(row)}
            className="text-sm font-medium text-[#0B7A3B] hover:underline"
          >
            Edit
          </button>
        ) : null}
        {deletable ? (
          <ConfirmButton label="Delete" confirmLabel="Delete?" onConfirm={() => onDelete(row.id)} />
        ) : null}
        {rowActions?.(row, load)}
      </div>
    ),
  };

  const tableColumns =
    editable || deletable || rowActions ? [...columns, actionColumn] : columns;

  return (
    <div>
      <AdminPageHeader title={title} description={description} actions={headerActions} />

      {notice ? (
        <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {notice}
        </div>
      ) : null}

      {creatable || editingId ? (
        <AdminPanel title={editingId ? "Edit" : "Create"} className="mb-4">
          <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-2">
            {fields.map((f) => {
              if (f.type === "checkbox") {
                return (
                  <label key={f.name} className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={form[f.name] === "true" || form[f.name] === "1"}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, [f.name]: e.target.checked ? "true" : "false" }))
                      }
                    />
                    {f.label}
                  </label>
                );
              }
              return (
                <FormField
                  key={f.name}
                  label={f.label}
                  urdu={f.urdu}
                  hint={f.hint}
                  className={f.type === "textarea" ? "md:col-span-2" : undefined}
                >
                  {f.type === "textarea" ? (
                    <TextTextarea
                      urdu={f.urdu}
                      required={f.required}
                      placeholder={f.placeholder}
                      value={form[f.name] || ""}
                      onChange={(e) => setForm((prev) => ({ ...prev, [f.name]: e.target.value }))}
                    />
                  ) : f.type === "select" ? (
                    <TextSelect
                      required={f.required}
                      value={form[f.name] || ""}
                      onChange={(e) => setForm((prev) => ({ ...prev, [f.name]: e.target.value }))}
                    >
                      {(f.options || []).map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </TextSelect>
                  ) : (
                    <TextInput
                      type={f.type === "number" ? "number" : f.type === "url" ? "url" : "text"}
                      urdu={f.urdu}
                      required={f.required}
                      placeholder={f.placeholder}
                      value={form[f.name] || ""}
                      onChange={(e) => setForm((prev) => ({ ...prev, [f.name]: e.target.value }))}
                    />
                  )}
                </FormField>
              );
            })}
            <div className="flex flex-wrap gap-2 md:col-span-2">
              <button
                type="submit"
                disabled={busy}
                className="rounded-md bg-[#0B7A3B] px-4 py-2 text-sm font-medium text-white hover:bg-[#096b33] disabled:opacity-60"
              >
                {busy ? "Saving…" : editingId ? "Update" : "Create"}
              </button>
              {editingId ? (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
              ) : null}
            </div>
          </form>
        </AdminPanel>
      ) : null}

      <DataTable
        loading={loading}
        error={error}
        rows={rows}
        rowKey={(r) => r.id}
        empty={empty || `No ${title.toLowerCase()} yet.`}
        columns={tableColumns}
      />
    </div>
  );
}
