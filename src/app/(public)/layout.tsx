import { headers } from "next/headers";
import { BreakingNewsBar } from "@/components/public/BreakingNewsBar";
import { Footer } from "@/components/public/Footer";
import { Header } from "@/components/public/Header";
import { getBreaking, getCategories, getMenus } from "@/lib/public-api";
import { getRequestLang } from "@/lib/language-server";

export const dynamic = "force-dynamic";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const h = await headers();
  const url = h.get("x-url") || h.get("referer") || "";
  let searchLang: string | undefined;
  try {
    if (url) searchLang = new URL(url).searchParams.get("lang") || undefined;
  } catch {
    searchLang = undefined;
  }
  const lang = await getRequestLang({ lang: searchLang });

  const [menu, categories, breaking] = await Promise.all([
    getMenus("main"),
    getCategories(),
    getBreaking(),
  ]);

  const topCategories = categories.filter((c) => {
    const parentId = (c as { parentId?: string | null }).parentId;
    return !parentId;
  });

  return (
    <div className="site-shell">
      <Header
        lang={lang}
        menuItems={menu?.items || []}
        categories={topCategories}
      />
      <BreakingNewsBar lang={lang} items={breaking} />
      <main className="site-main">{children}</main>
      <Footer lang={lang} />
    </div>
  );
}
