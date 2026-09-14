import type { Lang } from "@/lib/language";

export function EmptyState({
  lang,
  title,
  description,
}: {
  lang: Lang;
  title?: string;
  description?: string;
}) {
  return (
    <div className="empty-state">
      <h2 className="mb-2 text-xl text-[var(--ink)]">
        {title || (lang === "ur" ? "ابھی کچھ دستیاب نہیں" : "Nothing here yet")}
      </h2>
      <p>
        {description ||
          (lang === "ur"
            ? "جیسے ہی نیا مواد شائع ہوگا، یہاں نظر آئے گا۔"
            : "New stories will appear here once published.")}
      </p>
    </div>
  );
}
