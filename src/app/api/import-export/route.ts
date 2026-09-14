import { NextRequest } from "next/server";
import { z } from "zod";
import { handleApi } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { articlePublicInclude, serializeArticle } from "@/lib/content";
import { makeSlug, uniqueSlug } from "@/lib/slug";

export const runtime = "nodejs";

const importSchema = z.object({
  format: z.enum(["json"]).default("json"),
  articles: z
    .array(
      z.object({
        title: z.string().min(1),
        titleUr: z.string().optional().nullable(),
        slug: z.string().optional().nullable(),
        excerpt: z.string().optional().nullable(),
        excerptUr: z.string().optional().nullable(),
        body: z.string().optional().nullable(),
        bodyUr: z.string().optional().nullable(),
        language: z.string().optional(),
        status: z.string().optional(),
        categorySlug: z.string().optional().nullable(),
      }),
    )
    .optional(),
});

export async function POST(req: NextRequest) {
  return handleApi(async () => {
    const url = new URL(req.url);
    const mode = url.searchParams.get("mode") || "export";
    const user = await requirePermission(
      "import_export",
      mode === "import" ? "import" : "export",
    );

    if (mode === "export") {
      const type = url.searchParams.get("type") || "articles";
      if (type === "categories") {
        const items = await prisma.category.findMany({ orderBy: { sortOrder: "asc" } });
        return { type, format: "json", items };
      }
      if (type === "tags") {
        const items = await prisma.tag.findMany({ orderBy: { name: "asc" } });
        return { type, format: "json", items };
      }
      if (type === "users") {
        const items = await prisma.user.findMany({
          where: { deletedAt: null },
          select: {
            id: true,
            email: true,
            username: true,
            name: true,
            status: true,
            createdAt: true,
            roles: { include: { role: true } },
          },
        });
        return {
          type,
          format: "json",
          items: items.map((u) => ({
            ...u,
            roles: u.roles.map((r) => r.role.slug),
          })),
        };
      }

      const articles = await prisma.article.findMany({
        where: { deletedAt: null },
        include: articlePublicInclude,
        orderBy: { updatedAt: "desc" },
        take: 1000,
      });
      await writeAudit({
        userId: user.id,
        action: "export",
        module: "import_export",
        newValue: { type: "articles", count: articles.length },
      });
      return {
        type: "articles",
        format: "json",
        items: articles.map(serializeArticle),
      };
    }

    const body = importSchema.parse(await req.json());
    let created = 0;
    for (const item of body.articles || []) {
      const base = makeSlug(item.slug || item.title);
      const existing = await prisma.article.findMany({
        where: { slug: { startsWith: base } },
        select: { slug: true },
      });
      const slug = uniqueSlug(
        base,
        existing.map((e) => e.slug),
      );
      let categoryId: string | null = null;
      if (item.categorySlug) {
        const cat = await prisma.category.findFirst({ where: { slug: item.categorySlug } });
        categoryId = cat?.id || null;
      }
      await prisma.article.create({
        data: {
          title: item.title,
          titleUr: item.titleUr,
          slug,
          excerpt: item.excerpt,
          excerptUr: item.excerptUr,
          body: item.body || "",
          bodyUr: item.bodyUr,
          language: item.language || "ur",
          status: item.status || "draft",
          categoryId,
          createdById: user.id,
          updatedById: user.id,
        },
      });
      created += 1;
    }

    await writeAudit({
      userId: user.id,
      action: "import",
      module: "import_export",
      newValue: { created },
    });

    return { imported: created };
  });
}
