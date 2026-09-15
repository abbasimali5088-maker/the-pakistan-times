import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const siteUrl = () => process.env.NEXT_PUBLIC_SITE_URL || "https://thepakistantimes.pk";

function defaultRobots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/api/"],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}

export default async function robots(): Promise<MetadataRoute.Robots> {
  try {
    const setting = await prisma.setting.findFirst({
      where: { group: "seo", key: "robots_txt" },
    });

    if (!setting?.value) return defaultRobots();

    const lines = setting.value.split("\n").map((l) => l.trim());
    const disallow: string[] = [];
    const allow: string[] = [];
    for (const line of lines) {
      const lower = line.toLowerCase();
      if (lower.startsWith("disallow:")) {
        const path = line.slice(line.indexOf(":") + 1).trim();
        if (path) disallow.push(path);
      } else if (lower.startsWith("allow:")) {
        const path = line.slice(line.indexOf(":") + 1).trim();
        if (path) allow.push(path);
      }
    }
    return {
      rules: {
        userAgent: "*",
        allow: allow.length ? allow : "/",
        disallow,
      },
      sitemap: `${siteUrl()}/sitemap.xml`,
    };
  } catch {
    // Build/deploy must not fail if DB is unreachable (common on Vercel + wrong Supabase host)
    return defaultRobots();
  }
}
