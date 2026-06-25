import { Providers } from "@/components/providers";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Plataforma Kallpa", template: "%s | Kallpa Nexus" },
  description: "Consola de operación SaaS — empresas, tenants y planes.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" data-platform-theme="light" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("knx-platform-theme");document.documentElement.setAttribute("data-platform-theme",t==="dark"?"dark":"light");}catch(e){}})();`,
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
