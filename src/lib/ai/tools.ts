"use client";

// Herramientas que Gemini puede invocar (function calling). Cada herramienta
// es un conector real de la plataforma; Gemini actúa como gestor único.

import {
  useConnectors,
  googleTokenValid,
  GMAIL_SCOPE,
  DRIVE_SCOPE,
  CALENDAR_SCOPE,
} from "@/lib/connectors/store";
import { gmailSearch, driveList, calendarEvents } from "@/lib/connectors/google";
import { ghFetchAll } from "@/lib/connectors/github";
import { tgSendMessage, alertText } from "@/lib/connectors/telegram";
import { useWorkspace } from "@/lib/store";
import { useActivity, type ActivitySource } from "@/lib/activity";
import type { Block } from "@/lib/types";

/* eslint-disable @typescript-eslint/no-explicit-any */

// Declaraciones en formato OpenAPI que entiende Gemini.
export const toolDeclarations = [
  {
    name: "gmail_search",
    description:
      "Busca correos en la bandeja real de Gmail con sintaxis Gmail (p. ej. 'is:unread', 'from:cliente', 'factura'). Devuelve asunto, remitente, fecha y categoría.",
    parameters: {
      type: "object",
      properties: { query: { type: "string", description: "Consulta Gmail. Por defecto 'in:inbox'." } },
    },
  },
  {
    name: "drive_search",
    description: "Lista o busca archivos/carpetas en Google Drive por nombre.",
    parameters: {
      type: "object",
      properties: { query: { type: "string", description: "Texto a buscar en el nombre (opcional)." } },
    },
  },
  {
    name: "calendar_upcoming",
    description: "Devuelve los próximos eventos del calendario de Google.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "github_overview",
    description: "Resumen de GitHub: repos, PRs e issues abiertos de un usuario/organización.",
    parameters: {
      type: "object",
      properties: { account: { type: "string", description: "Usuario u organización (opcional)." } },
    },
  },
  {
    name: "telegram_alert",
    description: "Envía una alerta/mensaje al chat de Telegram del equipo.",
    parameters: {
      type: "object",
      properties: { text: { type: "string", description: "Mensaje a enviar." } },
      required: ["text"],
    },
  },
  {
    name: "create_note",
    description: "Crea una página/nota en el workspace tipo Notion con un título y contenido.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        content: { type: "string", description: "Contenido; cada línea es un párrafo. Usa '- ' para tareas." },
      },
      required: ["title"],
    },
  },
  {
    name: "list_notes",
    description: "Lista los títulos de las páginas existentes en el workspace.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "analyze_agency",
    description:
      "Analítica consolidada en tiempo real de la agencia: métricas de Gmail (no leídos, categorías), GitHub (repos/PRs/issues), Drive y Calendar de los conectores conectados. Úsala para reportes y análisis de datos.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "create_webpage",
    description:
      "Crea una página web (landing/sitio) en el workspace. Pasa el HTML COMPLETO y autónomo (con <style> y, si hace falta, <script>). Se renderiza y se puede abrir/descargar.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        html: { type: "string", description: "Documento HTML completo (<!doctype html>…)." },
      },
      required: ["title", "html"],
    },
  },
];

function logActivity(source: ActivitySource, label: string) {
  useActivity.getState().push({ source, kind: "integrate", label, count: 0 });
}

