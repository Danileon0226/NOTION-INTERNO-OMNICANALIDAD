// Cliente de la API de bots de Telegram (del lado del cliente).
// api.telegram.org admite CORS, así que el navegador puede validar el bot,
// enviar mensajes y leer updates directamente.

const base = (token: string) => `https://api.telegram.org/bot${token}`;

async function tg<T>(token: string, method: string, body?: object): Promise<T> {
  const res = await fetch(`${base(token)}/${method}`, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await res.json()) as { ok: boolean; result?: T; description?: string };
  if (!data.ok) throw new Error(data.description || `Telegram ${res.status}`);
  return data.result as T;
}

export interface TelegramBot {
  id: number;
  is_bot: boolean;
  first_name: string;
  username: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    date: number;
    text?: string;
    chat: { id: number; title?: string; username?: string; first_name?: string; type: string };
    from?: { first_name?: string; username?: string };
  };
}

export function tgGetMe(token: string): Promise<TelegramBot> {
  return tg<TelegramBot>(token, "getMe");
}

export function tgSendMessage(token: string, chatId: string, text: string) {
  return tg(token, "sendMessage", { chat_id: chatId, text, parse_mode: "HTML" });
}

export function tgGetUpdates(token: string): Promise<TelegramUpdate[]> {
  return tg<TelegramUpdate[]>(token, "getUpdates", { limit: 10, timeout: 0 });
}

/** Plantilla de alerta omnicanal para enviar al equipo. */
export function alertText(kind: string, detail: string): string {
  return `🔔 <b>Zero Agency OS</b>\n<b>${kind}</b>\n${detail}\n\n<i>Enviado desde el dashboard omnicanal</i>`;
}
