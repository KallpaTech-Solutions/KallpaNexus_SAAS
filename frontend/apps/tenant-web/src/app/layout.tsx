import { PublicGoogleTagManagerPageViews } from "@/components/analytics/public-google-tag-manager";
import { Providers } from "@/components/providers";
import { readGtmId } from "@/lib/gtm";
import { GoogleTagManager } from "@next/third-parties/google";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Kallpa Nexus",
    template: "%s | Kallpa Nexus",
  },
  description:
    "Plataforma SaaS multi-negocio. Nexus Sport para canchas y reservas; ecosistema Stay, Care y Gear en expansión.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const gtmId = readGtmId();

  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <PublicGoogleTagManagerPageViews />
        <Providers>{children}</Providers>
      </body>
      {gtmId ? <GoogleTagManager gtmId={gtmId} /> : null}
    </html>
  );
}
