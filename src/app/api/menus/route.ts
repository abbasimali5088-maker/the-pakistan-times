import { NextRequest } from "next/server";
import { z } from "zod";
import { handleApi } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs";

const itemSchema = z.object({
  id: z.string().optional(),
  parentId: z.string().optional().nullable(),
  label: z.string().min(1),
  labelUr: z.string().optional().nullable(),
  url: z.string().min(1),
  target: z.string().optional(),
  sortOrder: z.number().int().optional(),
  status: z.string().optional(),
});

const menuSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  location: z.string().optional(),
  status: z.string().optional(),
  siteId: z.string().optional().nullable(),
  items: z.array(itemSchema).optional(),
});

export async function GET(req: NextRequest) {
  return handleApi(async () => {
    const url = new URL(req.url);
    const publicOnly = url.searchParams.get("public") === "1";
    const location = url.searchParams.get("location");
    if (!publicOnly) await requirePermission("menus", "read");

    const items = await prisma.menu.findMany({
      where: {
        location: location || undefined,
        status: publicOnly ? "active" : url.searchParams.get("status") || undefined,
      },
      include: {
        items: {
          where: publicOnly ? { status: "active" } : undefined,
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });
    return { items };
  });
}

export async function POST(req: NextRequest) {
  return handleApi(async () => {
    const user = await requirePermission("menus", "create");
    const body = menuSchema.parse(await req.json());
    const item = await prisma.menu.create({
      data: {
        name: body.name,
        location: body.location || "main",
        status: body.status || "active",
        siteId: body.siteId,
        items: body.items?.length
          ? {
              create: body.items.map((it, idx) => ({
                label: it.label,
                labelUr: it.labelUr,
                url: it.url,
                target: it.target || "_self",
                sortOrder: it.sortOrder ?? idx,
                status: it.status || "active",
                parentId: it.parentId,
              })),
            }
          : undefined,
      },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    });
    await writeAudit({ userId: user.id, action: "create", module: "menus", recordId: item.id });
    return item;
  });
}

export async function PATCH(req: NextRequest) {
  return handleApi(async () => {
    const user = await requirePermission("menus", "update");
    const body = menuSchema.extend({ id: z.string().min(1) }).parse(await req.json());
    const existing = await prisma.menu.findUnique({ where: { id: body.id } });
    if (!existing) throw new Error("Menu not found");

    if (body.items) {
      await prisma.menuItem.deleteMany({ where: { menuId: body.id } });
      if (body.items.length) {
        await prisma.menuItem.createMany({
          data: body.items.map((it, idx) => ({
            menuId: body.id!,
            label: it.label,
            labelUr: it.labelUr,
            url: it.url,
            target: it.target || "_self",
            sortOrder: it.sortOrder ?? idx,
            status: it.status || "active",
            parentId: it.parentId,
          })),
        });
      }
    }

    const item = await prisma.menu.update({
      where: { id: body.id },
      data: {
        name: body.name,
        location: body.location,
        status: body.status,
        siteId: body.siteId,
      },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    });
    await writeAudit({ userId: user.id, action: "update", module: "menus", recordId: item.id });
    return item;
  });
}
