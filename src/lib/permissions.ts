export const MODULES = [
  "dashboard",
  "articles",
  "revisions",
  "categories",
  "tags",
  "authors",
  "users",
  "roles",
  "media",
  "videos",
  "audio",
  "galleries",
  "breaking",
  "live",
  "seo",
  "sitemap",
  "robots",
  "redirects",
  "notfound",
  "search",
  "analytics",
  "comments",
  "polls",
  "quizzes",
  "newsletter",
  "ads",
  "notifications",
  "homepage",
  "menus",
  "pages",
  "settings",
  "security",
  "audit",
  "backup",
  "import_export",
  "jobs",
] as const;

export const ACTIONS = [
  "create",
  "read",
  "update",
  "delete",
  "publish",
  "schedule",
  "approve",
  "reject",
  "manage",
  "export",
  "import",
  "settings",
] as const;

export type ModuleName = (typeof MODULES)[number];
export type ActionName = (typeof ACTIONS)[number];

export const ROLE_DEFS = [
  { name: "Super Admin", slug: "super-admin", description: "Full system access" },
  { name: "Administrator", slug: "administrator", description: "Admin operations" },
  { name: "Managing Editor", slug: "managing-editor", description: "Editorial leadership" },
  { name: "Editor", slug: "editor", description: "Edit and publish" },
  { name: "Reporter", slug: "reporter", description: "Create and submit stories" },
  { name: "Contributor", slug: "contributor", description: "Submit drafts" },
  { name: "SEO Manager", slug: "seo-manager", description: "SEO tools" },
  { name: "Media Manager", slug: "media-manager", description: "Media library" },
  { name: "Moderator", slug: "moderator", description: "Comments moderation" },
  { name: "Analyst", slug: "analyst", description: "Analytics read access" },
  { name: "Advertisement Manager", slug: "advertisement-manager", description: "Ads management" },
] as const;

export function permissionCode(module: string, action: string) {
  return `${module}.${action}`;
}
