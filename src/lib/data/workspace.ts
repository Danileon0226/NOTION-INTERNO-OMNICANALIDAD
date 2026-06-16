import type { WorkspacePage } from "@/lib/types";

const now = "2026-06-16T12:00:00Z";

// Páginas iniciales del workspace tipo Notion para Zero Agency.
export const seedPages: WorkspacePage[] = [
  {
    id: "page-onboarding",
    title: "Bienvenido a Zero Agency OS",
    icon: "🚀",
    parentId: null,
    createdAt: now,
    updatedAt: now,
    blocks: [
      { id: "b1", type: "heading1", content: "Zero Agency OS" },
      {
        id: "b2",
        type: "callout",
        content:
          "Tu plataforma interna omnicanal: documentos tipo Notion + un dashboard alimentado por el correo de la agencia e integraciones con Drive, GitHub y Telegram.",
      },
      { id: "b3", type: "heading2", content: "Cómo empezar" },
      { id: "b4", type: "todo", content: "Revisar el Dashboard con el contexto de tu correo", checked: true },
      { id: "b5", type: "todo", content: "Conectar Google Drive para montar la carpeta de la Alcaldía", checked: false },
      { id: "b6", type: "todo", content: "Conectar GitHub para ver los repos de la agencia", checked: false },
      { id: "b7", type: "todo", content: "Activar el bot de Telegram para alertas", checked: false },
      { id: "b8", type: "divider", content: "" },
      { id: "b9", type: "heading2", content: "Espacios de trabajo" },
      { id: "b10", type: "bulleted", content: "Clientes — entregables y carpetas compartidas" },
      { id: "b11", type: "bulleted", content: "Finanzas — facturación y suscripciones (Shopify, etc.)" },
      { id: "b12", type: "bulleted", content: "Marketing — SEO, redes y campañas" },
    ],
  },
  {
    id: "page-clientes",
    title: "Clientes",
    icon: "🤝",
    parentId: null,
    createdAt: now,
    updatedAt: now,
    blocks: [
      { id: "c1", type: "heading1", content: "Clientes activos" },
      { id: "c2", type: "heading3", content: "Alcaldía — Contenido Gráfico" },
      { id: "c3", type: "text", content: "Carpeta compartida en Drive: 'CONTENIDO GRÁFICO ALCALDÍA' (vía THYAGO)." },
      { id: "c4", type: "todo", content: "Aceptar invitación de carpeta en Drive", checked: false },
      { id: "c5", type: "todo", content: "Definir cronograma de entregables", checked: false },
      { id: "c6", type: "heading3", content: "FME STORE" },
      { id: "c7", type: "text", content: "Tienda Shopify (storefme.com) — print on demand." },
      { id: "c8", type: "todo", content: "⚠️ Resolver pago fallido de la suscripción Shopify", checked: false },
    ],
  },
  {
    id: "page-finanzas",
    title: "Finanzas",
    icon: "💰",
    parentId: null,
    createdAt: now,
    updatedAt: now,
    blocks: [
      { id: "f1", type: "heading1", content: "Finanzas & Suscripciones" },
      {
        id: "f2",
        type: "callout",
        content: "⚠️ Shopify FME STORE: 2 intentos de cobro fallidos (25,00 USD). Próximo intento 18 de junio.",
      },
      { id: "f3", type: "heading3", content: "Suscripciones activas" },
      { id: "f4", type: "bulleted", content: "Shopify — FME STORE — 25 USD/mes — ❌ pago fallido" },
      { id: "f5", type: "todo", content: "Actualizar método de pago en Shopify", checked: false },
    ],
  },
];
