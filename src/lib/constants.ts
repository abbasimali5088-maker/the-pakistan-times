export const BRAND = {
  ur: process.env.NEXT_PUBLIC_SITE_NAME_UR || "دی پاکستان ٹائمز اردو",
  en: process.env.NEXT_PUBLIC_SITE_NAME_EN || "The Pakistan Times",
  accent: "#0B7A3B",
  ink: "#141414",
};

export const WORKFLOW_STEPS = [
  "draft",
  "review",
  "fact_check",
  "seo_check",
  "approval",
  "scheduled",
  "published",
] as const;

export const ARTICLE_STATUSES = [
  "draft",
  "pending_review",
  "rejected",
  "scheduled",
  "published",
  "unpublished",
  "archived",
] as const;

export const PRIORITIES = ["breaking", "high", "normal", "low"] as const;
