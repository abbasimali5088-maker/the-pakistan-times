import { Suspense } from "react";
import ArticlesClient from "./ArticlesClient";

export default function ArticlesPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Loading articles…</p>}>
      <ArticlesClient />
    </Suspense>
  );
}
