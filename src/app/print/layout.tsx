import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Classic Print Mode",
  description:
    "Print thermal paper sheets directly with ESC/POS settings and pattern controls.",
  alternates: {
    canonical: "/print",
  },
};

export default function PrintLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
