import { NextRequest } from "next/server";
import { z } from "zod";
import { getPagination, handleApi } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { makeSlug } from "@/lib/slug";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  return handleApi(async () => {
    const url = new URL(req.url);
    const publicOnly = url.searchParams.get("public") === "1";
    if (!publicOnly) await requirePermission("tags", "read");
    const unused = url.searchParams.get("unused") === "1";
    const q = url.searchParams.get("q");
    const { skip, take, page, pageSize } = getPagination(url);
    const where = {
      usageCount: unused ? 0 : undefined,
      OR: q
        ? [{ name: { contains: q } }, { slug: { contains: q } }, { nameUr: { contains: q } }]
        : undefined,
    };
    const [total, items] = await Promise.all([
      prisma.tag.count({ where }),
      prisma.tag.findMany({ where, orderBy: { usageCount: "desc" }, skip, take }),
    ]);
    return { items, total, page, pageSize };
  });
}

export async function POST(req: NextRequest) {
  return handleApi(async () => {
    const user = await requirePermission("tags", "create");
    const body = z
      .object({
        name: z.string().min(1),
        nameUr: z.string().optional(),
        slug: z.string().optional(),
        description: z.string().optional(),
        seoTitle: z.string().optional(),
        seoDescription: z.string().optional(),
        mergeIntoId: z.string().optional(),
      })
      .parse(await req.json());

    if (body.mergeIntoId) {
      // merge handled via query param style on create endpoint for simplicity when posting {name, mergeIntoId} from unused tag id via PATCH elsewhere
    }

    const item = await prisma.tag.create({
      data: {
        name: body.name,
        nameUr: body.nameUr,
        slug: makeSlug(body.slug || body.name),
        description: body.description,
        seoTitle: body.seoTitle,
        seoDescription: body.seoDescription,
      },
    });
    await writeAudit({ userId: user.id, action: "create", module: "tags", recordId: item.id });
    return item;
  });
}
