import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { z } from "zod";
import {
  SESSION_COOKIE,
  AuthError,
  createSession,
  destroySession,
  getSessionUser,
  requireUser,
  verifyPassword,
} from "@/lib/auth";
import { handleApi } from "@/lib/api";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  return handleApi(async () => {
    const body = loginSchema.parse(await req.json());
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const userAgent = req.headers.get("user-agent") || undefined;

    // brute-force soft limit: 10 fails / 15 min per email
    const since = new Date(Date.now() - 15 * 60_000);
    const fails = await prisma.loginLog.count({
      where: { email: body.email, success: false, createdAt: { gte: since } },
    });
    if (fails >= 10) {
      await prisma.loginLog.create({
        data: { email: body.email, success: false, ip, userAgent },
      });
      throw new AuthError("Too many failed attempts. Try again later.", 429);
    }

    const user = await prisma.user.findUnique({ where: { email: body.email } });
    const valid = user && user.status === "active" && !user.deletedAt
      ? await verifyPassword(body.password, user.passwordHash)
      : false;

    await prisma.loginLog.create({
      data: {
        userId: user?.id,
        email: body.email,
        success: !!valid,
        ip,
        userAgent,
      },
    });

    if (!valid || !user) throw new AuthError("Invalid credentials", 401);

    const session = await createSession(user.id, { ip, userAgent });
    const jar = await cookies();
    jar.set(SESSION_COOKIE, session.jwt, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: session.expiresAt,
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    await writeAudit({
      userId: user.id,
      action: "login",
      module: "security",
      ip,
      userAgent,
    });

    return {
      user: { id: user.id, email: user.email, name: user.name, username: user.username },
    };
  });
}

export async function DELETE() {
  return handleApi(async () => {
    const user = await getSessionUser();
    const jar = await cookies();
    const token = jar.get(SESSION_COOKIE)?.value;
    if (token) {
      try {
        const { payload } = await (await import("jose")).jwtVerify(
          token,
          new TextEncoder().encode(process.env.JWT_SECRET || "dev-secret"),
        );
        await destroySession(String(payload.sid || ""));
      } catch {
        /* ignore */
      }
    }
    jar.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", expires: new Date(0) });
    if (user) {
      await writeAudit({ userId: user.id, action: "logout", module: "security" });
    }
    return { ok: true };
  });
}

export async function GET() {
  return handleApi(async () => {
    const user = await requireUser();
    return { user };
  });
}
