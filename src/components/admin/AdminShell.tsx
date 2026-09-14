"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { adminFetch } from "@/lib/admin-fetch";
import {
  LayoutDashboard,
  Newspaper,
  Zap,
  Radio,
  FolderTree,
  Tags,
  Users,
  Image,
  Video,
  Images,
  MessageSquare,
  Search,
  CornerDownRight,
  AlertTriangle,
  Menu,
  LayoutTemplate,
  FileText,
  Megaphone,
  Mail,
  BarChart3,
  HelpCircle,
  UserCog,
  Shield,
  LineChart,
  Bell,
  Settings,
  DatabaseBackup,
  Clock,
  ScrollText,
  BookOpen,
  LogOut,
  PanelLeftClose,
  PanelLeft,
  X,
} from "lucide-react";

export type AdminUser = {
  id: string;
  email: string;
  name?: string;
  username?: string;
};

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }> };

const NAV: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/articles", label: "Articles", icon: Newspaper },
  { href: "/admin/breaking", label: "Breaking", icon: Zap },
  { href: "/admin/live", label: "Live", icon: Radio },
  { href: "/admin/categories", label: "Categories", icon: FolderTree },
  { href: "/admin/tags", label: "Tags", icon: Tags },
  { href: "/admin/authors", label: "Authors", icon: Users },
  { href: "/admin/media", label: "Media", icon: Image },
  { href: "/admin/videos", label: "Videos", icon: Video },
  { href: "/admin/galleries", label: "Galleries", icon: Images },
  { href: "/admin/comments", label: "Comments", icon: MessageSquare },
  { href: "/admin/seo", label: "SEO", icon: Search },
  { href: "/admin/redirects", label: "Redirects", icon: CornerDownRight },
  { href: "/admin/notfound", label: "404", icon: AlertTriangle },
  { href: "/admin/menus", label: "Menus", icon: Menu },
  { href: "/admin/homepage", label: "Homepage", icon: LayoutTemplate },
  { href: "/admin/pages", label: "Pages", icon: FileText },
  { href: "/admin/ads", label: "Ads", icon: Megaphone },
  { href: "/admin/newsletter", label: "Newsletter", icon: Mail },
  { href: "/admin/polls", label: "Polls", icon: BarChart3 },
  { href: "/admin/quizzes", label: "Quizzes", icon: HelpCircle },
  { href: "/admin/users", label: "Users", icon: UserCog },
  { href: "/admin/roles", label: "Roles", icon: Shield },
  { href: "/admin/analytics", label: "Analytics", icon: LineChart },
  { href: "/admin/notifications", label: "Notifications", icon: Bell },
  { href: "/admin/settings", label: "Settings", icon: Settings },
  { href: "/admin/backup", label: "Backup", icon: DatabaseBackup },
  { href: "/admin/jobs", label: "Jobs", icon: Clock },
  { href: "/admin/audit", label: "Audit", icon: ScrollText },
  { href: "/admin/docs", label: "API Docs", icon: BookOpen },
];

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

type AdminShellProps = {
  user: AdminUser;
  children: ReactNode;
};

export function AdminShell({ user, children }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function logout() {
    setLoggingOut(true);
    try {
      await adminFetch("/api/auth", { method: "DELETE" });
    } catch {
      /* still leave */
    }
    router.replace("/admin/login");
    router.refresh();
  }

  const nav = (
    <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 py-3">
      {NAV.map((item) => {
        const Icon = item.icon;
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            title={item.label}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition",
              active
                ? "bg-[#0B7A3B] text-white"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
              collapsed && "justify-center px-2",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {!collapsed || mobileOpen ? <span>{item.label}</span> : null}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      {/* Mobile overlay */}
      {mobileOpen ? (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-slate-200 bg-white transition-all",
          collapsed ? "w-[68px]" : "w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="flex h-14 items-center justify-between gap-2 border-b border-slate-200 px-3">
          {!collapsed || mobileOpen ? (
            <div className="min-w-0">
              <p className="truncate font-urdu text-base font-semibold text-[#0B7A3B]" dir="rtl">
                دی پاکستان ٹائمز
              </p>
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Admin</p>
            </div>
          ) : (
            <span className="mx-auto text-sm font-bold text-[#0B7A3B]">PT</span>
          )}
          <button
            type="button"
            className="rounded p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {nav}

        <div className="border-t border-slate-200 p-3">
          {(!collapsed || mobileOpen) && (
            <p className="mb-2 truncate text-xs text-slate-500">{user.email}</p>
          )}
          <button
            type="button"
            disabled={loggingOut}
            onClick={logout}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-100",
              collapsed && !mobileOpen && "justify-center px-2",
            )}
          >
            <LogOut className="h-4 w-4" />
            {(!collapsed || mobileOpen) && <span>{loggingOut ? "Signing out…" : "Logout"}</span>}
          </button>
        </div>
      </aside>

      <div className={cn("transition-[padding]", collapsed ? "lg:pl-[68px]" : "lg:pl-64")}>
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur">
          <button
            type="button"
            className="rounded-md border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="hidden rounded-md border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 lg:inline-flex"
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-800">
              {user.name || user.username || "Editor"}
            </p>
          </div>
          <Link
            href="/"
            className="text-xs font-medium text-[#0B7A3B] hover:underline"
            target="_blank"
          >
            View site
          </Link>
        </header>
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

export function AdminPageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 md:text-2xl">{title}</h1>
        {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function AdminPanel({
  children,
  className,
  title,
  description,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  description?: string;
}) {
  return (
    <section className={cn("rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:p-5", className)}>
      {title ? <h2 className="mb-1 text-sm font-semibold text-slate-800">{title}</h2> : null}
      {description ? <p className="mb-3 text-xs text-slate-500">{description}</p> : null}
      {title ? <div className={description ? "mb-1" : "mb-4"} /> : null}
      {children}
    </section>
  );
}
