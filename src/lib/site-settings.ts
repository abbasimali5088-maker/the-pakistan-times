/**
 * Central site settings catalog — admin UI, seed, and public site share these keys.
 * Editors can change everything here without touching code.
 */

export type SettingFieldType = "text" | "textarea" | "url" | "email" | "color" | "tel";

export type SettingFieldDef = {
  key: string;
  label: string;
  labelUr?: string;
  type?: SettingFieldType;
  hint?: string;
  placeholder?: string;
  urdu?: boolean;
};

export type SettingGroupDef = {
  key: string;
  title: string;
  titleUr: string;
  description?: string;
  fields: SettingFieldDef[];
};

/** Canonical groups shown in Admin → Settings */
export const SETTING_GROUPS: SettingGroupDef[] = [
  {
    key: "general",
    title: "General / Site identity",
    titleUr: "عام / سائٹ کی شناخت",
    description: "Brand names, taglines, and basic contact details.",
    fields: [
      {
        key: "siteNameUr",
        label: "Site name (Urdu)",
        labelUr: "سائٹ کا نام (اردو)",
        urdu: true,
        placeholder: "دی پاکستان ٹائمز اردو",
      },
      {
        key: "siteNameEn",
        label: "Site name (English)",
        placeholder: "The Pakistan Times",
      },
      {
        key: "taglineUr",
        label: "Tagline (Urdu)",
        labelUr: "ٹیگ لائن (اردو)",
        urdu: true,
        placeholder: "آزاد، حقیقت پر مبنی صحافت",
      },
      {
        key: "taglineEn",
        label: "Tagline (English)",
        placeholder: "Independent reporting from the newsroom",
      },
      { key: "contactEmail", label: "Contact email", type: "email", placeholder: "news@example.com" },
      { key: "contactPhone", label: "Contact phone", type: "tel", placeholder: "+92 300 1234567" },
      {
        key: "addressUr",
        label: "Address (Urdu)",
        labelUr: "پتہ (اردو)",
        type: "textarea",
        urdu: true,
      },
      { key: "addressEn", label: "Address (English)", type: "textarea" },
    ],
  },
  {
    key: "social",
    title: "Social links",
    titleUr: "سوشل لنکس",
    description: "These appear on the public website footer. Paste full profile/page URLs.",
    fields: [
      {
        key: "facebook",
        label: "Facebook",
        type: "url",
        placeholder: "https://facebook.com/yourpage",
        hint: "Full Facebook page URL",
      },
      {
        key: "twitter",
        label: "X (Twitter)",
        type: "url",
        placeholder: "https://x.com/yourhandle",
      },
      {
        key: "instagram",
        label: "Instagram",
        type: "url",
        placeholder: "https://instagram.com/yourhandle",
      },
      {
        key: "whatsapp",
        label: "WhatsApp",
        type: "url",
        placeholder: "https://wa.me/923001234567",
        hint: "Use wa.me link, e.g. https://wa.me/923001234567",
      },
      {
        key: "youtube",
        label: "YouTube",
        type: "url",
        placeholder: "https://youtube.com/@yourchannel",
      },
      {
        key: "tiktok",
        label: "TikTok",
        type: "url",
        placeholder: "https://tiktok.com/@yourhandle",
      },
      {
        key: "linkedin",
        label: "LinkedIn",
        type: "url",
        placeholder: "https://linkedin.com/company/yourorg",
      },
      {
        key: "telegram",
        label: "Telegram",
        type: "url",
        placeholder: "https://t.me/yourchannel",
      },
      {
        key: "threads",
        label: "Threads",
        type: "url",
        placeholder: "https://threads.net/@yourhandle",
      },
    ],
  },
  {
    key: "theme",
    title: "Theme & branding",
    titleUr: "تھیم اور برانڈنگ",
    fields: [
      {
        key: "accentColor",
        label: "Accent color",
        type: "color",
        placeholder: "#0B7A3B",
        hint: "Brand green default: #0B7A3B",
      },
      { key: "logoUrl", label: "Logo URL", type: "url", placeholder: "https://…" },
      { key: "faviconUrl", label: "Favicon URL", type: "url" },
      { key: "fontFamily", label: "Font family note", placeholder: "Noto Nastaliq Urdu / Source Serif" },
      { key: "customCss", label: "Custom CSS", type: "textarea", hint: "Optional advanced CSS" },
    ],
  },
  {
    key: "seo",
    title: "SEO defaults",
    titleUr: "SEO ڈیفالٹس",
    fields: [
      { key: "defaultTitle", label: "Default meta title", urdu: true },
      { key: "defaultDescription", label: "Default meta description", type: "textarea", urdu: true },
      { key: "ogImage", label: "Default OG image URL", type: "url" },
      {
        key: "twitterHandle",
        label: "X / Twitter @handle",
        placeholder: "@PakistanTimes",
        hint: "Used in Twitter cards (with or without @)",
      },
    ],
  },
  {
    key: "footer",
    title: "Footer text",
    titleUr: "فوٹر متن",
    fields: [
      {
        key: "aboutUr",
        label: "About blurb (Urdu)",
        labelUr: "تعارف (اردو)",
        type: "textarea",
        urdu: true,
      },
      { key: "aboutEn", label: "About blurb (English)", type: "textarea" },
      { key: "copyrightUr", label: "Copyright line (Urdu)", urdu: true },
      { key: "copyrightEn", label: "Copyright line (English)" },
    ],
  },
  {
    key: "integrations",
    title: "Integrations",
    titleUr: "انٹیگریشنز",
    description: "Optional analytics / search console IDs.",
    fields: [
      {
        key: "gaMeasurementId",
        label: "Google Analytics ID",
        placeholder: "G-XXXXXXXXXX",
      },
      {
        key: "gtmContainerId",
        label: "Google Tag Manager ID",
        placeholder: "GTM-XXXXXXX",
      },
      {
        key: "searchConsoleVerification",
        label: "Search Console verification meta",
        placeholder: "google-site-verification=…",
      },
    ],
  },
];

