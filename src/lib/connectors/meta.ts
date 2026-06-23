// Cliente de la Graph API de Meta (del lado del cliente).
// Cubre WhatsApp Cloud API, Facebook Pages e Instagram Business — todo sobre
// graph.facebook.com (admite CORS para GET con access_token; los POST de envío
// pueden requerir enrutar por servidor/n8n según la configuración de la app).
//
// El token se pasa como query param (evita preflight CORS). Es un token de larga
// duración (usuario de sistema o de página) que vive solo en el navegador, igual
// que el resto de credenciales del OS.

const GRAPH = "https://graph.facebook.com/v21.0";

export interface MetaConfig {
  accessToken: string; // token de larga duración (sistema/página)
  pageId: string; // ID de la página de Facebook
  igUserId: string; // ID de la cuenta de Instagram Business
  phoneNumberId: string; // WhatsApp Cloud API · Phone Number ID
  wabaId: string; // WhatsApp Business Account ID (opcional)
}

interface GraphOpts {
  method?: "GET" | "POST";
  body?: Record<string, unknown>;
  params?: Record<string, string | number | undefined>;
}

async function graph<T>(token: string, path: string, opts: GraphOpts = {}): Promise<T> {
  if (!token) throw new Error("Falta el token de acceso de Meta.");
  const url = new URL(`${GRAPH}/${path.replace(/^\//, "")}`);
  url.searchParams.set("access_token", token);
  for (const [k, v] of Object.entries(opts.params || {})) {
    if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
  }
  let res: Response;
  try {
    res = await fetch(url.toString(), {
      method: opts.method || "GET",
      headers: opts.body ? { "Content-Type": "application/json" } : undefined,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    // fetch rechaza por red o CORS (algunos POST de la Graph API no envían
    // cabeceras CORS desde el navegador).
    throw new Error(
      "No se pudo contactar la Graph API de Meta (red o CORS). Si es un envío (WhatsApp/publicar) y se bloquea por CORS, enrútalo por el servidor/n8n; las lecturas suelen funcionar desde el navegador."
    );
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = (data as { error?: { message?: string; error_user_msg?: string; code?: number } }).error;
    if (res.status === 401 || res.status === 403 || e?.code === 190) {
      throw new Error(`Token de Meta inválido o sin permisos: ${e?.message || res.status}. Genera un token de larga duración con los permisos correctos.`);
    }
    throw new Error(e?.error_user_msg || e?.message || `Meta Graph ${res.status}`);
  }
  return data as T;
}

// ── Identidad / validación ───────────────────────────────────
export interface MetaIdentity {
  id: string;
  name: string;
}
/** Valida el token devolviendo el nombre del usuario/sistema asociado. */
export function metaWhoAmI(token: string): Promise<MetaIdentity> {
  return graph<MetaIdentity>(token, "me", { params: { fields: "id,name" } });
}

// ── WhatsApp Cloud API ───────────────────────────────────────
/** Envía un mensaje de texto de WhatsApp a un número en formato E.164 (sin +). */
export async function waSendText(cfg: MetaConfig, to: string, body: string): Promise<{ id: string }> {
  const r = await graph<{ messages?: { id: string }[] }>(cfg.accessToken, `${cfg.phoneNumberId}/messages`, {
    method: "POST",
    body: {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: to.replace(/[^\d]/g, ""),
      type: "text",
      text: { preview_url: false, body },
    },
  });
  return { id: r.messages?.[0]?.id || "" };
}

/** Envía una plantilla de WhatsApp (las plantillas permiten iniciar conversación). */
export async function waSendTemplate(
  cfg: MetaConfig,
  to: string,
  template: string,
  lang = "es"
): Promise<{ id: string }> {
  const r = await graph<{ messages?: { id: string }[] }>(cfg.accessToken, `${cfg.phoneNumberId}/messages`, {
    method: "POST",
    body: {
      messaging_product: "whatsapp",
      to: to.replace(/[^\d]/g, ""),
      type: "template",
      template: { name: template, language: { code: lang } },
    },
  });
  return { id: r.messages?.[0]?.id || "" };
}

// ── Facebook Page ────────────────────────────────────────────
export interface FbPageInfo {
  name: string;
  fan_count?: number;
  followers_count?: number;
  link?: string;
}
export function fbPageInfo(cfg: MetaConfig): Promise<FbPageInfo> {
  return graph<FbPageInfo>(cfg.accessToken, cfg.pageId, {
    params: { fields: "name,fan_count,followers_count,link" },
  });
}

/** Publica una entrada en el feed de la página de Facebook. */
export function fbPagePost(cfg: MetaConfig, message: string, link?: string): Promise<{ id: string }> {
  return graph<{ id: string }>(cfg.accessToken, `${cfg.pageId}/feed`, {
    method: "POST",
    body: { message, ...(link ? { link } : {}) },
  });
}

export interface FbPost {
  id: string;
  message?: string;
  created_time: string;
  permalink_url?: string;
}
export async function fbRecentPosts(cfg: MetaConfig, n = 8): Promise<FbPost[]> {
  const r = await graph<{ data?: FbPost[] }>(cfg.accessToken, `${cfg.pageId}/posts`, {
    params: { fields: "message,created_time,permalink_url", limit: n },
  });
  return r.data || [];
}

// ── Instagram Business ───────────────────────────────────────
export interface IgInfo {
  username: string;
  followers_count?: number;
  media_count?: number;
  profile_picture_url?: string;
}
export function igInfo(cfg: MetaConfig): Promise<IgInfo> {
  return graph<IgInfo>(cfg.accessToken, cfg.igUserId, {
    params: { fields: "username,followers_count,media_count,profile_picture_url" },
  });
}

export interface IgMedia {
  id: string;
  caption?: string;
  media_type?: string;
  permalink?: string;
  timestamp?: string;
  like_count?: number;
  comments_count?: number;
}
export async function igMedia(cfg: MetaConfig, n = 8): Promise<IgMedia[]> {
  const r = await graph<{ data?: IgMedia[] }>(cfg.accessToken, `${cfg.igUserId}/media`, {
    params: { fields: "caption,media_type,permalink,timestamp,like_count,comments_count", limit: n },
  });
  return r.data || [];
}

/** Publica una imagen en Instagram (2 pasos: crear contenedor + publicar). */
export async function igPublishImage(cfg: MetaConfig, imageUrl: string, caption = ""): Promise<{ id: string }> {
  const container = await graph<{ id: string }>(cfg.accessToken, `${cfg.igUserId}/media`, {
    method: "POST",
    body: { image_url: imageUrl, caption },
  });
  return graph<{ id: string }>(cfg.accessToken, `${cfg.igUserId}/media_publish`, {
    method: "POST",
    body: { creation_id: container.id },
  });
}

// ── Insights ─────────────────────────────────────────────────
export interface InsightMetric {
  name: string;
  value: number;
}
/** Métricas recientes de Instagram (alcance, impresiones, visitas al perfil). */
export async function igInsights(cfg: MetaConfig): Promise<InsightMetric[]> {
  const r = await graph<{ data?: { name: string; values?: { value: number }[] }[] }>(
    cfg.accessToken,
    `${cfg.igUserId}/insights`,
    { params: { metric: "reach,impressions,profile_views", period: "day" } }
  );
  return (r.data || []).map((m) => ({ name: m.name, value: m.values?.[0]?.value ?? 0 }));
}

/** Resumen omnicanal de Meta para el banco de datos / agente. */
export interface MetaSnapshot {
  facebook?: { name: string; followers: number };
  instagram?: { username: string; followers: number; media: number };
}
export async function metaSnapshot(cfg: MetaConfig): Promise<MetaSnapshot> {
  const snap: MetaSnapshot = {};
  const tasks: Promise<void>[] = [];
  if (cfg.pageId)
    tasks.push(
      fbPageInfo(cfg)
        .then((p) => {
          snap.facebook = { name: p.name, followers: p.followers_count ?? p.fan_count ?? 0 };
        })
        .catch(() => {})
    );
  if (cfg.igUserId)
    tasks.push(
      igInfo(cfg)
        .then((i) => {
          snap.instagram = { username: i.username, followers: i.followers_count ?? 0, media: i.media_count ?? 0 };
        })
        .catch(() => {})
    );
  await Promise.allSettled(tasks);
  return snap;
}

/** Plantilla de alerta para WhatsApp (texto plano). */
export function waAlertText(kind: string, detail: string): string {
  return `🔔 ZERO Agency OS\n${kind}\n${detail}`;
}
