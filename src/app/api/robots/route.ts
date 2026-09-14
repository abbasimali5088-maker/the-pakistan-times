import { NextRequest } from "next/server";
import { z } from "zod";
import { handleApi } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs";

const DEFAULT_ROBOTS = `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/

Sitemap: ${process.env.NEXT_PUBLIC_SITE_URL || "https://thepakistantimes.pk"}/sitemap.xml
`;

export async function GET(_req: NextRequest) {
  return handleApi(async () => {
    const setting = await prisma.setting.findFirst({
      where: { group: "seo", key: "robots_txt" },
    });
    return {
      content: setting?.value || DEFAULT_ROBOTS,
      updatedAt: setting?.updatedAt || null,
    };
  });
}

export async function PUT(req: NextRequest) {
  return handleApi(async () => {
    const user = await requirePermission("robots", "update");
    const body = z.object({ content: z.string().min(1) }).parse(await req.json());
    const existing = await prisma.setting.findFirst({
      where: { group: "seo", key: "robots_txt" },
    });
    const item = existing
      ? await prisma.setting.update({
          where: { id: existing.id },
          data: { value: body.content },
        })
      : await prisma.setting.create({
          data: { group: "seo", key: "robots_txt", value: body.content },
        });
    await writeAudit({ userId: user.id, action: "update", module: "robots", recordId: item.id });
    return { content: item.value, updatedAt: item.updatedAt };
  });
}
