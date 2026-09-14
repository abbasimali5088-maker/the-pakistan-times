import { NextRequest } from "next/server";
import { handleApi } from "@/lib/api";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  return handleApi(async () => {
    const url = new URL(req.url);
    const location = url.searchParams.get("location") || "main";
    const publicOnly = url.searchParams.get("public") === "1";

    const menu = await prisma.menu.findFirst({
      where: {
        location,
        ...(publicOnly ? { status: "active" } : {}),
      },
      include: {
        items: {
          where: publicOnly ? { status: "active", parentId: null } : { parentId: null },
          orderBy: { sortOrder: "asc" },
          include: {
            children: {
              where: publicOnly ? { status: "active" } : undefined,
              orderBy: { sortOrder: "asc" },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    if (!menu) return { items: [] };

    return {
      items: [
        {
          id: menu.id,
          name: menu.name,
          location: menu.location,
          items: menu.items.map((item) => ({
            id: item.id,
            label: item.label,
            labelUr: item.labelUr,
            url: item.url,
            target: item.target,
            sortOrder: item.sortOrder,
            children: item.children.map((c) => ({
              id: c.id,
              label: c.label,
              labelUr: c.labelUr,
              url: c.url,
              target: c.target,
              sortOrder: c.sortOrder,
            })),
          })),
        },
      ],
    };
  });
}
