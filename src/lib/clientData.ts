// Acceso a datos del lado del cliente. Permite que la app funcione como
// exportación estática (GitHub Pages) sin depender de las API routes,
// y también en Vercel sin cambios.
import { seedEmails } from "@/lib/data/emails";
import { seedConnectors } from "@/lib/data/connectors";
import { computeMetrics, groupByCategory, actionItems } from "@/lib/dashboard";
import { AGENCY_EMAIL } from "@/lib/data/emails";
import type { Connector, DashboardMetric, EmailCategory, EmailItem } from "@/lib/types";

export interface EmailsData {
  email: string;
  syncedAt: string;
  metrics: DashboardMetric[];
  categories: { category: EmailCategory; count: number }[];
  actions: EmailItem[];
  emails: EmailItem[];
}

export function getEmailsData(): EmailsData {
  const emails = seedEmails;
  return {
    email: AGENCY_EMAIL,
    syncedAt: new Date().toISOString(),
    metrics: computeMetrics(emails),
    categories: groupByCategory(emails),
    actions: actionItems(emails),
    emails,
  };
}

export function getConnectors(): Connector[] {
  return seedConnectors;
}
