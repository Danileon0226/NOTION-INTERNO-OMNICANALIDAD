// Cliente de Google del lado del cliente: OAuth (Google Identity Services),
// Gmail API y Drive API. No requiere client secret — usa el flujo de token
// para apps de navegador (initTokenClient).

import type { EmailItem, EmailCategory, Priority } from "@/lib/types";

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    google?: any;
  }
}

const GIS_SRC = "https://accounts.google.com/gsi/client";

export function loadGis(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("SSR"));
    if (window.google?.accounts?.oauth2) return resolve();
    const existing = document.querySelector(`script[src="${GIS_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("No se pudo cargar Google Identity")));
      return;
    }
    const s = document.createElement("script");
    s.src = GIS_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("No se pudo cargar Google Identity Services"));
    document.head.appendChild(s);
  });
}

export interface GoogleToken {
  access_token: string;
  expires_in: number;
  scope: string;
}

/** Abre el consentimiento OAuth de Google y devuelve un access token. */
export async function requestGoogleToken(clientId: string, scopes: string[]): Promise<GoogleToken> {
  await loadGis();
  return new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: scopes.join(" "),
      callback: (resp: any) => {
        if (resp.error) return reject(new Error(resp.error_description || resp.error));
        resolve({ access_token: resp.access_token, expires_in: resp.expires_in, scope: resp.scope });
      },
      error_callback: (err: any) => reject(new Error(err?.message || "OAuth cancelado")),
    });
    client.requestAccessToken({ prompt: "" });
  });
}

async function gapi<T>(url: string, token: string): Promise<T> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as any)?.error?.message || `Google API ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ── Gmail ────────────────────────────────────────────────────

export interface GmailProfile {
  emailAddress: string;
  messagesTotal: number;
  threadsTotal: number;
}

export function gmailProfile(token: string): Promise<GmailProfile> {
  return gapi<GmailProfile>("https://gmail.googleapis.com/gmail/v1/users/me/profile", token);
}

interface GmailMsgMeta {
  id: string;
  threadId: string;
  snippet: string;
  labelIds?: string[];
  payload?: { headers?: { name: string; value: string }[] };
}

export async function gmailFetchInbox(token: string, max = 12): Promise<EmailItem[]> {
  return gmailSearch(token, "in:inbox", max);
}

/** Búsqueda en Gmail con sintaxis nativa (q). */
export async function gmailSearch(token: string, q: string, max = 12): Promise<EmailItem[]> {
  const list = await gapi<{ messages?: { id: string; threadId: string }[] }>(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${max}&q=${encodeURIComponent(q)}`,
    token
  );
  const ids = list.messages ?? [];
  const metas = await Promise.all(
    ids.map((m) =>
      gapi<GmailMsgMeta>(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
        token
      ).catch(() => null)
    )
  );
  return metas.filter((m): m is GmailMsgMeta => !!m).map(mapGmail);
}

function header(meta: GmailMsgMeta, name: string): string {
  return meta.payload?.headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";
}

function mapGmail(meta: GmailMsgMeta): EmailItem {
  const from = header(meta, "From");
  const subject = header(meta, "Subject") || "(sin asunto)";
  const dateRaw = header(meta, "Date");
  const match = from.match(/^\s*"?([^"<]*)"?\s*<?([^>]*)>?/);
  const senderName = (match?.[1] || from).trim() || from;
  const sender = (match?.[2] || from).trim();
  const { category, priority, actionItem } = classify(subject, sender, meta.snippet);
  return {
    id: meta.id,
    threadId: meta.threadId,
    subject,
    sender,
    senderName,
    date: dateRaw ? new Date(dateRaw).toISOString() : new Date().toISOString(),
    snippet: decodeHtml(meta.snippet || ""),
    category,
    priority,
    unread: meta.labelIds?.includes("UNREAD") ?? false,
    actionItem,
    source: "gmail",
  };
}

function decodeHtml(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

const RULES: { re: RegExp; category: EmailCategory; priority: Priority; action?: string }[] = [
  { re: /(invoice|factura|payment|pago|billing|shopify|stripe|cobro)/i, category: "finanzas", priority: "alta", action: "Revisar facturación / pago." },
  { re: /(security|seguridad|alert|verify|verifica|sign-?in|acceso|password)/i, category: "seguridad", priority: "alta", action: "Verificar alerta de seguridad." },
  { re: /(drive|shared|compartió|carpeta|document|file)/i, category: "colaboracion", priority: "media", action: "Revisar archivo/carpeta compartida." },
  { re: /(seo|search console|analytics|campaign|campaña|ads|marketing)/i, category: "marketing", priority: "baja" },
  { re: /(lead|propuesta|proposal|cotización|quote|demo|cliente)/i, category: "leads", priority: "media", action: "Dar seguimiento al lead." },
  { re: /(linkedin|facebook|community|comunidad|group|grupo|newsletter)/i, category: "comunidad", priority: "baja" },
];

function classify(subject: string, sender: string, snippet: string): {
  category: EmailCategory;
  priority: Priority;
  actionItem?: string;
} {
  const hay = `${subject} ${sender} ${snippet}`;
  for (const r of RULES) {
    if (r.re.test(hay)) return { category: r.category, priority: r.priority, actionItem: r.action };
  }
  return { category: "producto", priority: "baja" };
}

// ── Drive ────────────────────────────────────────────────────

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  webViewLink?: string;
  iconLink?: string;
  shared?: boolean;
  owners?: { displayName: string; emailAddress: string }[];
}

export interface DriveQuery {
  /** Lista el contenido de una carpeta concreta. */
  parentId?: string;
  /** Búsqueda por nombre (name contains). */
  query?: string;
}

export async function driveList(token: string, max = 12, opts: DriveQuery = {}): Promise<DriveFile[]> {
  const clauses = ["trashed = false"];
  if (opts.parentId) clauses.push(`'${opts.parentId}' in parents`);
  if (opts.query) clauses.push(`name contains '${opts.query.replace(/'/g, "\\'")}'`);
  const fields =
    "files(id,name,mimeType,modifiedTime,webViewLink,iconLink,shared,owners(displayName,emailAddress))";
  const params = new URLSearchParams({
    pageSize: String(max),
    q: clauses.join(" and "),
    orderBy: "folder,modifiedTime desc",
    fields,
    supportsAllDrives: "true",
    includeItemsFromAllDrives: "true",
  });
  const data = await gapi<{ files: DriveFile[] }>(
    `https://www.googleapis.com/drive/v3/files?${params.toString()}`,
    token
  );
  return data.files ?? [];
}

export function isFolder(f: DriveFile): boolean {
  return f.mimeType === "application/vnd.google-apps.folder";
}

// ── Calendar ─────────────────────────────────────────────────

export interface CalendarEvent {
  id: string;
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  location?: string;
  htmlLink?: string;
}

export async function calendarEvents(token: string, max = 10): Promise<CalendarEvent[]> {
  const params = new URLSearchParams({
    maxResults: String(max),
    orderBy: "startTime",
    singleEvents: "true",
    timeMin: new Date().toISOString(),
  });
  const data = await gapi<{ items: CalendarEvent[] }>(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
    token
  );
  return data.items ?? [];
}
