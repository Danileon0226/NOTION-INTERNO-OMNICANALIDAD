import type { EmailItem, EmailCategory } from "@/lib/types";

// ─────────────────────────────────────────────────────────────
//  DATOS DE EJEMPLO (demo pública)
//  Correos ficticios y anonimizados que representan el flujo típico
//  de una agencia. En producción este módulo se reemplaza por la
//  sincronización vía OAuth de Gmail con la cuenta real de la agencia;
//  la estructura es idéntica a la que devolvería esa integración.
// ─────────────────────────────────────────────────────────────

// Correo de la agencia para mostrar en la UI. Configurable por entorno
// (NEXT_PUBLIC_AGENCY_EMAIL) para no fijar datos reales en el repositorio.
export const AGENCY_EMAIL =
  process.env.NEXT_PUBLIC_AGENCY_EMAIL || "equipo@zeroagency.example";

export const seedEmails: EmailItem[] = [
  {
    id: "demo-001",
    threadId: "demo-001",
    subject: "Falló el pago de la suscripción — Tienda Aurora",
    sender: "billing@checkout.example",
    senderName: "Checkout Billing",
    date: "2026-06-16T13:07:54Z",
    snippet:
      "No pudimos procesar el pago de la última factura por 25,00 USD de la Tienda Aurora. Reintento programado para el 18 de junio.",
    category: "finanzas",
    priority: "alta",
    unread: true,
    actionItem: "Actualizar el método de pago de Tienda Aurora antes del 18 de junio.",
    source: "gmail",
  },
  {
    id: "demo-002",
    threadId: "demo-002",
    subject: "Recordatorio: factura pendiente — Cliente Montaña Viva",
    sender: "facturacion@montanaviva.example",
    senderName: "Montaña Viva",
    date: "2026-06-14T13:20:11Z",
    snippet:
      "La factura #0142 por 480,00 USD del retainer mensual vence en 3 días.",
    category: "finanzas",
    priority: "alta",
    unread: true,
    actionItem: "Enviar la factura #0142 del retainer de Montaña Viva.",
    source: "gmail",
  },
  {
    id: "demo-003",
    threadId: "demo-003",
    subject: 'Se compartió una carpeta contigo: "Campaña Gráfica Q3"',
    sender: "drive-shares-noreply@drive.example",
    senderName: "Drive · Estudio Pixel",
    date: "2026-06-15T20:46:36Z",
    snippet:
      "Estudio Pixel te invitó a colaborar en la carpeta compartida: Campaña Gráfica Q3 — Cliente Montaña Viva.",
    category: "colaboracion",
    priority: "media",
    unread: true,
    actionItem: "Revisar los entregables de la carpeta 'Campaña Gráfica Q3'.",
    source: "gmail",
  },
  {
    id: "demo-004",
    threadId: "demo-004",
    subject: "Nuevo lead desde el formulario de contacto",
    sender: "no-reply@forms.example",
    senderName: "Formularios Web",
    date: "2026-06-16T09:12:00Z",
    snippet:
      "Laura Méndez (Cafetería del Parque) solicitó una propuesta de branding y manejo de redes.",
    category: "leads",
    priority: "alta",
    unread: true,
    actionItem: "Agendar llamada de descubrimiento con Cafetería del Parque (branding + redes).",
    source: "gmail",
  },
  {
    id: "demo-005",
    threadId: "demo-005",
    subject: "Felicidades por alcanzar 240 clics en 28 días",
    sender: "noreply@searchconsole.example",
    senderName: "Search Console",
    date: "2026-06-16T05:20:18Z",
    snippet:
      "El sitio aurora-store.example alcanzó 240 clics desde la Búsqueda en los últimos 28 días (+32%).",
    category: "marketing",
    priority: "baja",
    unread: true,
    actionItem: "Documentar el crecimiento SEO de Aurora Store en el reporte mensual.",
    source: "gmail",
  },
  {
    id: "demo-006",
    threadId: "demo-006",
    subject: "Resumen de campaña: Meta Ads — Montaña Viva",
    sender: "reports@adsplatform.example",
    senderName: "Ads Platform",
    date: "2026-06-15T11:47:02Z",
    snippet:
      "CTR 3,4% · CPC 0,28 USD · 18 conversiones esta semana. Presupuesto consumido al 76%.",
    category: "marketing",
    priority: "media",
    unread: true,
    actionItem: "Reasignar presupuesto de Meta Ads de Montaña Viva para cerrar la semana.",
    source: "gmail",
  },
  {
    id: "demo-007",
    threadId: "demo-007",
    subject: "Alerta de seguridad — Nuevo acceso a la cuenta del equipo",
    sender: "no-reply@accounts.example",
    senderName: "Cuenta del equipo",
    date: "2026-06-16T03:26:23Z",
    snippet:
      "Detectamos un nuevo inicio de sesión en la cuenta compartida del equipo desde un dispositivo nuevo.",
    category: "seguridad",
    priority: "alta",
    unread: true,
    actionItem: "Verificar el nuevo acceso y revisar dispositivos autorizados del equipo.",
    source: "gmail",
  },
  {
    id: "demo-008",
    threadId: "demo-008",
    subject: "Tu dominio cafeteriadelparque.example se renueva pronto",
    sender: "renewals@domains.example",
    senderName: "Registro de Dominios",
    date: "2026-06-13T08:00:00Z",
    snippet: "El dominio del cliente Cafetería del Parque se renueva automáticamente el 30 de junio.",
    category: "finanzas",
    priority: "media",
    unread: false,
    actionItem: "Confirmar con el cliente la renovación del dominio antes del 30 de junio.",
    source: "gmail",
  },
  {
    id: "demo-009",
    threadId: "demo-009",
    subject: "Aprobación pendiente: propuesta de identidad visual",
    sender: "hola@montanaviva.example",
    senderName: "Montaña Viva",
    date: "2026-06-12T16:30:00Z",
    snippet: "Nos encantó la primera ronda. ¿Podemos ver dos variantes más del logotipo?",
    category: "colaboracion",
    priority: "media",
    unread: false,
    actionItem: "Preparar 2 variantes adicionales del logotipo para Montaña Viva.",
    source: "gmail",
  },
  {
    id: "demo-010",
    threadId: "demo-010",
    subject: "Tienes 3 nuevas conexiones esperando respuesta",
    sender: "notifications@network.example",
    senderName: "Red Profesional",
    date: "2026-06-15T00:28:12Z",
    snippet: "3 personas de tu sector quieren conectar contigo.",
    category: "comunidad",
    priority: "baja",
    unread: true,
    source: "gmail",
  },
  {
    id: "demo-011",
    threadId: "demo-011",
    subject: "Novedades de tu herramienta de diseño",
    sender: "news@designtool.example",
    senderName: "Design Tool",
    date: "2026-06-16T10:14:33Z",
    snippet: "Nuevas funciones de colaboración en tiempo real disponibles en tu plan.",
    category: "producto",
    priority: "baja",
    unread: true,
    source: "gmail",
  },
  {
    id: "demo-012",
    threadId: "demo-012",
    subject: "Invitación: webinar de automatización con IA para agencias",
    sender: "eventos@webinars.example",
    senderName: "Webinars",
    date: "2026-06-11T14:05:24Z",
    snippet: "Aprende a automatizar reportes y atención al cliente con IA. Jueves 4:00 p. m.",
    category: "producto",
    priority: "baja",
    unread: false,
    actionItem: "Evaluar el webinar de automatización con IA para el equipo.",
    source: "gmail",
  },
];

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
