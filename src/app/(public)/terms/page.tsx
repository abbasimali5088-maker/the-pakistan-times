import type { Metadata } from "next";
import { StaticPageView, staticPageMetadata } from "@/components/public/StaticPageView";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
  return staticPageMetadata("terms");
}

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  return <StaticPageView routeSlug="terms" searchParams={searchParams} />;
}
