import { createHash, randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "./db";
import { permissionCode } from "./permissions";

const COOKIE = "pt_session";

function resolveJwtSecret() {
  const secret = process.env.JWT_SECRET?.trim();
  if (secret) return secret;
  if (process.env.NODE_ENV === "production" || process.env.VERCEL === "1") {
    throw new Error("JWT_SECRET must be set in production");
  }
  return "dev-secret-local-only";
}

function secretKey() {
  return new TextEncoder().encode(resolveJwtSecret());
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string, meta?: { ip?: string; userAgent?: string }) {
  const raw = randomBytes(32).toString("hex");
  const tokenHash = hashToken(raw);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
  await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
      ip: meta?.ip,
      userAgent: meta?.userAgent,
    },
  });
  const jwt = await new SignJWT({ sub: userId, sid: tokenHash })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(secretKey());
  return { jwt, expiresAt, raw };
}

export async function destroySession(tokenHash?: string) {
  if (!tokenHash) return;
  await prisma.session.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function getSessionUser() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    const userId = String(payload.sub || "");
    const sid = String(payload.sid || "");
    if (!userId || !sid) return null;
    const session = await prisma.session.findFirst({
      where: { tokenHash: sid, revokedAt: null, expiresAt: { gt: new Date() } },
    });
    if (!session) return null;
    const user = await prisma.user.findFirst({
      where: { id: userId, status: "active", deletedAt: null },
      include: {
        roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
      },
    });
    if (!user) return null;
    const permissions = new Set<string>();
    const roles = user.roles.map((r) => r.role.slug);
    for (const ur of user.roles) {
      for (const rp of ur.role.permissions) permissions.add(rp.permission.code);
    }
    if (roles.includes("super-admin")) {
      // super admin has all
      permissions.add("*");
    }
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      roles,
      // Keep Set for server-side `can()`; JSON responses should use `permissionsList`.
      permissions,
      permissionsList: Array.from(permissions),
    };
  } catch {
    return null;
  }
}

export type AuthUser = NonNullable<Awaited<ReturnType<typeof getSessionUser>>>;

export function can(user: AuthUser | null, module: string, action: string) {
  if (!user) return false;
  if (user.permissions.has("*") || user.roles.includes("super-admin")) return true;
  return user.permissions.has(permissionCode(module, action));
}

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) throw new AuthError("Unauthorized", 401);
  return user;
}

export async function requirePermission(module: string, action: string) {
  const user = await requireUser();
  if (!can(user, module, action)) throw new AuthError("Forbidden", 403);
  return user;
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

export { COOKIE as SESSION_COOKIE };
