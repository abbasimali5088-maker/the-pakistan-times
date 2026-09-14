import { NextRequest } from "next/server";
import { z } from "zod";
import { handleApi } from "@/lib/api";
import { can, requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeAudit, enqueueJob } from "@/lib/audit";
import { makeSlug, uniqueSlug } from "@/lib/slug";
import { articlePublicInclude, serializeArticle } from "@/lib/content";

export const runtime = "nodejs";

const patchSchema = z.object({
  title: z.string().min(1).optional(),
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
  action: z
    .enum([
      "publish",
      "unpublish",
      "archive",
      "restore",
      "approve",
      "reject",
      "schedule",
      "duplicate",
      "restore_revision",
    ])
    .optional(),
  revisionId: z.string().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  return handleApi(async () => {
    const { id } = await params;
    const article = await prisma.article.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
        deletedAt: null,
      },
      include: {
        ...articlePublicInclude,
        revisions: { orderBy: { version: "desc" }, take: 20 },
        relationsFrom: { include: { toArticle: { include: articlePublicInclude } } },
      },
    });
    if (!article) throw new Error("Article not found");

    const isPublic = article.status === "published";
    if (!isPublic) await requirePermission("articles", "read");

    if (isPublic) {
      await prisma.article.update({
        where: { id: article.id },
        data: { viewCount: { increment: 1 } },
      });
      await prisma.analyticsEvent.create({
        data: {
          eventType: "article_view",
          articleId: article.id,
          path: `/${article.slug}`,
        },
      });
    }

    return {
      ...serializeArticle(article),
      revisions: article.revisions,
      relations: article.relationsFrom.map((r) => ({
        type: r.relationType,
        article: serializeArticle(r.toArticle),
      })),
    };
  });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  return handleApi(async () => {
    const user = await requirePermission("articles", "update");
    const { id } = await params;
    const body = patchSchema.parse(await req.json());
    const existing = await prisma.article.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new Error("Article not found");

    if (body.action === "duplicate") {
      await requirePermission("articles", "create");
      const slug = uniqueSlug(
        `${existing.slug}-copy`,
        (
          await prisma.article.findMany({
            where: { slug: { startsWith: `${existing.slug}-copy` } },
            select: { slug: true },
          })
        ).map((a) => a.slug),
      );
      const copy = await prisma.article.create({
        data: {
          title: `${existing.title} (Copy)`,
          titleUr: existing.titleUr,
          slug,
          subtitle: existing.subtitle,
          excerpt: existing.excerpt,
          excerptUr: existing.excerptUr,
          body: existing.body,
          bodyUr: existing.bodyUr,
          language: existing.language,
          status: "draft",
          workflowStep: "draft",
          priority: existing.priority,
          categoryId: existing.categoryId,
          authorId: existing.authorId,
          featuredImageId: existing.featuredImageId,
          siteId: existing.siteId,
          createdById: user.id,
          updatedById: user.id,
        },
        include: articlePublicInclude,
      });
      return serializeArticle(copy);
    }

    if (body.action === "restore_revision" && body.revisionId) {
      const rev = await prisma.articleRevision.findFirst({
        where: { id: body.revisionId, articleId: existing.id },
      });
      if (!rev) throw new Error("Revision not found");
      const updated = await prisma.article.update({
        where: { id: existing.id },
        data: {
          title: rev.title,
          body: rev.body,
          excerpt: rev.excerpt,
          updatedById: user.id,
        },
        include: articlePublicInclude,
      });
      return serializeArticle(updated);
    }

    let status = body.status ?? existing.status;
    let workflowStep = body.workflowStep ?? existing.workflowStep;
    let publishedAt = existing.publishedAt;
    let archivedAt = existing.archivedAt;
    let unpublishedAt = existing.unpublishedAt;
    const publishAt = body.publishAt ? new Date(body.publishAt) : existing.publishAt;

    switch (body.action) {
      case "publish":
        if (!can(user, "articles", "publish")) throw new Error("Forbidden");
        status = "published";
        workflowStep = "published";
        publishedAt = new Date();
        break;
      case "unpublish":
        status = "unpublished";
        unpublishedAt = new Date();
        break;
      case "archive":
        status = "archived";
        archivedAt = new Date();
        break;
      case "restore":
        status = "draft";
        archivedAt = null;
        break;
      case "approve":
        if (!can(user, "articles", "approve")) throw new Error("Forbidden");
        status = "scheduled";
        workflowStep = "approval";
        break;
      case "reject":
        if (!can(user, "articles", "reject")) throw new Error("Forbidden");
        status = "rejected";
        workflowStep = "review";
        break;
      case "schedule":
        if (!can(user, "articles", "schedule")) throw new Error("Forbidden");
        status = "scheduled";
        workflowStep = "scheduled";
        break;
    }

    if (body.slug && body.slug !== existing.slug) {
      const slug = makeSlug(body.slug);
      const clash = await prisma.article.findFirst({
        where: { slug, NOT: { id: existing.id } },
      });
      if (clash) throw new Error("Slug already exists");
    }

    if (body.tagIds) {
      await prisma.articleTag.deleteMany({ where: { articleId: existing.id } });
      if (body.tagIds.length) {
        await prisma.articleTag.createMany({
          data: body.tagIds.map((tagId) => ({ articleId: existing.id, tagId })),
        });
      }
    }
    if (body.coAuthorIds) {
      await prisma.articleCoAuthor.deleteMany({ where: { articleId: existing.id } });
      if (body.coAuthorIds.length) {
        await prisma.articleCoAuthor.createMany({
          data: body.coAuthorIds.map((authorId) => ({ articleId: existing.id, authorId })),
        });
      }
    }

    const lastRev = await prisma.articleRevision.findFirst({
      where: { articleId: existing.id },
      orderBy: { version: "desc" },
    });

    const updated = await prisma.article.update({
      where: { id: existing.id },
      data: {
        title: body.title ?? existing.title,
        titleUr: body.titleUr ?? existing.titleUr,
        slug: body.slug ? makeSlug(body.slug) : existing.slug,
        subtitle: body.subtitle ?? existing.subtitle,
        excerpt: body.excerpt ?? existing.excerpt,
        excerptUr: body.excerptUr ?? existing.excerptUr,
        body: body.body ?? existing.body,
        bodyUr: body.bodyUr ?? existing.bodyUr,
        language: body.language ?? existing.language,
        status,
        workflowStep,
        priority: body.priority ?? existing.priority,
        location: body.location ?? existing.location,
        categoryId: body.categoryId === undefined ? existing.categoryId : body.categoryId,
        authorId: body.authorId === undefined ? existing.authorId : body.authorId,
        featuredImageId:
          body.featuredImageId === undefined ? existing.featuredImageId : body.featuredImageId,
        imageCaption: body.imageCaption ?? existing.imageCaption,
        imageCredit: body.imageCredit ?? existing.imageCredit,
        publishAt,
        publishedAt,
        archivedAt,
        unpublishedAt,
        seoTitle: body.seoTitle ?? existing.seoTitle,
        seoDescription: body.seoDescription ?? existing.seoDescription,
        focusKeyword: body.focusKeyword ?? existing.focusKeyword,
        canonicalUrl: body.canonicalUrl ?? existing.canonicalUrl,
        robotsMeta: body.robotsMeta ?? existing.robotsMeta,
        ogTitle: body.ogTitle ?? existing.ogTitle,
        ogDescription: body.ogDescription ?? existing.ogDescription,
        ogImage: body.ogImage ?? existing.ogImage,
        schemaType: body.schemaType ?? existing.schemaType,
        isFeatured: body.isFeatured ?? existing.isFeatured,
        isBreaking: body.isBreaking ?? existing.isBreaking,
        updatedById: user.id,
        revisions: {
          create: {
            version: (lastRev?.version || 0) + 1,
            title: body.title ?? existing.title,
            body: body.body ?? existing.body,
            excerpt: body.excerpt ?? existing.excerpt,
            snapshot: JSON.stringify(body),
            note: body.revisionNote || body.action || "Update",
            userId: user.id,
          },
        },
      },
      include: articlePublicInclude,
    });

    if (status === "scheduled" && publishAt) {
      await enqueueJob("publish_article", { articleId: updated.id }, publishAt);
    }

    await writeAudit({
      userId: user.id,
      action: body.action || "update",
      module: "articles",
      recordId: updated.id,
      oldValue: { status: existing.status },
      newValue: { status: updated.status },
    });

    return serializeArticle(updated);
  });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  return handleApi(async () => {
    const user = await requirePermission("articles", "delete");
    const { id } = await params;
    const hard = new URL(req.url).searchParams.get("hard") === "1";
    const existing = await prisma.article.findUnique({ where: { id } });
    if (!existing) throw new Error("Article not found");

    if (hard) {
      await prisma.article.delete({ where: { id } });
    } else {
      await prisma.article.update({
        where: { id },
        data: { deletedAt: new Date(), status: "archived", updatedById: user.id },
      });
    }
    await writeAudit({
      userId: user.id,
      action: hard ? "hard_delete" : "delete",
      module: "articles",
      recordId: id,
    });
    return { deleted: true };
  });
}
