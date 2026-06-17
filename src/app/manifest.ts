import type { MetadataRoute } from "next";

const base = process.env.NEXT_PUBLIC_BASE_PATH || "";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ZERO AGENCY · OS Omnicanal",
    short_name: "ZERO OS",
    description:
      "Workspace omnicanal de ZERO AGENCY: dashboard, editor tipo Notion y ZERO, el gestor de IA que orquesta Gmail, Drive, Calendar, GitHub y Telegram.",
    start_url: `${base}/dashboard`,
    scope: `${base}/`,
    display: "standalone",
    background_color: "#0c0a14",
    theme_color: "#5b3fa6",
    icons: [
      { src: `${base}/icon.png`, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: `${base}/icon.png`, sizes: "192x192", type: "image/png", purpose: "maskable" },
    ],
  };
}
