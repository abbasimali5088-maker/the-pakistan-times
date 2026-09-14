import { BRAND } from "./constants";

export type Lang = "ur" | "en";

export const LANG_COOKIE = "lang";

export function isLang(value: unknown): value is Lang {
  return value === "ur" || value === "en";
}

export function normalizeLang(value?: string | null): Lang {
  return value === "en" ? "en" : "ur";
}

export function brandName(lang: Lang) {
  return lang === "en" ? BRAND.en : BRAND.ur;
}

export function pickText(
  lang: Lang,
  ur?: string | null,
  en?: string | null,
  fallback = "",
) {
  if (lang === "en") return (en || ur || fallback).trim();
  return (ur || en || fallback).trim();
}

export type LocalizedArticleFields = {
  title?: string | null;
  titleUr?: string | null;
  titleEn?: string | null;
  excerpt?: string | null;
  excerptUr?: string | null;
  excerptEn?: string | null;
  body?: string | null;
  bodyUr?: string | null;
  bodyEn?: string | null;
  category?: {
    name?: string | null;
    nameUr?: string | null;
    nameEn?: string | null;
    slug?: string;
  } | null;
};

export function localizeArticle<T extends LocalizedArticleFields>(article: T, lang: Lang) {
  return {
    ...article,
    displayTitle: pickText(lang, article.titleUr || article.title, article.titleEn, ""),
    displayExcerpt: pickText(
      lang,
      article.excerptUr || article.excerpt,
      article.excerptEn || article.excerpt,
      "",
    ),
    displayBody: pickText(lang, article.bodyUr || article.body, article.bodyEn || article.body, ""),
    displayCategory: article.category
      ? pickText(
          lang,
          article.category.nameUr || article.category.name,
          article.category.nameEn || article.category.name,
          "",
        )
      : "",
  };
}
