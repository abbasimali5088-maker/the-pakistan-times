import { NextRequest } from "next/server";
import { z } from "zod";
import { getPagination, handleApi } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  return handleApi(async () => {
    await requirePermission("seo", "read");
    const url = new URL(req.url);
    const resolved = url.searchParams.get("resolved");
    const severity = url.searchParams.get("severity");
    const { skip, take, page, pageSize } = getPagination(url);
    const where = {
      resolved: resolved === "1" ? true : resolved === "0" ? false : undefined,
      severity: severity || undefined,
    };
    const [total, items] = await Promise.all([
      prisma.seoAuditIssue.count({ where }),
      prisma.seoAuditIssue.findMany({
        where,
        orderBy: [{ resolved: "asc" }, { createdAt: "desc" }],
        skip,
        take,
      }),
    ]);
    return { items, total, page, pageSize };
  });
}

export async function POST(req: NextRequest) {
  return handleApi(async () => {
    const user = await requirePermission("seo", "manage");
    const body = z
      .object({
        articleIds: z.array(z.string()).optional(),
        limit: z.number().int().optional(),
      })
      .parse(await req.json().catch(() => ({})));

    const articles = await prisma.article.findMany({
      where: {
        deletedAt: null,
        ...(body.articleIds?.length ? { id: { in: body.articleIds } } : {}),
      },
      take: body.limit ?? 100,
      orderBy: { updatedAt: "desc" },
    });

    const created = [];
    for (const article of articles) {
      await prisma.seoAuditIssue.updateMany({
        where: { entityType: "article", entityId: article.id, resolved: false },
        data: { resolved: true },
      });

      const issues: Array<{ issueCode: string; severity: string; message: string }> = [];
      if (!article.seoTitle || article.seoTitle.length < 10) {
        issues.push({
          issueCode: "missing_seo_title",
          severity: "warning",
          message: "SEO title missing or too short",
        });
      }
      if (!article.seoDescription || article.seoDescription.length < 50) {
        issues.push({
          issueCode: "missing_seo_description",
          severity: "warning",
          message: "SEO description missing or too short",
        });
      }
      if (!article.focusKeyword) {
        issues.push({
          issueCode: "missing_focus_keyword",
          severity: "info",
          message: "Focus keyword not set",
        });
      }
      if (!article.featuredImageId && !article.ogImage) {
        issues.push({
          issueCode: "missing_og_image",
          severity: "warning",
          message: "No featured or OG image",
        });
      }
      if (article.title.length > 80) {
        issues.push({
          issueCode: "title_too_long",
          severity: "info",
          message: "Title exceeds 80 characters",
        });
      }

      for (const issue of issues) {
        const row = await prisma.seoAuditIssue.create({
          data: {
            entityType: "article",
            entityId: article.id,
            issueCode: issue.issueCode,
            severity: issue.severity,
            message: issue.message,
          },
        });
        created.push(row);
      }
    }

    await writeAudit({
      userId: user.id,
      action: "run_audit",
      module: "seo",
      newValue: { articles: articles.length, issues: created.length },
    });
    return { audited: articles.length, issues: created };
  });
}
