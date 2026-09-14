import type {
  AdUnit,
  BreakingItem,
  GalleryItem,
  HomepagePayload,
  LiveStory,
  MenuPayload,
  Paginated,
  PublicArticle,
  PublicAuthor,
  PublicCategory,
  PublicTag,
  StaticPage,
  VideoItem,
} from "./public-types";

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  error?: string;
};

function siteBaseUrl() {
  const configured =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
  if (configured) return configured.replace(/\/$/, "");
  const port = process.env.PORT || "4355";
  return `http://127.0.0.1:${port}`;
}

function apiBase() {
  const base = process.env.NEXT_PUBLIC_API_BASE || "/api";
  if (base.startsWith("http")) return base.replace(/\/$/, "");
  return `${siteBaseUrl()}${base.startsWith("/") ? base : `/${base}`}`;
}

export function absoluteUrl(path = "/") {
  if (path.startsWith("http")) return path;
  return `${siteBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

async function publicFetch<T>(
  path: string,
  init?: RequestInit & { fallback?: T },
): Promise<T> {
  const fallback = init?.fallback as T;
  const { fallback: _ignored, ...rest } = init || {};
  void _ignored;
  const url = path.startsWith("http")
    ? path
    : `${apiBase()}${path.startsWith("/") ? path : `/${path}`}`;

  try {
    const res = await fetch(url, {
      ...rest,
      headers: {
        Accept: "application/json",
        ...(rest.headers || {}),
      },
      cache: rest.cache || "no-store",
    });

    if (!res.ok) {
      if (fallback !== undefined) return fallback;
      throw new Error(`API ${res.status} for ${url}`);
    }

    const json = (await res.json()) as ApiEnvelope<T> | T;
    if (json && typeof json === "object" && "success" in (json as object)) {
      const env = json as ApiEnvelope<T>;
      if (!env.success) {
        if (fallback !== undefined) return fallback;
        throw new Error(env.error || "API error");
      }
      return (env.data as T) ?? fallback;
    }
    return json as T;
  } catch {
    if (fallback !== undefined) return fallback;
    throw new Error(`Failed to fetch ${url}`);
  }
}

function qs(params: Record<string, string | number | undefined | null>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

const emptyPage = <T,>(): Paginated<T> => ({
  items: [],
  page: 1,
  pageSize: 20,
  total: 0,
  totalPages: 0,
});

export async function getArticles(params: {
  language?: string;
  category?: string;
  tag?: string;
  authorId?: string;
  page?: number;
  pageSize?: number;
  q?: string;
  priority?: string;
} = {}) {
  return publicFetch<Paginated<PublicArticle>>(
    `/articles${qs({ public: 1, ...params })}`,
    { fallback: emptyPage<PublicArticle>() },
  );
}

export async function getArticle(idOrSlug: string) {
  try {
    return await publicFetch<PublicArticle & { relations?: { type: string; article: PublicArticle }[] }>(
      `/articles/${encodeURIComponent(idOrSlug)}`,
    );
  } catch {
    return null;
  }
}

export async function getCategories() {
  const data = await publicFetch<{ items: PublicCategory[] } | PublicCategory[]>(
    `/categories${qs({ public: 1 })}`,
    { fallback: { items: [] } },
  );
  return Array.isArray(data) ? data : data.items || [];
}

export async function getCategory(slug: string) {
  try {
    return await publicFetch<PublicCategory>(`/categories/${encodeURIComponent(slug)}`);
  } catch {
    const all = await getCategories();
    return all.find((c) => c.slug === slug) || null;
  }
}

export async function getTags(params: { page?: number; q?: string } = {}) {
  const data = await publicFetch<Paginated<PublicTag>>(
    `/tags${qs({ public: 1, ...params })}`,
    { fallback: emptyPage<PublicTag>() },
  );
  return {
    items: data.items || [],
    total: data.total || 0,
    page: data.page || 1,
    pageSize: data.pageSize || 20,
    totalPages: data.totalPages || 0,
  };
}

export async function getTag(slug: string) {
  try {
    return await publicFetch<PublicTag>(`/tags/${encodeURIComponent(slug)}`);
  } catch {
    const tags = await getTags({ q: slug });
    return tags.items.find((t) => t.slug === slug) || null;
  }
}

export async function getAuthors(params: { page?: number } = {}) {
  return publicFetch<Paginated<PublicAuthor>>(
    `/authors${qs({ public: 1, ...params })}`,
    { fallback: emptyPage<PublicAuthor>() },
  );
}

export async function getAuthor(slug: string) {
  try {
    return await publicFetch<PublicAuthor>(`/authors/${encodeURIComponent(slug)}`);
  } catch {
    return null;
  }
}

export async function getBreaking() {
  const data = await publicFetch<{ items: BreakingItem[] } | BreakingItem[]>(
    `/breaking${qs({ public: 1 })}`,
    { fallback: { items: [] } },
  );
  return Array.isArray(data) ? data : data.items || [];
}

export async function getMenus(location = "main") {
  const data = await publicFetch<{ items: MenuPayload[] } | MenuPayload | MenuPayload[]>(
    `/menus${qs({ location, public: 1 })}`,
    { fallback: { items: [] } },
  );
  if (Array.isArray(data)) return data[0] || null;
  if (data && "items" in data && Array.isArray((data as { items: unknown }).items)) {
    const items = (data as { items: MenuPayload[] }).items;
    if (items[0] && "location" in items[0]) return items[0];
    return {
      id: "main",
      name: "Main",
      location,
      items: items as unknown as MenuPayload["items"],
    };
  }
  return (data as MenuPayload) || null;
}

export async function getHomepage() {
  return publicFetch<HomepagePayload>(`/homepage${qs({ public: 1 })}`, {
    fallback: { blocks: [], sections: {} },
  });
}

export async function getPage(slug: string) {
  try {
    return await publicFetch<StaticPage>(
      `/pages/${encodeURIComponent(slug)}${qs({ public: 1 })}`,
    );
  } catch {
    try {
      const list = await publicFetch<{ items: StaticPage[] } | StaticPage[]>(
        `/pages${qs({ slug, public: 1 })}`,
        { fallback: { items: [] } },
      );
      const items = Array.isArray(list) ? list : list.items || [];
      return items.find((p) => p.slug === slug) || null;
    } catch {
      return null;
    }
  }
}

export async function getSearch(q: string, page = 1) {
  if (!q.trim()) return emptyPage<PublicArticle>();
  // Public search page needs full article cards; use articles API (paginated).
  return getArticles({ q, page });
}

export async function getLiveStories() {
  const data = await publicFetch<{ items: LiveStory[] } | LiveStory[]>(
    `/live${qs({ public: 1 })}`,
    { fallback: { items: [] } },
  );
  return Array.isArray(data) ? data : data.items || [];
}

export async function getLiveStory(idOrSlug: string) {
  try {
    return await publicFetch<LiveStory>(`/live/${encodeURIComponent(idOrSlug)}`);
  } catch {
    return null;
  }
}

export async function getVideos(params: { page?: number } = {}) {
  return publicFetch<Paginated<VideoItem>>(`/videos${qs({ public: 1, ...params })}`, {
    fallback: emptyPage<VideoItem>(),
  });
}

export async function getVideo(slug: string) {
  try {
    return await publicFetch<VideoItem>(`/videos/${encodeURIComponent(slug)}`);
  } catch {
    return null;
  }
}

export async function getGalleries(params: { page?: number } = {}) {
  return publicFetch<Paginated<GalleryItem>>(`/galleries${qs({ public: 1, ...params })}`, {
    fallback: emptyPage<GalleryItem>(),
  });
}

export async function getGallery(slug: string) {
  try {
    return await publicFetch<GalleryItem>(`/galleries/${encodeURIComponent(slug)}`);
  } catch {
    return null;
  }
}

export async function getAd(unitKey: string) {
  try {
    return await publicFetch<AdUnit | null>(`/ads${qs({ unitKey, public: 1 })}`, {
      fallback: null,
    });
  } catch {
    return null;
  }
}
