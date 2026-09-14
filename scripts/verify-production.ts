/**
 * Production readiness verifier for دی پاکستان ٹائمز اردو
 * Usage: npm run verify:prod   (server must be running, or set VERIFY_BASE_URL)
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const base = (process.env.VERIFY_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://127.0.0.1:4355").replace(
  /\/$/,
  "",
);

type Check = { name: string; ok: boolean; detail?: string };

const checks: Check[] = [];

function record(name: string, ok: boolean, detail?: string) {
  checks.push({ name, ok, detail });
  const mark = ok ? "PASS" : "FAIL";
  console.log(`${mark}  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function requireEnv() {
  const required = ["DATABASE_URL", "DIRECT_DATABASE_URL", "JWT_SECRET"];
  for (const key of required) {
    record(`env.${key}`, Boolean(process.env[key]?.trim()), process.env[key] ? "set" : "missing");
  }
  const db = process.env.DATABASE_URL || "";
  record("env.DATABASE_URL.postgres", db.startsWith("postgres"), db.startsWith("postgres") ? "postgresql://" : db.slice(0, 20));
  record("env.no-sqlite", !db.includes("file:") && !/sqlite/i.test(db), "DATABASE_URL is not SQLite");
}

async function checkDatabase() {
  const prisma = new PrismaClient();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const users = await prisma.user.count();
    const articles = await prisma.article.count({ where: { deletedAt: null } });
    const tables = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint as count FROM information_schema.tables WHERE table_schema = 'public'
    `;
    record("db.ping", true, `tables≈${tables[0]?.count ?? "?"}, users=${users}, articles=${articles}`);
    record("db.has-admin", users > 0, users > 0 ? "admin/user rows present" : "run npm run db:seed");
  } catch (err) {
    record("db.ping", false, err instanceof Error ? err.message : String(err));
  } finally {
    await prisma.$disconnect();
  }
}

async function httpJson(path: string, init?: RequestInit) {
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* html */
  }
  return { res, json, text };
}

async function checkHttp() {
  const health = await httpJson("/api/health");
  const healthData = (health.json as { success?: boolean; data?: { status?: string; database?: string } }) || {};
  record(
    "http.health",
    health.res.ok && healthData.success === true && healthData.data?.database === "up",
    JSON.stringify(healthData.data || health.text.slice(0, 120)),
  );

  for (const path of ["/", "/admin/login", "/sitemap.xml", "/robots.txt", "/latest", "/breaking"]) {
    const res = await fetch(`${base}${path}`, { redirect: "manual" });
    record(`http.${path}`, res.status >= 200 && res.status < 400, `status=${res.status}`);
  }

  const articles = await httpJson("/api/articles?public=1&pageSize=3");
  const artOk =
    articles.res.ok &&
    (articles.json as { success?: boolean })?.success === true &&
    Array.isArray((articles.json as { data?: { items?: unknown[] } })?.data?.items);
  record("http.articles.public", artOk, `status=${articles.res.status}`);

  const search = await fetch(`${base}/search?q=pakistan`);
  record("http.search.page", search.status === 200, `status=${search.status}`);

  const email = process.env.ADMIN_EMAIL || "admin@thepakistantimes.local";
  const password = process.env.ADMIN_PASSWORD || "pak123";
  const login = await httpJson("/api/auth", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  const setCookie = login.res.headers.getSetCookie?.() || [];
  const cookieHeader = setCookie.map((c) => c.split(";")[0]).join("; ");
  const loginOk = login.res.ok && (login.json as { success?: boolean })?.success === true;
  record("http.auth.login", loginOk, loginOk ? "session cookie issued" : JSON.stringify(login.json).slice(0, 160));

  if (cookieHeader) {
    const me = await httpJson("/api/auth", { headers: { Cookie: cookieHeader } });
    const user = (me.json as { data?: { user?: { roles?: string[]; permissions?: string[] } } })?.data?.user;
    record(
      "http.auth.me",
      me.res.ok && Array.isArray(user?.roles) && Array.isArray(user?.permissions),
      user ? `roles=${user.roles?.join(",")} perms=${user.permissions?.length}` : JSON.stringify(me.json).slice(0, 120),
    );
    const dash = await httpJson("/api/dashboard", { headers: { Cookie: cookieHeader } });
    record("http.dashboard", dash.res.ok && (dash.json as { success?: boolean })?.success === true);

    const settingsGet = await httpJson("/api/settings", { headers: { Cookie: cookieHeader } });
    const settingsMap = (settingsGet.json as { data?: { settings?: { social?: Record<string, string> } } })?.data
      ?.settings;
    record(
      "http.settings.get",
      settingsGet.res.ok && !!settingsMap,
      settingsMap?.social ? `social keys=${Object.keys(settingsMap.social).length}` : `status=${settingsGet.res.status}`,
    );

    const settingsSave = await httpJson("/api/settings", {
      method: "PUT",
      headers: { Cookie: cookieHeader },
      body: JSON.stringify({
        settings: {
          social: {
            ...(settingsMap?.social || {}),
            facebook: settingsMap?.social?.facebook || "https://facebook.com/thepakistantimes",
          },
        },
      }),
    });
    record(
      "http.settings.save",
      settingsSave.res.ok && (settingsSave.json as { success?: boolean })?.success === true,
      `status=${settingsSave.res.status}`,
    );

    const adminSettings = await fetch(`${base}/admin/settings`, {
      headers: { Cookie: cookieHeader },
    });
    record("http.admin.settings", adminSettings.status === 200, `status=${adminSettings.status}`);
  } else {
    record("http.auth.me", false, "no session cookie");
    record("http.dashboard", false, "skipped");
    record("http.settings.get", false, "skipped");
    record("http.settings.save", false, "skipped");
    record("http.admin.settings", false, "skipped");
  }
}

async function main() {
  console.log(`\nVerifying production readiness against ${base}\n`);
  await requireEnv();
  await checkDatabase();
  try {
    await checkHttp();
  } catch (err) {
    record("http.suite", false, err instanceof Error ? err.message : String(err));
  }

  const failed = checks.filter((c) => !c.ok);
  console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
  if (failed.length) {
    console.error("\nFailed checks:");
    for (const f of failed) console.error(` - ${f.name}: ${f.detail || ""}`);
    process.exit(1);
  }
  console.log("\nProduction verification OK.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
