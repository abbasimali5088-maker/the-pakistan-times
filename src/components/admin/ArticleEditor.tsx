"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AdminPageHeader, AdminPanel } from "@/components/admin/AdminShell";
import { FormField, TextInput, TextSelect, TextTextarea } from "@/components/admin/FormField";
import { ARTICLE_STATUSES, PRIORITIES } from "@/lib/constants";
import { adminFetch, AdminApiError, parseCommaList } from "@/lib/admin-fetch";

type Category = { id: string; name: string; nameUr?: string | null; slug: string };
type Tag = { id: string; name: string; slug: string };

type ArticleFormState = {
  title: string;
  titleUr: string;
  slug: string;
  excerpt: string;
  excerptUr: string;
  body: string;
  bodyUr: string;
  categoryId: string;
  status: string;
  priority: string;
  seoTitle: string;
  seoDescription: string;
  focusKeyword: string;
  canonicalUrl: string;
  robotsMeta: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  tags: string;
  isFeatured: boolean;
  isBreaking: boolean;
};

const emptyForm: ArticleFormState = {
  title: "",
  titleUr: "",
  slug: "",
  excerpt: "",
  excerptUr: "",
  body: "",
  bodyUr: "",
  categoryId: "",
  status: "draft",
  priority: "normal",
  seoTitle: "",
  seoDescription: "",
  focusKeyword: "",
  canonicalUrl: "",
  robotsMeta: "",
  ogTitle: "",
  ogDescription: "",
  ogImage: "",
  tags: "",
  isFeatured: false,
  isBreaking: false,
};

function mapArticleToForm(data: Record<string, unknown>): ArticleFormState {
  const seo = (data.seo as Record<string, string | null> | undefined) || {};
  const tags = Array.isArray(data.tags)
    ? (data.tags as Array<{ id?: string; slug?: string }>)
        .map((t) => t.id || t.slug || "")
        .filter(Boolean)
        .join(", ")
    : "";
  const category = data.category as { id?: string } | null | undefined;

  return {
    title: String(data.titleEn || data.title || ""),
    titleUr: String(data.titleUr || ""),
    slug: String(data.slug || ""),
    excerpt: String(data.excerptEn || data.excerpt || ""),
    excerptUr: String(data.excerptUr || ""),
    body: String(data.bodyEn ?? data.body ?? ""),
    bodyUr: String(data.bodyUr ?? ""),
    categoryId: String(category?.id || data.categoryId || ""),
    status: String(data.status || "draft"),
    priority: String(data.priority || "normal"),
    seoTitle: String(data.seoTitle || seo.title || ""),
    seoDescription: String(data.seoDescription || seo.description || ""),
    focusKeyword: String(data.focusKeyword || seo.focusKeyword || ""),
    canonicalUrl: String(data.canonicalUrl || seo.canonical || ""),
    robotsMeta: String(data.robotsMeta || seo.robots || ""),
    ogTitle: String(data.ogTitle || seo.ogTitle || ""),
    ogDescription: String(data.ogDescription || seo.ogDescription || ""),
    ogImage: String(data.ogImage || seo.ogImage || ""),
    tags,
    isFeatured: Boolean(data.isFeatured),
    isBreaking: Boolean(data.isBreaking),
  };
}

