import type { Connector } from "@/lib/types";

// Estado de los conectores omnicanal. En producción el `status` y las
// `metrics` se hidratan desde cada API (Gmail, Drive, GitHub, Telegram).
export const seedConnectors: Connector[] = [
  {
    id: "gmail",
    name: "Gmail · Correo de la agencia",
    description:
      "Sincroniza la bandeja del correo de la agencia y clasifica los correos en categorías accionables para el dashboard.",
    status: "connected",
    detail: "Bandeja sincronizada · 12 hilos clasificados",
    lastSync: "2026-06-16T19:05:00Z",
    metrics: [
      { label: "No leídos", value: "12" },
      { label: "Acciones", value: "7" },
    ],
    docsUrl: "https://developers.google.com/gmail/api",
  },
  {
    id: "google-drive",
    name: "Google Drive",
    description:
      "Monta carpetas y archivos compartidos con la agencia. Detecta entregables de clientes como la carpeta 'Campaña Gráfica Q3'.",
    status: "pending",
    detail: "1 carpeta compartida pendiente de aceptar",
    metrics: [
      { label: "Compartidas", value: "1" },
      { label: "Archivos", value: "—" },
    ],
    docsUrl: "https://developers.google.com/drive/api",
  },
  {
    id: "github",
    name: "GitHub",
    description:
      "Conecta repositorios de la agencia para ver issues, PRs y actividad de CI directamente en el workspace.",
    status: "disconnected",
    detail: "Sin conectar — añade un token o instala la GitHub App",
    metrics: [
      { label: "Repos", value: "—" },
      { label: "PRs abiertos", value: "—" },
    ],
    docsUrl: "https://docs.github.com/rest",
  },
  {
    id: "telegram",
    name: "Telegram",
    description:
      "Bot de notificaciones omnicanal: envía alertas de finanzas, seguridad y entregables al chat del equipo.",
    status: "disconnected",
    detail: "Sin conectar — configura TELEGRAM_BOT_TOKEN",
    metrics: [
      { label: "Chats", value: "—" },
      { label: "Alertas hoy", value: "—" },
    ],
    docsUrl: "https://core.telegram.org/bots/api",
  },
];
