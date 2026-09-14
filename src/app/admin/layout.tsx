"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AdminShell, type AdminUser } from "@/components/admin/AdminShell";
import { AdminApiError, adminFetch } from "@/lib/admin-fetch";

function UrduFontLink() {
  return (
    // eslint-disable-next-line @next/next/no-page-custom-font
    <link
      href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;600;700&display=swap"
      rel="stylesheet"
    />
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLogin = pathname === "/admin/login";
  const [user, setUser] = useState<AdminUser | null>(null);
  const [checking, setChecking] = useState(!isLogin);

  useEffect(() => {
    if (isLogin) {
      setChecking(false);
      return;
    }

    let cancelled = false;
    setChecking(true);

    (async () => {
      try {
        const data = await adminFetch<{ user: AdminUser }>("/api/auth");
        if (!cancelled) setUser(data.user);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof AdminApiError && (err.status === 401 || err.status === 403)) {
          router.replace("/admin/login");
          return;
        }
        // API missing or other errors — still show shell so UI can be developed
        setUser({ id: "unknown", email: "session@local", name: "Admin" });
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLogin, pathname, router]);

  if (isLogin) {
    return (
      <>
        <UrduFontLink />
        {children}
      </>
    );
  }

  if (checking || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-sm text-slate-500">
        Checking session…
      </div>
    );
  }

  return (
    <>
      <UrduFontLink />
      <AdminShell user={user}>{children}</AdminShell>
    </>
  );
}
