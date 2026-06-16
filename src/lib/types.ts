// Tipos centrales de la plataforma omnicanal de Zero Agency.

export type EmailCategory =
  | "finanzas"
  | "colaboracion"
  | "marketing"
  | "seguridad"
  | "leads"
  | "comunidad"
  | "producto"
  | "otros";

export type Priority = "alta" | "media" | "baja";

export interface EmailItem {
  id: string;
  threadId: string;
  subject: string;
  sender: string;
  senderName: string;
  date: string; // ISO
  snippet: string;
  category: EmailCategory;
  priority: Priority;
  unread: boolean;
  /** Acción sugerida derivada del contexto del correo. */
  actionItem?: string;
  source: "gmail";
}

export type ConnectorId = "gmail" | "google-drive" | "github" | "telegram";

export type ConnectorStatus = "connected" | "disconnected" | "error" | "pending";

export interface Connector {
  id: ConnectorId;
  name: string;
  description: string;
  status: ConnectorStatus;
  /** Resumen corto que se muestra en la tarjeta del conector. */
  detail: string;
  lastSync?: string; // ISO
  /** Métricas rápidas mostradas en el dashboard. */
  metrics?: { label: string; value: string }[];
  docsUrl?: string;
}

// ── Workspace tipo Notion ────────────────────────────────────

export type BlockType =
  | "heading1"
  | "heading2"
  | "heading3"
  | "text"
  | "todo"
  | "bulleted"
  | "quote"
  | "divider"
  | "callout";

export interface Block {
  id: string;
  type: BlockType;
  content: string;
  checked?: boolean;
}

export interface WorkspacePage {
  id: string;
  title: string;
  icon: string; // emoji
  parentId: string | null;
  blocks: Block[];
  createdAt: string;
  updatedAt: string;
}

export interface DashboardMetric {
  label: string;
  value: string | number;
  hint?: string;
  trend?: "up" | "down" | "flat";
}
