import { NextRequest } from "next/server";
import { z } from "zod";
import { getPagination, handleApi } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs";

const mediaSchema = z.object({
  filename: z.string().min(1),
  originalName: z.string().optional(),
  path: z.string().optional(),
  url: z.string().min(1),
  mimeType: z.string().optional(),
  size: z.number().int().nonnegative().optional(),
  width: z.number().int().optional().nullable(),
  height: z.number().int().optional().nullable(),
  alt: z.string().optional().nullable(),
  caption: z.string().optional().nullable(),
  credit: z.string().optional().nullable(),
  copyright: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  type: z.string().optional(),
  variants: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  return handleApi(async () => {
    const url = new URL(req.url);
    const publicOnly = url.searchParams.get("public") === "1";
    if (!publicOnly) await requirePermission("media", "read");
    const q = url.searchParams.get("q");
    const type = url.searchParams.get("type");
    const { skip, take, page, pageSize } = getPagination(url);
    const where = {
      deletedAt: null,
      type: type || undefined,
      OR: q
        ? [
            { filename: { contains: q } },
            { originalName: { contains: q } },
            { alt: { contains: q } },
            { caption: { contains: q } },
            { url: { contains: q } },
          ]
        : undefined,
    };
    const [total, items] = await Promise.all([
      prisma.media.count({ where }),
      prisma.media.findMany({
        where,
        include: { uploadedBy: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
    ]);
    return { items, total, page, pageSize };
  });
}

export async function POST(req: NextRequest) {
  return handleApi(async () => {
    const user = await requirePermission("media", "create");
    const body = mediaSchema.parse(await req.json());
    const filename = body.filename;
    const url = body.url;
    const mimeType = body.mimeType || guessMime(url, filename);
    const type = body.type || mimeType.split("/")[0] || "image";
    const item = await prisma.media.create({
      data: {
        filename,
        originalName: body.originalName || filename,
        path: body.path || url,
        url,
        mimeType,
        size: body.size ?? 0,
        width: body.width,
        height: body.height,
        alt: body.alt,
        caption: body.caption,
        credit: body.credit,
        copyright: body.copyright,
        description: body.description,
        type,
        variants: body.variants,
        uploadedById: user.id,
      },
    });
    await writeAudit({ userId: user.id, action: "create", module: "media", recordId: item.id });
    return item;
  });
}

function guessMime(url: string, filename: string) {
  const name = (filename || url).toLowerCase();
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  if (name.endsWith(".gif")) return "image/gif";
  if (name.endsWith(".webp")) return "image/webp";
  if (name.endsWith(".mp4")) return "video/mp4";
  if (name.endsWith(".mp3")) return "audio/mpeg";
  if (name.endsWith(".pdf")) return "application/pdf";
  return "application/octet-stream";
}
