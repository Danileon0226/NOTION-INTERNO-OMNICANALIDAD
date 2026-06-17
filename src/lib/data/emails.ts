import type { EmailCategory } from "@/lib/types";

// Configuración de presentación de la bandeja. Los correos llegan SIEMPRE en
// vivo desde Gmail (OAuth) — aquí ya no hay datos de ejemplo.

// Correo de la agencia para la UI cuando aún no hay sesión de Gmail.
// Configurable por entorno (NEXT_PUBLIC_AGENCY_EMAIL).
export const AGENCY_EMAIL = process.env.NEXT_PUBLIC_AGENCY_EMAIL || "";

export const categoryLabels: Record<EmailCategory, string> = {
  finanzas: "Finanzas",
  colaboracion: "Colaboración",
  marketing: "Marketing & SEO",
  seguridad: "Seguridad",
  leads: "Leads",
  comunidad: "Comunidad",
  producto: "Producto",
  otros: "Otros",
};

export const categoryColors: Record<EmailCategory, string> = {
  finanzas: "#ef4444",
  colaboracion: "#3b82f6",
  marketing: "#f59e0b",
  seguridad: "#dc2626",
  leads: "#10b981",
  comunidad: "#8b5cf6",
  producto: "#06b6d4",
  otros: "#6b7280",
};
