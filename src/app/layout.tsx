import type { Metadata, Viewport } from "next";
import { Noto_Nastaliq_Urdu, Source_Serif_4, Source_Sans_3 } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { BRAND } from "@/lib/constants";
import { LANG_COOKIE, normalizeLang } from "@/lib/language";

const notoNastaliq = Noto_Nastaliq_Urdu({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-nastaliq",
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-source-serif",
  display: "swap",
});

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-source-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: BRAND.ur,
    template: `%s | ${BRAND.ur}`,
  },
  description: "پاکستان اور دنیا کی تازہ ترین خبریں، تجزیے اور لائیو کوریج",
  applicationName: BRAND.en,
  manifest: "/manifest.webmanifest",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://127.0.0.1:4321",
  ),
  openGraph: {
    siteName: BRAND.en,
    locale: "ur_PK",
    type: "website",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: BRAND.accent,
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jar = await cookies();
  const lang = normalizeLang(jar.get(LANG_COOKIE)?.value);
  const dir = lang === "ur" ? "rtl" : "ltr";

  return (
    <html
      lang={lang}
      dir={dir}
      className={`${notoNastaliq.variable} ${sourceSerif.variable} ${sourceSans.variable}`}
    >
      <body className="antialiased">{children}</body>
    </html>
  );
}
