import { NextRequest } from "next/server";
import { z } from "zod";
import { handleApi, getPagination } from "@/lib/api";
import { requirePermission, can } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { makeSlug, uniqueSlug } from "@/lib/slug";
import { articlePublicInclude, serializeArticle } from "@/lib/content";
import { enqueueJob } from "@/lib/audit";

export const runtime = "nodejs";

const articleSchema = z.object({
  title: z.string().min(1),
  titleUr: z.string().optional().nullable(),
  slug: z.string().optional().nullable(),
  subtitle: z.string().optional().nullable(),
  excerpt: z.string().optional().nullable(),
  excerptUr: z.string().optional().nullable(),
  body: z.string().optional().nullable(),
  bodyUr: z.string().optional().nullable(),
  language: z.string().optional(),
  status: z.string().optional(),
  workflowStep: z.string().optional(),
  priority: z.string().optional(),
  location: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  authorId: z.string().optional().nullable(),
  featuredImageId: z.string().optional().nullable(),
  imageCaption: z.string().optional().nullable(),
  imageCredit: z.string().optional().nullable(),
  publishAt: z.string().optional().nullable(),
  seoTitle: z.string().optional().nullable(),
  seoDescription: z.string().optional().nullable(),
  focusKeyword: z.string().optional().nullable(),
  canonicalUrl: z.string().optional().nullable(),
  robotsMeta: z.string().optional().nullable(),
  ogTitle: z.string().optional().nullable(),
  ogDescription: z.string().optional().nullable(),
  ogImage: z.string().optional().nullable(),
  schemaType: z.string().optional(),
  tagIds: z.array(z.string()).optional(),
  coAuthorIds: z.array(z.string()).optional(),
  isFeatured: z.boolean().optional(),
  isBreaking: z.boolean().optional(),
  revisionNote: z.string().optional().nullable(),
  siteId: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  return handleApi(async () => {
    const url = new URL(req.url);
    const { page, pageSize, skip, take } = getPagination(url);
    const status = url.searchParams.get("status");
    const category = url.searchParams.get("category");
    const q = url.searchParams.get("q");
    const publicOnly = url.searchParams.get("public") === "1";
    const language = url.searchParams.get("language");
    const priority = url.searchParams.get("priority");
    const authorId = url.searchParams.get("authorId");
    const tag = url.searchParams.get("tag");

    if (!publicOnly) {
      await requirePermission("articles", "read");
    }

    const where: Record<string, unknown> = {
      deletedAt: null,
    };
    if (publicOnly) {
      where.status = "published";
      where.OR = [
        { publishAt: null },
        { publishAt: { lte: new Date() } },
      ];
    } else if (status) {
      where.status = status;
    }
    if (category) {
      where.category = { slug: category };
    }
    if (language) where.language = language;
    if (priority) where.priority = priority;
    if (authorId) where.authorId = authorId;
    if (tag) where.tags = { some: { tag: { slug: tag } } };
    if (q) {
      const searchOr = {
        OR: [
          { title: { contains: q, mode: "insensitive" as const } },
          { titleUr: { contains: q, mode: "insensitive" as const } },
          { excerpt: { contains: q, mode: "insensitive" as const } },
          { excerptUr: { contains: q, mode: "insensitive" as const } },
          { body: { contains: q, mode: "insensitive" as const } },
          { bodyUr: { contains: q, mode: "insensitive" as const } },
          { slug: { contains: q, mode: "insensitive" as const } },
          { focusKeyword: { contains: q, mode: "insensitive" as const } },
        ],
      };
      where.AND = Array.isArray(where.AND)
        ? [...(where.AND as unknown[]), searchOr]
        : [searchOr];
    }

    const [total, rows] = await Promise.all([
      prisma.article.count({ where }),
      prisma.article.findMany({
        where,
        include: articlePublicInclude,
        orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
        skip,
        take,
      }),
    ]);

    return {
      items: rows.map(serializeArticle),
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  });
}

export async function POST(req: NextRequest) {
  return handleApi(async () => {
    const user = await requirePermission("articles", "create");
    const body = articleSchema.parse(await req.json());
    const baseSlug = makeSlug(body.slug || body.title);
    const existing = await prisma.article.findMany({
      where: { slug: { startsWith: baseSlug } },
      select: { slug: true },
    });
    const slug = uniqueSlug(
      baseSlug,
      existing.map((e) => e.slug),
    );

    const status = body.status || "draft";
    if (status === "published" && !can(user, "articles", "publish")) {
      throw new Error("Missing publish permission");
    }

    const publishAt = body.publishAt ? new Date(body.publishAt) : null;
    const article = await prisma.article.create({
      data: {
        title: body.title,
        titleUr: body.titleUr,
        slug,
        subtitle: body.subtitle,
        excerpt: body.excerpt,
        excerptUr: body.excerptUr,
        body: body.body || "",
        bodyUr: body.bodyUr,
        language: body.language || "ur",
        status,
        workflowStep: body.workflowStep || (status === "published" ? "published" : "draft"),
        priority: body.priority || "normal",
        location: body.location,
        categoryId: body.categoryId,
        authorId: body.authorId,
        featuredImageId: body.featuredImageId,
        imageCaption: body.imageCaption,
        imageCredit: body.imageCredit,
        publishAt,
        publishedAt: status === "published" ? publishAt || new Date() : null,
        seoTitle: body.seoTitle,
        seoDescription: body.seoDescription,
        focusKeyword: body.focusKeyword,
        canonicalUrl: body.canonicalUrl,
        robotsMeta: body.robotsMeta,
        ogTitle: body.ogTitle,
        ogDescription: body.ogDescription,
        ogImage: body.ogImage,
        schemaType: body.schemaType || "NewsArticle",
        isFeatured: body.isFeatured || false,
        isBreaking: body.isBreaking || false,
        siteId: body.siteId,
        createdById: user.id,
        updatedById: user.id,
        tags: body.tagIds?.length
          ? { create: body.tagIds.map((tagId) => ({ tagId })) }
          : undefined,
        coAuthors: body.coAuthorIds?.length
          ? { create: body.coAuthorIds.map((authorId) => ({ authorId })) }
          : undefined,
        revisions: {
          create: {
            version: 1,
            title: body.title,
            body: body.body || "",
            excerpt: body.excerpt,
            snapshot: JSON.stringify(body),
            note: body.revisionNote || "Created",
            userId: user.id,
          },
        },
      },
      include: articlePublicInclude,
    });

    if (body.tagIds?.length) {
      await prisma.tag.updateMany({
        where: { id: { in: body.tagIds } },
        data: { usageCount: { increment: 1 } },
      });
    }

    if (status === "scheduled" && publishAt) {
      await enqueueJob("publish_article", { articleId: article.id }, publishAt);
    }

    await writeAudit({
      userId: user.id,
      action: "create",
      module: "articles",
      recordId: article.id,
      newValue: { title: article.title, status: article.status },
      ip: req.headers.get("x-forwarded-for"),
      userAgent: req.headers.get("user-agent"),
    });

    return serializeArticle(article);
  });
}
