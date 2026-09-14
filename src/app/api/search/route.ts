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
            { title: { contains: q, mode: "insensitive" } },
            { titleUr: { contains: q, mode: "insensitive" } },
            { excerpt: { contains: q, mode: "insensitive" } },
            { excerptUr: { contains: q, mode: "insensitive" } },
            { body: { contains: q, mode: "insensitive" } },
            { bodyUr: { contains: q, mode: "insensitive" } },
            { slug: { contains: q, mode: "insensitive" } },
          ],
        },
        select: { id: true, title: true, slug: true, status: true, language: true },
        take: limit,
      }),
      prisma.author.findMany({
        where: {
          status: publicOnly ? "active" : undefined,
          OR: [{ name: { contains: q, mode: "insensitive" } }, { slug: { contains: q, mode: "insensitive" } }, { bio: { contains: q, mode: "insensitive" } }],
        },
        select: { id: true, name: true, slug: true },
        take: limit,
      }),
      prisma.category.findMany({
        where: {
          status: publicOnly ? "active" : undefined,
          OR: [{ name: { contains: q, mode: "insensitive" } }, { slug: { contains: q, mode: "insensitive" } }, { nameUr: { contains: q, mode: "insensitive" } }],
        },
        select: { id: true, name: true, slug: true },
        take: limit,
      }),
      prisma.tag.findMany({
        where: {
          OR: [{ name: { contains: q, mode: "insensitive" } }, { slug: { contains: q, mode: "insensitive" } }, { nameUr: { contains: q, mode: "insensitive" } }],
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
                { filename: { contains: q, mode: "insensitive" } },
                { originalName: { contains: q, mode: "insensitive" } },
                { alt: { contains: q, mode: "insensitive" } },
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
                { name: { contains: q, mode: "insensitive" } },
                { email: { contains: q, mode: "insensitive" } },
                { username: { contains: q, mode: "insensitive" } },
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