export function ArticleEditor({ mode }: { mode: "create" | "edit" }) {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = mode === "edit" ? params.id : null;

  const [form, setForm] = useState<ArticleFormState>(emptyForm);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tagIndex, setTagIndex] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [cats, tags] = await Promise.all([
          adminFetch<{ items: Category[] }>("/api/categories", { allowNotFound: true }),
          adminFetch<{ items: Tag[] }>("/api/tags?pageSize=100", { allowNotFound: true }),
        ]);
        if (cancelled) return;
        setCategories(cats?.items || []);
        setTagIndex(tags?.items || []);
      } catch {
        /* ignore — forms still usable */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (mode !== "edit" || !id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await adminFetch<Record<string, unknown>>(`/api/articles/${id}`);
        if (!cancelled) setForm(mapArticleToForm(data));
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof AdminApiError ? err.message : "Failed to load article");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, id]);

  const title = useMemo(
    () => (mode === "create" ? "New article" : "Edit article"),
    [mode],
  );

  function set<K extends keyof ArticleFormState>(key: K, value: ArticleFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function resolveTagIds(raw: string): string[] {
    const parts = parseCommaList(raw);
    return parts.map((part) => {
      const found = tagIndex.find((t) => t.id === part || t.slug === part || t.name === part);
      return found?.id || part;
    });
  }

  async function save(publish = false) {
    setSaving(true);
    setError(null);
    setMessage(null);
    const payload = {
      title: form.title,
      titleUr: form.titleUr || null,
      slug: form.slug || null,
      excerpt: form.excerpt || null,
      excerptUr: form.excerptUr || null,
      body: form.body || "",
      bodyUr: form.bodyUr || null,
      categoryId: form.categoryId || null,
      status: publish ? "published" : form.status,
      priority: form.priority,
      seoTitle: form.seoTitle || null,
      seoDescription: form.seoDescription || null,
      focusKeyword: form.focusKeyword || null,
      canonicalUrl: form.canonicalUrl || null,
      robotsMeta: form.robotsMeta || null,
      ogTitle: form.ogTitle || null,
      ogDescription: form.ogDescription || null,
      ogImage: form.ogImage || null,
      tagIds: resolveTagIds(form.tags),
      isFeatured: form.isFeatured,
      isBreaking: form.isBreaking,
      ...(publish && mode === "edit" ? { action: "publish" as const } : {}),
    };

    try {
      if (mode === "create") {
        const created = await adminFetch<{ id: string }>("/api/articles", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setMessage("Article created.");
        router.push(`/admin/articles/${created.id}`);
      } else if (id) {
        await adminFetch(`/api/articles/${id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        setMessage(publish ? "Article published." : "Article saved.");
      }
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    await save(false);
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Loading article…</p>;
  }

  return (
    <div>
      <AdminPageHeader
        title={title}
        description="Bilingual news article with SEO and workflow fields."
        actions={
          <Link href="/admin/articles" className="text-sm text-slate-600 hover:text-[#0B7A3B]">
            ← Back to list
          </Link>
        }
      />

      {error ? (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {message}
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="space-y-4">
        <AdminPanel title="Content">
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Title (EN)">
              <TextInput required value={form.title} onChange={(e) => set("title", e.target.value)} />
            </FormField>
            <FormField label="عنوان (اردو)" urdu>
              <TextInput urdu value={form.titleUr} onChange={(e) => set("titleUr", e.target.value)} />
            </FormField>
            <FormField label="Slug" hint="Leave blank to auto-generate from title">
              <TextInput value={form.slug} onChange={(e) => set("slug", e.target.value)} />
            </FormField>
            <FormField label="Category">
              <TextSelect value={form.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
                <option value="">— Select —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nameUr || c.name}
                  </option>
                ))}
              </TextSelect>
            </FormField>
            <FormField label="Excerpt (EN)" className="md:col-span-2">
              <TextTextarea value={form.excerpt} onChange={(e) => set("excerpt", e.target.value)} />
            </FormField>
            <FormField label="خلاصہ (اردو)" urdu className="md:col-span-2">
              <TextTextarea urdu value={form.excerptUr} onChange={(e) => set("excerptUr", e.target.value)} />
            </FormField>
            <FormField label="Body (EN)" className="md:col-span-2">
              <TextTextarea
                className="min-h-[200px]"
                value={form.body}
                onChange={(e) => set("body", e.target.value)}
              />
            </FormField>
            <FormField label="متن (اردو)" urdu className="md:col-span-2">
              <TextTextarea
                urdu
                className="min-h-[200px]"
                value={form.bodyUr}
                onChange={(e) => set("bodyUr", e.target.value)}
              />
            </FormField>
          </div>
        </AdminPanel>

        <AdminPanel title="Publishing">
          <div className="grid gap-4 md:grid-cols-3">
            <FormField label="Status">
              <TextSelect value={form.status} onChange={(e) => set("status", e.target.value)}>
                {ARTICLE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </TextSelect>
            </FormField>
            <FormField label="Priority">
              <TextSelect value={form.priority} onChange={(e) => set("priority", e.target.value)}>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </TextSelect>
            </FormField>
            <FormField label="Tags" hint="Comma-separated ids or slugs">
              <TextInput
                value={form.tags}
                onChange={(e) => set("tags", e.target.value)}
                placeholder="politics, economy"
              />
            </FormField>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.isFeatured}
                onChange={(e) => set("isFeatured", e.target.checked)}
              />
              Featured
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.isBreaking}
                onChange={(e) => set("isBreaking", e.target.checked)}
              />
              Breaking
            </label>
          </div>
        </AdminPanel>

        <AdminPanel title="SEO">
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="SEO title">
              <TextInput value={form.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} />
            </FormField>
            <FormField label="Focus keyword">
              <TextInput
                value={form.focusKeyword}
                onChange={(e) => set("focusKeyword", e.target.value)}
              />
            </FormField>
            <FormField label="SEO description" className="md:col-span-2">
              <TextTextarea
                value={form.seoDescription}
                onChange={(e) => set("seoDescription", e.target.value)}
              />
            </FormField>
            <FormField label="Canonical URL">
              <TextInput
                value={form.canonicalUrl}
                onChange={(e) => set("canonicalUrl", e.target.value)}
              />
            </FormField>
            <FormField label="Robots meta">
              <TextInput
                value={form.robotsMeta}
                onChange={(e) => set("robotsMeta", e.target.value)}
                placeholder="index,follow"
              />
            </FormField>
            <FormField label="OG title">
              <TextInput value={form.ogTitle} onChange={(e) => set("ogTitle", e.target.value)} />
            </FormField>
            <FormField label="OG image URL">
              <TextInput value={form.ogImage} onChange={(e) => set("ogImage", e.target.value)} />
            </FormField>
            <FormField label="OG description" className="md:col-span-2">
              <TextTextarea
                value={form.ogDescription}
                onChange={(e) => set("ogDescription", e.target.value)}
              />
            </FormField>
          </div>
        </AdminPanel>

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-[#0B7A3B] px-4 py-2 text-sm font-medium text-white hover:bg-[#096b33] disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => save(true)}
            className="rounded-md border border-[#0B7A3B] bg-white px-4 py-2 text-sm font-medium text-[#0B7A3B] hover:bg-emerald-50 disabled:opacity-60"
          >
            Publish
          </button>
        </div>
      </form>
    </div>
  );
}
