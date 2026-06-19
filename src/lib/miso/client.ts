"use client";

import type { MisoHealth, MisoSpeechRequest, MisoVoiceOption } from "@/lib/miso/types";

export const MISO_MODEL = "miso-tts-8b";

export const DEFAULT_MISO_VOICES: MisoVoiceOption[] = [
  { id: "default", label: "default", description: "Voz base Miso One" },
];

const healthCache = new Map<string, { at: number; health: MisoHealth }>();
const HEALTH_TTL_MS = 20_000;

export function normalizeMisoBase(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

export function misoRootUrl(baseV1: string): string {
  const b = normalizeMisoBase(baseV1);
  return b.endsWith("/v1") ? b.slice(0, -3) : b;
}

function parseVoiceList(data: unknown): MisoVoiceOption[] {
  if (!data || typeof data !== "object") return DEFAULT_MISO_VOICES;
  const o = data as Record<string, unknown>;
  // API real: { voices: ["default", "jarvis", ...] }
  if (Array.isArray(o.voices)) {
    return o.voices.map((v) => {
      const id = String(v);
      return { id, label: id };
    });
  }
  // OpenAI-style / mock: { data: [{ id, name }] }
  const items = Array.isArray(o.data) ? o.data : Array.isArray(data) ? data : [];
  const mapped = items
    .map((v) => {
      const row = v as { id?: string; name?: string; description?: string };
      const id = row.id || row.name || "";
      if (!id) return null;
      return { id, label: row.name || row.id || id, description: row.description };
    })
    .filter(Boolean) as MisoVoiceOption[];
  return mapped.length ? mapped : DEFAULT_MISO_VOICES;
}

export async function checkMisoHealth(baseV1: string, force = false): Promise<MisoHealth> {
  const base = normalizeMisoBase(baseV1);
  if (!base) return { ok: false, error: "URL vacía" };

  const cached = healthCache.get(base);
  if (!force && cached && Date.now() - cached.at < HEALTH_TTL_MS) return cached.health;

  const t0 = performance.now();
  try {
    const res = await fetch(`${misoRootUrl(base)}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(4000),
    });
    const latencyMs = Math.round(performance.now() - t0);
    if (!res.ok) {
      const health = { ok: false, latencyMs, error: `HTTP ${res.status}` };
      healthCache.set(base, { at: Date.now(), health });
      return health;
    }
    const data = await res.json().catch(() => ({}));
    const health: MisoHealth = {
      ok: true,
      latencyMs,
      engine: String((data as { engine?: string }).engine || "miso-tts"),
    };
    healthCache.set(base, { at: Date.now(), health });
    return health;
  } catch (e) {
    const health: MisoHealth = {
      ok: false,
      latencyMs: Math.round(performance.now() - t0),
      error: (e as Error).message || "Sin conexión",
    };
    healthCache.set(base, { at: Date.now(), health });
    return health;
  }
}

export async function listMisoVoicesApi(baseV1: string): Promise<MisoVoiceOption[]> {
  const base = normalizeMisoBase(baseV1);
  if (!base) return DEFAULT_MISO_VOICES;
  const res = await fetch(`${base}/audio/voices`, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) return DEFAULT_MISO_VOICES;
  const data = await res.json();
  return parseVoiceList(data);
}

export interface MisoFetchSpeechOpts extends MisoSpeechRequest {
  baseUrl: string;
  signal?: AbortSignal;
}

/** POST /v1/audio/speech — devuelve Response cruda (WAV o stream PCM). */
export async function fetchMisoSpeech(opts: MisoFetchSpeechOpts): Promise<Response> {
  const base = normalizeMisoBase(opts.baseUrl);
  if (!base) throw new Error("Falta la URL del servidor Miso One.");

  const res = await fetch(`${base}/audio/speech`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: opts.signal,
    body: JSON.stringify({
      model: MISO_MODEL,
      input: opts.input,
      voice: opts.voice || "default",
      response_format: opts.stream ? "pcm" : opts.response_format || "wav",
      stream: !!opts.stream,
      speed: opts.speed ?? 1,
      ...(opts.seed != null ? { seed: opts.seed } : {}),
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    let msg = err || `Miso TTS ${res.status}`;
    try {
      const j = JSON.parse(err);
      msg = j?.error?.message || j?.detail || msg;
    } catch {
      /* texto plano */
    }
    throw new Error(msg);
  }
  return res;
}

/** Sintetiza a blob URL (modo buffered WAV). */
export async function misoSpeechBlob(opts: MisoFetchSpeechOpts): Promise<string> {
  const res = await fetchMisoSpeech({ ...opts, stream: false, response_format: "wav" });
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}
