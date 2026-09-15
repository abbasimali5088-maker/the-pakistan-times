import { prisma } from "./db";
import { articlePublicInclude, serializeArticle } from "./content";
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

/** Public/canonical site URL (SEO, OG, absolute links). */
function siteBaseUrl() {
  const configured =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
  if (configured) return configured.replace(/\/$/, "");
  const port = process.env.PORT || "4355";
  return `http://127.0.0.1:${port}`;
}

/**
 * Base URL for rare HTTP fallbacks. Prefer this deployment's VERCEL_URL
 * so a mis-set NEXT_PUBLIC_SITE_URL cannot break reads.
 */
function internalBaseUrl() {
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`.replace(/\/$/, "");
  }
  return siteBaseUrl();
}

function apiBase() {
  const base = process.env.NEXT_PUBLIC_API_BASE || "/api";
  if (base.startsWith("http")) return base.replace(/\/$/, "");
  return `${internalBaseUrl()}${base.startsWith("/") ? base : `/${base}`}`;
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

function publishedWhere() {
  return {
    deletedAt: null,
    status: "published",
    OR: [{ publishAt: null }, { publishAt: { lte: new Date() } }],
  } as const;
}

function mapCategory(c: {
  id: string;
  name: string;
  nameUr: string | null;
  slug: string;
  parentId?: string | null;
  description?: string | null;
}): PublicCategory & { parentId?: string | null } {
  return {
    id: c.id,
    name: c.nameUr || c.name,
    nameUr: c.nameUr || c.name,
    nameEn: c.name,
    slug: c.slug,
    parentId: c.parentId ?? null,
    description: c.description ?? null,
  };
}

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
  try {
    const page = Math.max(1, Number(params.page) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(params.pageSize) || 20));
    const skip = (page - 1) * pageSize;
    const where: Record<string, unknown> = { ...publishedWhere() };
    if (params.category) where.category = { slug: params.category };
    if (params.language) where.language = params.language;
    if (params.priority) where.priority = params.priority;
    if (params.authorId) where.authorId = params.authorId;
    if (params.tag) where.tags = { some: { tag: { slug: params.tag } } };
    if (params.q) {
      where.AND = [
        {
          OR: [
            { title: { contains: params.q, mode: "insensitive" } },
            { titleUr: { contains: params.q, mode: "insensitive" } },
            { excerpt: { contains: params.q, mode: "insensitive" } },
            { excerptUr: { contains: params.q, mode: "insensitive" } },
            { body: { contains: params.q, mode: "insensitive" } },
            { bodyUr: { contains: params.q, mode: "insensitive" } },
            { slug: { contains: params.q, mode: "insensitive" } },
          ],
        },
      ];
    }

    const [total, rows] = await Promise.all([
      prisma.article.count({ where }),
      prisma.article.findMany({
        where,
        include: articlePublicInclude,
        orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
        skip,
        take: pageSize,
      }),
    ]);

    return {
      items: rows.map(serializeArticle) as PublicArticle[],
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  } catch {
    return emptyPage<PublicArticle>();
  }
}

export async function getArticle(idOrSlug: string) {
  try {
    const article = await prisma.article.findFirst({
      where: {
        AND: [
          { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
          { deletedAt: null },
          { status: "published" },
          { OR: [{ publishAt: null }, { publishAt: { lte: new Date() } }] },
        ],
      },
      include: {
        ...articlePublicInclude,
        relationsFrom: {
          include: { toArticle: { include: articlePublicInclude } },
          take: 6,
        },
      },
    });
    if (!article) return null;
    const base = serializeArticle(article) as PublicArticle & {
      relations?: { type: string; article: PublicArticle }[];
    };
    const relations = (article.relationsFrom || [])
      .filter((r) => r.toArticle)
      .map((r) => ({
        type: r.relationType,
        article: serializeArticle(r.toArticle) as PublicArticle,
      }));
    if (relations.length) base.relations = relations;
    return base;
  } catch {
    return null;
  }
}

export async function getCategories() {
  try {
    const items = await prisma.category.findMany({
      where: { status: "active" },
      orderBy: { sortOrder: "asc" },
    });
    return items.map(mapCategory);
  } catch {
    return [];
  }
}

export async function getCategory(slug: string) {
  try {
    const c = await prisma.category.findFirst({
      where: { slug, status: "active" },
    });
    return c ? mapCategory(c) : null;
  } catch {
    return null;
  }
}

export async function getTags(params: { page?: number; q?: string } = {}) {
  try {
    const page = Math.max(1, Number(params.page) || 1);
    const pageSize = 20;
    const skip = (page - 1) * pageSize;
    const where = params.q
      ? {
          OR: [
            { name: { contains: params.q, mode: "insensitive" as const } },
            { slug: { contains: params.q, mode: "insensitive" as const } },
          ],
        }
      : {};
    const [total, rows] = await Promise.all([
      prisma.tag.count({ where }),
      prisma.tag.findMany({ where, orderBy: { name: "asc" }, skip, take: pageSize }),
    ]);
    return {
      items: rows.map((t) => ({ id: t.id, name: t.name, slug: t.slug })) as PublicTag[],
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  } catch {
    return emptyPage<PublicTag>();
  }
}

export async function getTag(slug: string) {
  try {
    const t = await prisma.tag.findFirst({ where: { slug } });
    return t ? ({ id: t.id, name: t.name, slug: t.slug } as PublicTag) : null;
  } catch {
    return null;
  }
}

export async function getAuthors(params: { page?: number } = {}) {
  try {
    const page = Math.max(1, Number(params.page) || 1);
    const pageSize = 20;
    const skip = (page - 1) * pageSize;
    const [total, rows] = await Promise.all([
      prisma.author.count(),
      prisma.author.findMany({
        orderBy: { name: "asc" },
        skip,
        take: pageSize,
      }),
    ]);
    return {
      items: rows.map((a) => ({
        id: a.id,
        name: a.name,
        slug: a.slug,
        photoUrl: a.photoUrl,
        bio: a.bio,
        position: a.position,
      })) as PublicAuthor[],
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  } catch {
    return emptyPage<PublicAuthor>();
  }
}

export async function getAuthor(slug: string) {
  try {
    const a = await prisma.author.findFirst({ where: { slug } });
    if (!a) return null;
    return {
      id: a.id,
      name: a.name,
      slug: a.slug,
      photoUrl: a.photoUrl,
      bio: a.bio,
      position: a.position,
    } as PublicAuthor;
  } catch {
    return null;
  }
}

export async function getBreaking() {
  try {
    const now = new Date();
    const items = await prisma.breakingNews.findMany({
      where: {
        status: "active",
        AND: [
          { OR: [{ startAt: null }, { startAt: { lte: now } }] },
          { OR: [{ endAt: null }, { endAt: { gte: now } }] },
        ],
      },
      include: {
        article: { select: { id: true, title: true, slug: true } },
      },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      take: 20,
    });
    return items.map((b) => ({
      id: b.id,
      headline: b.headlineUr || b.headline,
      headlineUr: b.headlineUr || b.headline,
      headlineEn: b.headline,
      priority: b.priority,
      article: b.article,
      href: b.article?.slug ? `/${b.article.slug}` : undefined,
    })) as BreakingItem[];
  } catch {
    return [];
  }
}

export async function getMenus(location = "main") {
  try {
    const menu = await prisma.menu.findFirst({
      where: { location, status: "active" },
      include: {
        items: {
          where: { status: "active" },
          orderBy: { sortOrder: "asc" },
        },
      },
    });
    if (!menu) return null;
    return {
      id: menu.id,
      name: menu.name,
      location: menu.location,
      items: menu.items.map((it) => ({
        id: it.id,
        label: it.labelUr || it.label,
        labelUr: it.labelUr || it.label,
        labelEn: it.label,
        url: it.url,
        target: it.target,
        parentId: it.parentId,
        sortOrder: it.sortOrder,
      })),
    } as MenuPayload;
  } catch {
    return null;
  }
}

export async function getHomepage() {
  try {
    const now = new Date();
    const items = await prisma.homepageBlock.findMany({
      where: {
        isVisible: true,
        AND: [
          { OR: [{ startAt: null }, { startAt: { lte: now } }] },
          { OR: [{ endAt: null }, { endAt: { gte: now } }] },
        ],
      },
      include: { article: { include: articlePublicInclude } },
      orderBy: [{ sectionKey: "asc" }, { sortOrder: "asc" }, { priority: "desc" }],
    });
    const blocks = items.map((b) => ({
      id: b.id,
      sectionKey: b.sectionKey,
      title: b.title,
      sortOrder: b.sortOrder,
      priority: b.priority,
      isVisible: b.isVisible,
      configJson: b.configJson,
      article: b.article ? (serializeArticle(b.article) as PublicArticle) : null,
    }));
    const sections: Record<string, typeof blocks> = {};
    for (const block of blocks) {
      (sections[block.sectionKey] ||= []).push(block);
    }
    return { blocks, sections } as HomepagePayload;
  } catch {
    return { blocks: [], sections: {} };
  }
}

export async function getPage(slug: string) {
  try {
    const page = await prisma.staticPage.findFirst({
      where: { slug, status: "published" },
    });
    if (!page) return null;
    return {
      id: page.id,
      title: page.title,
      slug: page.slug,
      body: page.bodyUr || page.body,
      bodyUr: page.bodyUr || page.body,
      status: page.status,
      seoTitle: page.seoTitle,
      seoDescription: page.seoDescription,
    } as StaticPage;
  } catch {
    return null;
  }
}

export async function getSearch(q: string, page = 1) {
  if (!q.trim()) return emptyPage<PublicArticle>();
  return getArticles({ q, page });
}

export async function getLiveStories() {
  try {
    const items = await prisma.liveStory.findMany({
      where: { status: { in: ["live", "published", "active"] } },
      include: { category: true },
      orderBy: { updatedAt: "desc" },
      take: 30,
    });
    return items.map((s) => ({
      id: s.id,
      title: s.title,
      slug: s.slug,
      description: s.description,
      status: s.status,
      startAt: s.startAt,
      endAt: s.endAt,
      category: s.category ? mapCategory(s.category) : null,
    })) as LiveStory[];
  } catch {
    return [];
  }
}

export async function getLiveStory(idOrSlug: string) {
  try {
    const s = await prisma.liveStory.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
      include: {
        category: true,
        updates: { orderBy: { publishedAt: "desc" }, take: 100 },
      },
    });
    if (!s) return null;
    return {
      id: s.id,
      title: s.title,
      slug: s.slug,
      description: s.description,
      status: s.status,
      startAt: s.startAt,
      endAt: s.endAt,
      category: s.category ? mapCategory(s.category) : null,
      updates: s.updates.map((u) => ({
        id: u.id,
        body: u.body,
        type: u.type,
        mediaUrl: u.mediaUrl,
        quote: u.quote,
        location: u.location,
        isPinned: u.isPinned,
        isImportant: u.isImportant,
        publishedAt: u.publishedAt,
      })),
    } as LiveStory;
  } catch {
    return null;
  }
}

export async function getVideos(params: { page?: number } = {}) {
  try {
    const page = Math.max(1, Number(params.page) || 1);
    const pageSize = 12;
    const skip = (page - 1) * pageSize;
    const where = { status: "published" };
    const [total, rows] = await Promise.all([
      prisma.video.count({ where }),
      prisma.video.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip,
        take: pageSize,
      }),
    ]);
    return {
      items: rows.map((v) => ({
        id: v.id,
        title: v.title,
        slug: v.slug,
        description: v.description,
        thumbnail: v.thumbnail,
        url: v.url,
        duration: v.duration,
        provider: v.provider,
        status: v.status,
      })) as VideoItem[],
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  } catch {
    return emptyPage<VideoItem>();
  }
}

export async function getVideo(slug: string) {
  try {
    const v = await prisma.video.findFirst({
      where: { slug, status: "published" },
    });
    if (!v) return null;
    return {
      id: v.id,
      title: v.title,
      slug: v.slug,
      description: v.description,
      thumbnail: v.thumbnail,
      url: v.url,
      duration: v.duration,
      provider: v.provider,
      status: v.status,
    } as VideoItem;
  } catch {
    return null;
  }
}

export async function getGalleries(params: { page?: number } = {}) {
  try {
    const page = Math.max(1, Number(params.page) || 1);
    const pageSize = 12;
    const skip = (page - 1) * pageSize;
    const where = { status: "published" };
    const [total, rows] = await Promise.all([
      prisma.gallery.count({ where }),
      prisma.gallery.findMany({
        where,
        include: { _count: { select: { items: true } } },
        orderBy: { updatedAt: "desc" },
        skip,
        take: pageSize,
      }),
    ]);
    return {
      items: rows.map((g) => ({
        id: g.id,
        title: g.title,
        slug: g.slug,
        description: g.description,
        coverUrl: g.coverUrl,
        status: g.status,
      })) as GalleryItem[],
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  } catch {
    return emptyPage<GalleryItem>();
  }
}

export async function getGallery(slug: string) {
  try {
    const g = await prisma.gallery.findFirst({
      where: { slug, status: "published" },
      include: {
        items: { include: { media: true }, orderBy: { sortOrder: "asc" } },
      },
    });
    if (!g) return null;
    return {
      id: g.id,
      title: g.title,
      slug: g.slug,
      description: g.description,
      coverUrl: g.coverUrl,
      status: g.status,
      items: g.items.map((img) => ({
        id: img.id,
        imageUrl: img.imageUrl || img.media?.url || "",
        caption: img.caption,
        credit: img.credit,
      })),
    } as GalleryItem;
  } catch {
    return null;
  }
}

export async function getAd(unitKey: string) {
  try {
    const now = new Date();
    const ad = await prisma.advertisement.findFirst({
      where: {
        unitKey,
        status: "active",
        AND: [
          { OR: [{ startAt: null }, { startAt: { lte: now } }] },
          { OR: [{ endAt: null }, { endAt: { gte: now } }] },
        ],
      },
      orderBy: { priority: "desc" },
    });
    if (!ad) return null;
    return {
      id: ad.id,
      unitKey: ad.unitKey,
      name: ad.name,
      code: ad.code,
      imageUrl: ad.imageUrl,
      targetUrl: ad.targetUrl,
    } as AdUnit;
  } catch {
    return null;
  }
}

// Keep HTTP helper available for rare client-adjacent callers
export { publicFetch, qs };