export async function runTool(name: string, args: any): Promise<unknown> {
  const c = useConnectors.getState();
  const g = c.google;

  switch (name) {
    case "gmail_search": {
      if (!googleTokenValid(g, GMAIL_SCOPE)) return { error: "Gmail no está conectado." };
      const emails = await gmailSearch(g.accessToken, args?.query || "in:inbox", 8);
      logActivity("gmail", `Gemini buscó en Gmail: "${args?.query || "in:inbox"}"`);
      return {
        count: emails.length,
        emails: emails.map((e) => ({
          subject: e.subject,
          from: e.senderName,
          date: e.date,
          category: e.category,
          snippet: e.snippet,
        })),
      };
    }
    case "drive_search": {
      if (!googleTokenValid(g, DRIVE_SCOPE)) return { error: "Google Drive no está conectado." };
      const files = await driveList(g.accessToken, 20, { query: args?.query });
      logActivity("google-drive", `Gemini consultó Drive${args?.query ? `: "${args.query}"` : ""}`);
      return { count: files.length, files: files.map((f) => ({ name: f.name, mimeType: f.mimeType, link: f.webViewLink })) };
    }
    case "calendar_upcoming": {
      if (!googleTokenValid(g, CALENDAR_SCOPE)) return { error: "Google Calendar no está conectado." };
      const events = await calendarEvents(g.accessToken, 10);
      logActivity("ai", "Gemini revisó el calendario");
      return {
        events: events.map((e) => ({
          summary: e.summary,
          start: e.start?.dateTime || e.start?.date,
          location: e.location,
        })),
      };
    }
    case "github_overview": {
      const account = args?.account || c.github.account;
      if (!account && !c.github.token) return { error: "GitHub no está conectado." };
      const d = await ghFetchAll(account, c.github.token || undefined);
      logActivity("github", "Gemini consultó GitHub");
      return {
        user: d.user?.login,
        repos: d.repos.length,
        openPRs: d.openPRs,
        openIssues: d.openIssues,
        recentRepos: d.repos.slice(0, 5).map((r) => r.name),
      };
    }
    case "telegram_alert": {
      if (!c.telegram.botToken || !c.telegram.chatId) return { error: "Telegram no está conectado." };
      await tgSendMessage(c.telegram.botToken, c.telegram.chatId, alertText("Asistente IA", String(args?.text || "")));
      logActivity("telegram", "Gemini envió una alerta a Telegram");
      return { sent: true };
    }
    case "create_note": {
      const ws = useWorkspace.getState();
      const id = ws.createPage(null);
      const lines: string[] = String(args?.content || "").split("\n").filter((l: string) => l.trim());
      const blocks: Block[] = [
        { id: "t", type: "heading1", content: String(args?.title || "Nota") },
        ...lines.map((l): Block =>
          l.trim().startsWith("- ")
            ? { id: "t", type: "todo", content: l.replace(/^-\s*/, ""), checked: false }
            : { id: "t", type: "text", content: l }
        ),
      ];
      ws.applyTemplate(id, blocks.length > 1 ? blocks : [{ id: "t", type: "text", content: "" }], {
        title: String(args?.title || "Nota"),
        icon: "🤖",
      });
      logActivity("ai", `Gemini creó la nota "${args?.title}"`);
      return { created: true, pageId: id, title: args?.title };
    }
    case "list_notes": {
      const pages = useWorkspace.getState().pages;
      return { notes: pages.map((p) => ({ title: p.title, icon: p.icon })) };
    }
    case "analyze_agency": {
      const out: Record<string, unknown> = { connected: [] as string[] };
      const conn = out.connected as string[];
      if (googleTokenValid(g, GMAIL_SCOPE)) {
        const em = await gmailSearch(g.accessToken, "in:inbox", 25);
        const byCategory: Record<string, number> = {};
        em.forEach((e) => (byCategory[e.category] = (byCategory[e.category] || 0) + 1));
        out.gmail = { total: em.length, unread: em.filter((e) => e.unread).length, byCategory };
        conn.push("gmail");
      }
      if (c.github.account || c.github.token) {
        const d = await ghFetchAll(c.github.account, c.github.token || undefined);
        out.github = { repos: d.repos.length, openPRs: d.openPRs, openIssues: d.openIssues };
        conn.push("github");
      }
      if (googleTokenValid(g, DRIVE_SCOPE)) {
        out.drive = { recentItems: (await driveList(g.accessToken, 30)).length };
        conn.push("drive");
      }
      if (googleTokenValid(g, CALENDAR_SCOPE)) {
        out.calendar = { upcoming: (await calendarEvents(g.accessToken, 10)).length };
        conn.push("calendar");
      }
      logActivity("ai", "Gemini ejecutó analítica de la agencia");
      return out;
    }
    case "create_webpage": {
      const ws = useWorkspace.getState();
      const id = ws.createPage(null);
      ws.applyTemplate(
        id,
        [
          { id: "t", type: "heading1", content: String(args?.title || "Página web") },
          { id: "t", type: "html", content: String(args?.html || "<!doctype html><html><body></body></html>") },
        ],
        { title: String(args?.title || "Página web"), icon: "🌐" }
      );
      logActivity("ai", `Gemini generó la página web "${args?.title}"`);
      return { created: true, pageId: id, title: args?.title };
    }
    default:
      return { error: `Herramienta desconocida: ${name}` };
  }
}
