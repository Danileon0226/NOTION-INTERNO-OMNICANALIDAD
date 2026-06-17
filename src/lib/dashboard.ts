import type { EmailItem, EmailCategory, DashboardMetric } from "@/lib/types";

export function computeMetrics(emails: EmailItem[]): DashboardMetric[] {
  const unread = emails.filter((e) => e.unread).length;
  const actions = emails.filter((e) => e.actionItem).length;
  const high = emails.filter((e) => e.priority === "alta").length;
  const finance = emails.filter((e) => e.category === "finanzas").length;

  return [
    { label: "Correos sin leer", value: unread, hint: "bandeja de la agencia" },
    { label: "Acciones sugeridas", value: actions, hint: "derivadas por IA", trend: "up" },
    { label: "Prioridad alta", value: high, hint: "requieren atención", trend: high > 0 ? "up" : "flat" },
    { label: "Alertas de finanzas", value: finance, hint: "facturación / pagos", trend: finance > 0 ? "down" : "flat" },
  ];
}

export function groupByCategory(emails: EmailItem[]): { category: EmailCategory; count: number }[] {
  const map = new Map<EmailCategory, number>();
  for (const e of emails) {
    map.set(e.category, (map.get(e.category) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);
}

export function actionItems(emails: EmailItem[]): EmailItem[] {
  const order = { alta: 0, media: 1, baja: 2 } as const;
  return emails
    .filter((e) => e.actionItem)
    .sort((a, b) => order[a.priority] - order[b.priority]);
}
