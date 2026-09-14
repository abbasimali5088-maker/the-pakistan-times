import { handleApi } from "@/lib/api";
import { MODULES, ACTIONS, ROLE_DEFS, permissionCode } from "@/lib/permissions";

export const runtime = "nodejs";

export async function GET() {
  return handleApi(async () => {
    const paths = [
      { path: "/api/auth", methods: ["GET", "POST", "DELETE"], auth: "session", notes: "Login/logout/me" },
      { path: "/api/articles", methods: ["GET", "POST"], auth: "optional public=1", permissions: ["articles.read", "articles.create"] },
      { path: "/api/articles/{id}", methods: ["GET", "PATCH", "DELETE"], auth: "optional for published", permissions: ["articles.*"] },
      { path: "/api/categories", methods: ["GET", "POST"], auth: "optional public=1" },
      { path: "/api/tags", methods: ["GET", "POST"], auth: "optional public=1" },
      { path: "/api/authors", methods: ["GET", "POST"], auth: "optional public=1" },
      { path: "/api/breaking", methods: ["GET", "POST"], auth: "optional public=1" },
      { path: "/api/live", methods: ["GET", "POST"], auth: "optional public=1" },
      { path: "/api/menus", methods: ["GET", "POST", "PUT"], auth: "optional public=1" },
      { path: "/api/homepage", methods: ["GET", "POST", "PUT"], auth: "optional public=1" },
      { path: "/api/pages", methods: ["GET", "POST"], auth: "optional public=1" },
      { path: "/api/search", methods: ["GET"], auth: "optional public=1" },
      { path: "/api/comments", methods: ["GET", "POST"], auth: "public create" },
      { path: "/api/newsletter", methods: ["GET", "POST"], auth: "public subscribe" },
      { path: "/api/analytics", methods: ["GET", "POST"], auth: "public event POST" },
      { path: "/api/ads", methods: ["GET", "POST"], auth: "optional public=1" },
      { path: "/api/media", methods: ["GET", "POST"], auth: "admin" },
      { path: "/api/videos", methods: ["GET", "POST"], auth: "optional public=1" },
      { path: "/api/audio", methods: ["GET", "POST"], auth: "admin" },
      { path: "/api/galleries", methods: ["GET", "POST"], auth: "optional public=1" },
      { path: "/api/settings", methods: ["GET", "PUT"], auth: "admin" },
      { path: "/api/seo", methods: ["GET", "POST"], auth: "admin" },
      { path: "/api/sitemap", methods: ["GET", "POST"], auth: "public GET" },
      { path: "/api/robots", methods: ["GET", "PUT"], auth: "public GET" },
      { path: "/api/redirects", methods: ["GET", "POST"], auth: "admin" },
      { path: "/api/notfound", methods: ["GET", "POST"], auth: "public track" },
      { path: "/api/users", methods: ["GET", "POST"], auth: "admin" },
      { path: "/api/roles", methods: ["GET"], auth: "admin" },
      { path: "/api/dashboard", methods: ["GET"], auth: "admin" },
      { path: "/api/notifications", methods: ["GET", "PATCH"], auth: "admin" },
      { path: "/api/polls", methods: ["GET", "POST"], auth: "mixed" },
      { path: "/api/quizzes", methods: ["GET", "POST"], auth: "mixed" },
      { path: "/api/backup", methods: ["GET", "POST"], auth: "admin" },
      { path: "/api/jobs", methods: ["GET", "POST"], auth: "admin" },
      { path: "/api/health", methods: ["GET"], auth: "public" },
      { path: "/api/import-export", methods: ["POST"], auth: "admin" },
      { path: "/api/docs", methods: ["GET"], auth: "public" },
    ];

    return {
      openapi: "3.0.3",
      info: {
        title: "دی پاکستان ٹائمز اردو API",
        version: "1.0.0",
        description: "API-first news CMS for The Pakistan Times",
      },
      servers: [{ url: process.env.NEXT_PUBLIC_SITE_URL || "http://127.0.0.1:4321" }],
      securitySchemes: {
        cookieAuth: { type: "apiKey", in: "cookie", name: "pt_session" },
      },
      paths,
      modules: MODULES,
      actions: ACTIONS,
      roles: ROLE_DEFS,
      permissionExample: permissionCode("articles", "publish"),
      responseShape: { success: true, data: {}, error: "string when success=false" },
    };
  });
}
