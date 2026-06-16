import { NextResponse } from "next/server";
import { seedEmails } from "@/lib/data/emails";
import { computeMetrics, groupByCategory, actionItems } from "@/lib/dashboard";

// GET /api/emails
// Devuelve los correos clasificados de la agencia + métricas derivadas.
// En producción este handler intercambia `seedEmails` por una llamada a la
// API de Gmail usando el token OAuth de la cuenta de la agencia.
export async function GET() {
  const emails = seedEmails;
  return NextResponse.json({
    email: "principal.zeroagency@gmail.com",
    syncedAt: new Date().toISOString(),
    metrics: computeMetrics(emails),
    categories: groupByCategory(emails),
    actions: actionItems(emails),
    emails,
  });
}
