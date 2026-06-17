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
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={outfit.variable}>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
