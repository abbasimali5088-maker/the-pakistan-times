import { cookies } from "next/headers";
import { isLang, LANG_COOKIE, normalizeLang, type Lang } from "./language";

export async function getRequestLang(searchParams?: {
  lang?: string | string[];
}): Promise<Lang> {
  const fromQuery = Array.isArray(searchParams?.lang)
    ? searchParams?.lang[0]
    : searchParams?.lang;
  if (isLang(fromQuery)) return fromQuery;

  const jar = await cookies();
  return normalizeLang(jar.get(LANG_COOKIE)?.value);
}
