// Acceso a datos del lado del cliente. Sin datos de ejemplo: todo proviene de
// los conectores reales (Gmail en vivo). Funciona igual como export estático
// (GitHub Pages) o en Vercel.
import { computeMetrics, groupByCategory, actionItems } from "@/lib/dashboard";
import { AGENCY_EMAIL } from "@/lib/data/emails";
import type { DashboardMetric, EmailCategory, EmailItem } from "@/lib/types";

export interface EmailsData {
  email: string;
  syncedAt: string;
  metrics: DashboardMetric[];
  categories: { category: EmailCategory; count: number }[];
  actions: EmailItem[];
  emails: EmailItem[];
}

/** Estructura vacía mientras no haya Gmail conectado. */
export function emptyEmailsData(): EmailsData {
  return {
    email: AGENCY_EMAIL,
    syncedAt: new Date().toISOString(),
    metrics: computeMetrics([]),
    categories: [],
    actions: [],
    emails: [],
  };
}

/** Construye el snapshot de la bandeja a partir de correos reales de Gmail. */
export function buildEmailsData(emails: EmailItem[], email: string): EmailsData {
  return {
    email,
    syncedAt: new Date().toISOString(),
    metrics: computeMetrics(emails),
    categories: groupByCategory(emails),
    actions: actionItems(emails),
    emails,
  };
}