/** Legacy snake_case keys from older seed → canonical keys */
const LEGACY_ALIASES: Record<string, { group: string; key: string }> = {
  "general.site_name_ur": { group: "general", key: "siteNameUr" },
  "general.site_name_en": { group: "general", key: "siteNameEn" },
  "general.description": { group: "general", key: "taglineUr" },
  "theme.accent": { group: "theme", key: "accentColor" },
  "theme.font": { group: "theme", key: "fontFamily" },
  "custom.css": { group: "theme", key: "customCss" },
  "integrations.ga_measurement_id": { group: "integrations", key: "gaMeasurementId" },
};

export type SettingsMap = Record<string, Record<string, string>>;

export function emptySettingsMap(): SettingsMap {
  const map: SettingsMap = {};
  for (const g of SETTING_GROUPS) {
    map[g.key] = {};
    for (const f of g.fields) map[g.key][f.key] = "";
  }
  return map;
}

export function defaultSettingsMap(): SettingsMap {
  const map = emptySettingsMap();
  map.general.siteNameUr = "دی پاکستان ٹائمز اردو";
  map.general.siteNameEn = "The Pakistan Times";
  map.general.taglineUr = "آزاد، حقیقت پر مبنی صحافت";
  map.general.taglineEn = "Independent reporting from the newsroom";
  map.theme.accentColor = "#0B7A3B";
  map.seo.defaultTitle = "دی پاکستان ٹائمز اردو";
  map.seo.defaultDescription = "خبریں، تجزیے، لائیو کوریج";
  map.footer.aboutUr = "دی پاکستان ٹائمز اردو — آزاد صحافت، قومی اور عالمی کوریج۔";
  map.footer.aboutEn = "The Pakistan Times — independent journalism covering Pakistan and the world.";
  return map;
}

/** Normalize DB rows (including legacy keys) into the canonical nested map. */
export function normalizeSettingsMap(raw: SettingsMap): SettingsMap {
  const map = emptySettingsMap();

  for (const [group, entries] of Object.entries(raw || {})) {
    for (const [key, value] of Object.entries(entries || {})) {
      const alias = LEGACY_ALIASES[`${group}.${key}`];
      const targetGroup = alias?.group || group;
      const targetKey = alias?.key || key;
      if (!map[targetGroup]) map[targetGroup] = {};
      // Prefer non-empty values; don't overwrite filled canonical with empty legacy
      if (value || !map[targetGroup][targetKey]) {
        map[targetGroup][targetKey] = value ?? "";
      }
    }
  }
  return map;
}

export function flattenSettingsMap(
  map: SettingsMap,
): Array<{ group: string; key: string; value: string }> {
  const rows: Array<{ group: string; key: string; value: string }> = [];
  for (const [group, entries] of Object.entries(map || {})) {
    for (const [key, value] of Object.entries(entries || {})) {
      rows.push({ group, key, value: value ?? "" });
    }
  }
  return rows;
}

export const SOCIAL_LINK_KEYS = [
  "facebook",
  "twitter",
  "instagram",
  "whatsapp",
  "youtube",
  "tiktok",
  "linkedin",
  "telegram",
  "threads",
] as const;

export type SocialKey = (typeof SOCIAL_LINK_KEYS)[number];

export const SOCIAL_LABELS: Record<SocialKey, { en: string; ur: string }> = {
  facebook: { en: "Facebook", ur: "فیس بک" },
  twitter: { en: "X", ur: "ایکس" },
  instagram: { en: "Instagram", ur: "انسٹاگرام" },
  whatsapp: { en: "WhatsApp", ur: "واٹس ایپ" },
  youtube: { en: "YouTube", ur: "یوٹیوب" },
  tiktok: { en: "TikTok", ur: "ٹک ٹاک" },
  linkedin: { en: "LinkedIn", ur: "لنکڈ اِن" },
  telegram: { en: "Telegram", ur: "ٹیلی گرام" },
  threads: { en: "Threads", ur: "تھریڈز" },
};

/** Seed rows: [group, key, value] for all catalog fields + extras kept for publishing/media. */
export function seedSettingRows(extra: {
  defaultAuthorId?: string;
  defaultCategoryId?: string;
  uploadMaxMb?: string;
} = {}): Array<[string, string, string]> {
  const defaults = defaultSettingsMap();
  const rows: Array<[string, string, string]> = [];
  for (const g of SETTING_GROUPS) {
    for (const f of g.fields) {
      rows.push([g.key, f.key, defaults[g.key]?.[f.key] ?? ""]);
    }
  }
  if (extra.defaultAuthorId) rows.push(["publishing", "defaultAuthorId", extra.defaultAuthorId]);
  if (extra.defaultCategoryId) rows.push(["publishing", "defaultCategoryId", extra.defaultCategoryId]);
  rows.push(["media", "uploadMaxMb", extra.uploadMaxMb || "10"]);
  rows.push([
    "media",
    "allowedFormats",
    "jpg,jpeg,png,webp,avif,gif,mp4,mp3,pdf,doc,docx,xls,xlsx",
  ]);
  return rows;
}
