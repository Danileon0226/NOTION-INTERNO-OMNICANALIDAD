import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/AppShell";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ZERO AGENCY · OS Omnicanal",
  description:
    "Plataforma interna de ZERO AGENCY: workspace tipo Notion, dashboard omnicanal y ZERO, el gestor de IA que orquesta Gmail, Drive, GitHub, Calendar y Telegram.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#5e20be" },
    { media: "(prefers-color-scheme: dark)", color: "#0e002b" },
  ],
};

// CSP también como <meta> para la exportación estática (GitHub Pages no puede
// enviar cabeceras). DEBE coincidir con la de next.config.js (Vercel).
const CSP_META = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline' https://accounts.google.com https://apis.google.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https:",
  "frame-src 'self' https://accounts.google.com",
  "child-src 'self' blob:",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "upgrade-insecure-requests",
].join("; ");

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={outfit.variable}>
      <head>
        <meta httpEquiv="Content-Security-Policy" content={CSP_META} />
      </head>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
