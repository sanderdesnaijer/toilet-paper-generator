import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { getSiteUrl } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = getSiteUrl();
const siteTitle = "3D Toilet Paper Generator";
const siteDescription =
  "Interactive 3D toilet roll built with Three.js. Drag to unroll and print real toilet paper lengths to a thermal ESC/POS printer.";
const gtmId = process.env.NEXT_PUBLIC_GTM_ID?.trim();

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: {
    default: siteTitle,
    template: `%s | ${siteTitle}`,
  },
  description: siteDescription,
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    shortcut: ["/favicon.ico"],
  },
  manifest: "/site.webmanifest",
  keywords: [
    "Three.js physics demo",
    "Next.js 3D app",
    "ESC POS printing",
    "thermal printer TCP",
    "React Three Fiber",
    "Rapier physics",
    "WebGL cloth simulation",
  ],
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: siteTitle,
    description: "Drag a realistic 3D toilet roll and print the exact length.",
    url: siteUrl,
    siteName: siteTitle,
    images: [
      {
        url: "/og/og-image-1200x630.webp",
        width: 1200,
        height: 630,
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: "Three.js + Rapier physics + ESC/POS printing.",
    images: ["/og/og-image-1200x630.webp"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const softwareAppJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: siteTitle,
    applicationCategory: "WebApplication",
    operatingSystem: "Web",
    description:
      "Interactive Three.js toilet roll simulation that prints to ESC/POS thermal printers.",
    url: siteUrl.toString(),
  };

  return (
    <html lang="en">
      <head>
        {gtmId ? (
          <Script id="gtm-script" strategy="beforeInteractive">
            {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');`}
          </Script>
        ) : null}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {gtmId ? (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
            />
          </noscript>
        ) : null}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(softwareAppJsonLd),
          }}
        />
        <SettingsProvider>
          <main>{children}</main>
        </SettingsProvider>
      </body>
    </html>
  );
}
