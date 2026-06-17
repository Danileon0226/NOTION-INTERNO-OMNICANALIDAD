// Endpoint del asistente de IA (Gemini).
// El navegador llama aquí; este handler es quien usa la API key en el servidor.
//   POST /api/ai   { prompt, system?, thinkingLevel?, model? }  ->  { text }
//   GET  /api/ai   ->  { configured: boolean, model }   (para mostrar estado en la UI)

import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_MODEL, ask, isGeminiConfigured } from "@/lib/ai/gemini";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ configured: isGeminiConfigured(), model: DEFAULT_MODEL });
}

export async function POST(req: NextRequest) {
  if (!isGeminiConfigured()) {
    return NextResponse.json(
      { error: "Gemini no está configurado. Pega GEMINI_API_KEY en .env.local y reinicia el dev server." },
      { status: 503 },
    );
  }

  let body: { prompt?: string; system?: string; thinkingLevel?: "LOW" | "MEDIUM" | "HIGH"; model?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido en el cuerpo de la petición." }, { status: 400 });
  }

  const prompt = body.prompt?.trim();
  if (!prompt) {
    return NextResponse.json({ error: "Falta 'prompt'." }, { status: 400 });
  }

  try {
    const text = await ask(prompt, {
      system: body.system,
      thinkingLevel: body.thinkingLevel,
      model: body.model,
    });
    return NextResponse.json({ text });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido llamando a Gemini.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
