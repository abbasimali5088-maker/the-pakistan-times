import { prisma } from "./db";

export const articlePublicInclude = {
  category: true,
  author: true,
  featuredImage: true,
  tags: { include: { tag: true } },
  coAuthors: { include: { author: true } },
} as const;

export async function getSettingMap(siteId?: string | null) {
  const rows = await prisma.setting.findMany({
    where: siteId ? { siteId } : undefined,
  });
  const map: Record<string, Record<string, string>> = {};
  for (const row of rows) {
    map[row.group] ||= {};
    map[row.group][row.key] = row.value;
  }
  return map;
}

export async function getDefaultSite() {
  return (
    (await prisma.site.findFirst({ where: { isDefault: true } })) ||
    (await prisma.site.findFirst())
  );
}

export function serializeArticle(article: {
  id: string;
  title: string;
  titleUr: string | null;
  slug: string;
  subtitle: string | null;
  excerpt: string | null;
  excerptUr: string | null;
  body: string;
  bodyUr: string | null;
  language: string;
  status: string;
  priority: string;
  location: string | null;
  imageCaption: string | null;
  imageCredit: string | null;
  publishAt: Date | null;
  publishedAt: Date | null;
  updatedAt: Date;
  viewCount: number;
  isFeatured: boolean;
  isBreaking: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  focusKeyword: string | null;
  canonicalUrl: string | null;
  robotsMeta: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  schemaType: string;
  category?: { id: string; name: string; nameUr: string | null; slug: string } | null;
  author?: { id: string; name: string; slug: string; photoUrl: string | null; bio: string | null; position: string | null } | null;
  featuredImage?: { id: string; url: string; alt: string | null; caption: string | null; credit: string | null; width: number | null; height: number | null } | null;
  tags?: { tag: { id: string; name: string; slug: string } }[];
  coAuthors?: { author: { id: string; name: string; slug: string } }[];
}) {
  return {
    id: article.id,
    title: article.titleUr || article.title,
    titleUr: article.titleUr || article.title,
    titleEn: article.title,
    slug: article.slug,
    subtitle: article.subtitle,
    excerpt: article.excerptUr || article.excerpt,
    excerptUr: article.excerptUr || article.excerpt,
    excerptEn: article.excerpt,
    body: article.bodyUr || article.body,
    bodyUr: article.bodyUr || article.body,
    bodyEn: article.body,
    language: article.language,
    status: article.status,
    priority: article.priority,
    location: article.location,
    imageCaption: article.imageCaption || article.featuredImage?.caption,
    imageCredit: article.imageCredit || article.featuredImage?.credit,
    publishAt: article.publishAt,
    publishedAt: article.publishedAt,
    updatedAt: article.updatedAt,
    viewCount: article.viewCount,
    isFeatured: article.isFeatured,
    isBreaking: article.isBreaking,
    seo: {
      title: article.seoTitle,
      description: article.seoDescription,
      focusKeyword: article.focusKeyword,
      canonical: article.canonicalUrl,
      robots: article.robotsMeta,
      ogTitle: article.ogTitle,
      ogDescription: article.ogDescription,
      ogImage: article.ogImage || article.featuredImage?.url,
      schemaType: article.schemaType,
    },
    category: article.category
      ? {
          id: article.category.id,
          name: article.category.nameUr || article.category.name,
          nameUr: article.category.nameUr || article.category.name,
          nameEn: article.category.name,
          slug: article.category.slug,
        }
      : null,
    author: article.author
      ? {
          id: article.author.id,
          name: article.author.name,
          slug: article.author.slug,
          photoUrl: article.author.photoUrl,
          bio: article.author.bio,
          position: article.author.position,
        }
      : null,
    image: article.featuredImage
      ? {
          id: article.featuredImage.id,
          url: article.featuredImage.url,
          alt: article.featuredImage.alt,
          width: article.featuredImage.width,
          height: article.featuredImage.height,
        }
      : null,
    tags: (article.tags || []).map((t) => ({
      id: t.tag.id,
      name: t.tag.name,
      slug: t.tag.slug,
    })),
    coAuthors: (article.coAuthors || []).map((c) => ({
      id: c.author.id,
      name: c.author.name,
      slug: c.author.slug,
    })),
    href: `/${article.slug}`,
  };
}
