import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "Zero Agency OS · Notion Interno Omnicanal",
  description:
    "Plataforma interna tipo Notion con dashboard alimentado por el correo de la agencia e integraciones omnicanal (Gmail, Drive, GitHub, Telegram).",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <div className="flex h-screen w-screen overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto bg-bg">{children}</main>
        </div>
      </body>
    </html>
  );
}
