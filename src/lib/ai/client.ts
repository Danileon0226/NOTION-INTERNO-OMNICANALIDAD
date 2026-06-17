// Helper de cliente para hablar con el asistente de IA.
// Llama a /api/ai (nuestro servidor), NUNCA a Google directamente,
// para que la API key jamás salga del backend.

export interface AskAiOptions {
  system?: string;
  thinkingLevel?: "LOW" | "MEDIUM" | "HIGH";
  model?: string;
}

/** Envía un prompt al asistente y devuelve el texto generado. */
export async function askAi(prompt: string, opts: AskAiOptions = {}): Promise<string> {
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, ...opts }),
  });
  const data = (await res.json()) as { text?: string; error?: string };
  if (!res.ok) throw new Error(data.error || `IA ${res.status}`);
  return data.text ?? "";
}

/** Comprueba si el servidor tiene la API key configurada (para la UI). */
export async function getAiStatus(): Promise<{ configured: boolean; model: string }> {
  const res = await fetch("/api/ai");
  return res.json();
}
