import Link from "next/link";
import type { Lang } from "@/lib/language";

export function Pagination({
  page,
  totalPages,
  lang,
  basePath,
  query = {},
}: {
  page: number;
  totalPages: number;
  lang: Lang;
  basePath: string;
  query?: Record<string, string>;
}) {
  if (totalPages <= 1) return null;

  function href(p: number) {
    const sp = new URLSearchParams(query);
    sp.set("page", String(p));
    const q = sp.toString();
    return `${basePath}?${q}`;
  }

  return (
    <nav className="ui-sans mt-8 flex items-center justify-center gap-3" aria-label="Pagination">
      {page > 1 ? (
        <Link href={href(page - 1)} className="btn-ghost btn">
          {lang === "ur" ? "پچھلا" : "Previous"}
        </Link>
      ) : (
        <span className="btn btn-ghost opacity-40">{lang === "ur" ? "پچھلا" : "Previous"}</span>
      )}
      <span className="meta">
        {lang === "ur" ? `صفحہ ${page} از ${totalPages}` : `Page ${page} of ${totalPages}`}
      </span>
      {page < totalPages ? (
        <Link href={href(page + 1)} className="btn">
          {lang === "ur" ? "اگلا" : "Next"}
        </Link>
      ) : (
        <span className="btn opacity-40">{lang === "ur" ? "اگلا" : "Next"}</span>
      )}
    </nav>
  );
}
