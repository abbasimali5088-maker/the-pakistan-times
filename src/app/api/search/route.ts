import { NextRequest } from "next/server";
import { handleApi } from "@/lib/api";
import { can, getSessionUser, requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  return handleApi(async () => {
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").trim();
    if (!q) throw new Error("q is required");
    const publicOnly = url.searchParams.get("public") === "1";
    const limit = Math.min(20, Math.max(1, Number(url.searchParams.get("limit") || 10)));

    if (!publicOnly) {
      await requirePermission("search", "read");
    }

    const user = publicOnly ? null : await getSessionUser();
    const includeUsers = !publicOnly && can(user, "users", "read");

    const [articles, authors, categories, tags, media, users] = await Promise.all([
      prisma.article.findMany({
        where: {
          deletedAt: null,
          ...(publicOnly
            ? {
                status: "published",
                OR: [{ publishAt: null }, { publishAt: { lte: new Date() } }],
              }
            : {}),
          OR: [
            { title: { contains: q } },
            { titleUr: { contains: q } },
            { excerpt: { contains: q } },
            { body: { contains: q } },
          ],
        },
        select: { id: true, title: true, slug: true, status: true, language: true },
        take: limit,
      }),
      prisma.author.findMany({
        where: {
          status: publicOnly ? "active" : undefined,
          OR: [{ name: { contains: q } }, { slug: { contains: q } }, { bio: { contains: q } }],
        },
        select: { id: true, name: true, slug: true },
        take: limit,
      }),
      prisma.category.findMany({
        where: {
          status: publicOnly ? "active" : undefined,
          OR: [{ name: { contains: q } }, { slug: { contains: q } }, { nameUr: { contains: q } }],
        },
        select: { id: true, name: true, slug: true },
        take: limit,
      }),
      prisma.tag.findMany({
        where: {
          OR: [{ name: { contains: q } }, { slug: { contains: q } }, { nameUr: { contains: q } }],
        },
        select: { id: true, name: true, slug: true },
        take: limit,
      }),
      publicOnly
        ? Promise.resolve([])
        : prisma.media.findMany({
            where: {
              deletedAt: null,
              OR: [
                { filename: { contains: q } },
                { originalName: { contains: q } },
                { alt: { contains: q } },
              ],
            },
            select: { id: true, filename: true, url: true, type: true },
            take: limit,
          }),
      includeUsers
        ? prisma.user.findMany({
            where: {
              deletedAt: null,
              OR: [
                { name: { contains: q } },
                { email: { contains: q } },
                { username: { contains: q } },
              ],
            },
            select: { id: true, name: true, email: true, username: true },
            take: limit,
          })
        : Promise.resolve([]),
    ]);

    return { q, articles, authors, categories, tags, media, users };
  });
}
