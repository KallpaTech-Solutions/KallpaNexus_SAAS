import { TenantGoogleAnalytics } from "@/components/analytics/tenant-google-analytics";
import { Providers } from "@/components/providers";
import { readGaMeasurementId } from "@/lib/google-analytics";
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
  const gaId = readGaMeasurementId();

  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
        {gaId ? <TenantGoogleAnalytics measurementId={gaId} /> : null}
      </body>
    </html>
  );
}
