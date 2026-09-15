import { headers } from "next/headers";
import { BreakingNewsBar } from "@/components/public/BreakingNewsBar";
import { Footer } from "@/components/public/Footer";
import { Header } from "@/components/public/Header";
import { RatesBar } from "@/components/public/RatesBar";
import { getSettingMap } from "@/lib/content";
import { getBreaking, getCategories, getMenus } from "@/lib/public-api";
import { getRequestLang } from "@/lib/language-server";
import {
  defaultRatesMap,
  normalizeRatesMap,
  ratesToPublicItems,
  RATES_GROUP,
} from "@/lib/market-rates";
import { syncIfStale, ensureRatesRefreshJob } from "@/lib/fetch-live-rates";
import { SOCIAL_LINK_KEYS, normalizeSettingsMap } from "@/lib/site-settings";

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

  const [menu, categories, breaking, rawSettings] = await Promise.all([
    getMenus("main"),
    getCategories(),
    getBreaking(),
    getSettingMap(),
  ]);

  const settings = normalizeSettingsMap(rawSettings);

  // OGRA petrol changes daily — refresh if stored rates are stale
  let rateMap = normalizeRatesMap({
    ...defaultRatesMap(),
    ...(rawSettings[RATES_GROUP] || {}),
  });
  try {
    const fresh = await syncIfStale();
    rateMap = fresh.rates;
    await ensureRatesRefreshJob();
  } catch {
    /* keep stored rates if live sync fails */
  }
  const rateItems = ratesToPublicItems(rateMap);

  const social: Record<string, string> = {};
  for (const key of SOCIAL_LINK_KEYS) {
    const val = settings.social?.[key]?.trim();
    if (val) social[key] = val;
  }

  const topCategories = categories.filter((c) => {
    const parentId = (c as { parentId?: string | null }).parentId;
    return !parentId;
  });

  const accent = settings.theme?.accentColor?.trim();
  const customCss = settings.theme?.customCss?.trim();

  return (
    <div
      className="site-shell"
      style={accent ? ({ ["--accent" as string]: accent } as React.CSSProperties) : undefined}
    >
      {customCss ? <style dangerouslySetInnerHTML={{ __html: customCss }} /> : null}
      <Header
        lang={lang}
        menuItems={menu?.items || []}
        categories={topCategories}
        taglineUr={settings.general?.taglineUr}
        taglineEn={settings.general?.taglineEn}
      />
      <RatesBar
        lang={lang}
        items={rateItems}
        updatedLabel={rateMap.updatedLabel}
        updatedLabelUr={rateMap.updatedLabelUr}
      />
      <BreakingNewsBar lang={lang} items={breaking} />
      <main className="site-main">{children}</main>
      <Footer
        lang={lang}
        site={{
          aboutUr: settings.footer?.aboutUr,
          aboutEn: settings.footer?.aboutEn,
          copyrightUr: settings.footer?.copyrightUr,
          copyrightEn: settings.footer?.copyrightEn,
          contactEmail: settings.general?.contactEmail,
          contactPhone: settings.general?.contactPhone,
          social,
        }}
      />
    </div>
  );
}
