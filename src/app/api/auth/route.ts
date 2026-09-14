import { NextRequest, NextResponse } from "next/server";
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
import { fail, handleApi, ok } from "@/lib/api";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const loginSchema = z.object({
  email: z.string().trim().min(3),
  password: z.string().min(1),
});

function shouldUseSecureCookies() {
  if (process.env.COOKIE_SECURE === "true") return true;
  if (process.env.COOKIE_SECURE === "false") return false;
  if (process.env.VERCEL === "1") return true;
  const site = process.env.NEXT_PUBLIC_SITE_URL || "";
  return site.startsWith("https://");
}

function cookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: shouldUseSecureCookies(),
    path: "/",
    expires: expiresAt,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = loginSchema.parse(await req.json());
    const email = body.email.toLowerCase();
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const userAgent = req.headers.get("user-agent") || undefined;

    const since = new Date(Date.now() - 15 * 60_000);
    const fails = await prisma.loginLog.count({
      where: { email, success: false, createdAt: { gte: since } },
    });
    if (fails >= 10) {
      await prisma.loginLog.create({
        data: { email, success: false, ip, userAgent },
      });
      return fail("Too many failed attempts. Try again later.", 429);
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { email: body.email }],
        deletedAt: null,
      },
    });
    const valid =
      user && user.status === "active"
        ? await verifyPassword(body.password, user.passwordHash)
        : false;

    await prisma.loginLog.create({
      data: {
        userId: user?.id,
        email,
        success: !!valid,
        ip,
        userAgent,
      },
    });

    if (!valid || !user) {
      return fail("Invalid credentials", 401);
    }

    const session = await createSession(user.id, { ip, userAgent });

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

    const res = ok({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        username: user.username,
      },
    });
    res.cookies.set(SESSION_COOKIE, session.jwt, cookieOptions(session.expiresAt));
    return res;
  } catch (err) {
    if (err instanceof z.ZodError) {
      return fail("Validation failed", 422, err.flatten());
    }
    if (err instanceof AuthError) return fail(err.message, err.status);
    console.error("[auth/login]", err);
    return fail(err instanceof Error ? err.message : "Login failed", 500);
  }
}

export async function DELETE() {
  return handleApi(async () => {
    const user = await getSessionUser();
    const token = (await (await import("next/headers")).cookies()).get(SESSION_COOKIE)?.value;
    if (token) {
      try {
        const { payload } = await (
          await import("jose")
        ).jwtVerify(
          token,
          new TextEncoder().encode(
            process.env.JWT_SECRET ||
              (process.env.NODE_ENV === "production" || process.env.VERCEL === "1"
                ? ""
                : "dev-secret-local-only"),
          ),
        );
        await destroySession(String(payload.sid || ""));
      } catch {
        /* ignore */
      }
    }
    const res = ok({ ok: true });
    res.cookies.set(SESSION_COOKIE, "", {
      httpOnly: true,
      path: "/",
      expires: new Date(0),
      sameSite: "lax",
      secure: shouldUseSecureCookies(),
    });
    if (user) {
      await writeAudit({ userId: user.id, action: "logout", module: "security" });
    }
    return res;
  });
}

export async function GET() {
  return handleApi(async () => {
    const user = await requireUser();
    const { permissions: _set, permissionsList, ...rest } = user;
    void _set;
    return {
      user: {
        ...rest,
        permissions: permissionsList,
      },
    };
  });
}
