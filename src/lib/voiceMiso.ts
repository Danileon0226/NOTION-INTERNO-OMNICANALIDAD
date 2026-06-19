"use client";

// Orquestador Miso One: streaming PCM de baja latencia, cola por frases,
// cancelación, estilo JARVIS y preparación de texto para TTS expresivo.

import { useAi } from "@/lib/ai/store";
import { playBlobUrl, stopSharedAudio, getSharedAnalyser } from "@/lib/audioPlayer";
import {
  checkMisoHealth,
  diagnoseMisoUrl,
  fetchMisoSpeech,
  listMisoVoicesApi,
  misoSpeechBlob,
  normalizeMisoBase,
} from "@/lib/miso/client";
import { abortPcmStream, playPcmStream } from "@/lib/miso/pcmStream";
import type { MisoHealth, MisoVoiceOption } from "@/lib/miso/types";

export const MISO_DEFAULT_URL = (process.env.NEXT_PUBLIC_MISO_TTS_URL || "http://localhost:8080/v1").trim();

export const MISO_STYLE_PRESETS: { id: string; label: string; prompt: string }[] = [
  {
    id: "jarvis",
    label: "JARVIS · grave y profesional",
    prompt:
      "Speak with a deep, calm, confident professional tone at a measured pace, like a trusted AI assistant.",
  },
  {
    id: "warm",
    label: "Cálido · conversacional",
    prompt: "Speak warmly and conversationally, friendly but clear, natural pacing.",
  },
  {
    id: "brief",
    label: "Conciso · directo",
    prompt: "Speak briefly and directly, minimal filler, crisp delivery.",
  },
];

export { checkMisoHealth, diagnoseMisoUrl, listMisoVoicesApi as listMisoVoices };
export type { MisoHealth, MisoVoiceOption };

export const MISO_VOICES: MisoVoiceOption[] = [{ id: "default", label: "default" }];

let queueToken = 0;
let synthAbort: AbortController | null = null;

export interface SpeakMisoOpts {
  baseUrl?: string;
  voice?: string;
  style?: string;
  stream?: boolean;
  speed?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (e: Error) => void;
  onChunkSynth?: (index: number, total: number) => void;
}

/** Prepara el input: estilo + texto (Miso es expresivo con instrucciones en inglés). */
export function prepareMisoInput(text: string, style?: string): string {
  const clean = text.trim();
  if (!clean) return "";
  const preset = MISO_STYLE_PRESETS.find((p) => p.id === style);
  if (preset) return `${preset.prompt}\n\nText to speak:\n${clean}`;
  if (style && !MISO_STYLE_PRESETS.some((p) => p.id === style)) {
    return `${style}\n\nText to speak:\n${clean}`;
  }
  return clean;
}

function chunkText(text: string, max = 280): string[] {
  const sentences = text.match(/[^.!?\n]+[.!?]?/g) ?? [text];
  const chunks: string[] = [];
  let cur = "";
  for (const s of sentences) {
    if ((cur + s).length > max && cur) {
      chunks.push(cur.trim());
      cur = s;
    } else {
      cur += s;
    }
  }
  if (cur.trim()) chunks.push(cur.trim());
  return chunks.filter(Boolean);
}

async function synthChunk(
  chunk: string,
  opts: {
    baseUrl: string;
    voice: string;
    stream: boolean;
    speed: number;
    style?: string;
    signal: AbortSignal;
  }
): Promise<{ mode: "stream"; response: Response } | { mode: "blob"; url: string }> {
  const input = prepareMisoInput(chunk, opts.style);
  if (opts.stream) {
    const response = await fetchMisoSpeech({
      baseUrl: opts.baseUrl,
      input,
      voice: opts.voice,
      stream: true,
      speed: opts.speed,
      signal: opts.signal,
    });
    return { mode: "stream", response };
  }
  const url = await misoSpeechBlob({
    baseUrl: opts.baseUrl,
    input,
    voice: opts.voice,
    speed: opts.speed,
    signal: opts.signal,
  });
  return { mode: "blob", url };
}

/**
 * Cola pipelined con streaming PCM cuando está activo (menor latencia).
 * Prefetch del siguiente chunk mientras reproduce el actual.
 */
export async function speakMisoQueued(text: string, opts: SpeakMisoOpts = {}): Promise<void> {
  stopMiso();
  const token = ++queueToken;
  const state = useAi.getState();
  const baseUrl = normalizeMisoBase(opts.baseUrl || state.misoTtsUrl || MISO_DEFAULT_URL);
  const voice = opts.voice || state.misoVoice || "default";
  const stream = opts.stream ?? state.misoStream;
  const speed = opts.speed ?? state.misoSpeed ?? 1;
  const style = opts.style ?? state.misoStyle;

  const chunks = chunkText(text);
  if (!chunks.length) {
    opts.onEnd?.();
    return;
  }

  synthAbort = new AbortController();
  const signal = synthAbort.signal;

  let firstPlayed = false;
  let delegated = false;

  const runChunk = (i: number) =>
    synthChunk(chunks[i], { baseUrl, voice, stream, speed, style, signal });

  try {
    let next = runChunk(0);
    for (let i = 0; i < chunks.length; i++) {
      if (token !== queueToken) return;
      opts.onChunkSynth?.(i + 1, chunks.length);

      let result: Awaited<ReturnType<typeof runChunk>>;
      try {
        result = await next;
      } catch (e) {
        if (!firstPlayed) {
          delegated = true;
          opts.onError?.(e as Error);
        }
        return;
      }

      if (token !== queueToken) return;

      if (i + 1 < chunks.length) {
        next = runChunk(i + 1);
        next.catch(() => {});
      }

      try {
        if (result.mode === "stream") {
          await playPcmStream(result.response, {
            onFirst: () => {
              if (!firstPlayed) {
                firstPlayed = true;
                opts.onStart?.();
              }
            },
            signal,
          });
        } else {
          await playBlobUrl(result.url, () => {
            if (!firstPlayed) {
              firstPlayed = true;
              opts.onStart?.();
            }
          });
        }
      } catch (e) {
        if (!firstPlayed) {
          delegated = true;
          opts.onError?.(e as Error);
        }
        return;
      }

      if (token !== queueToken) return;
    }
  } finally {
    synthAbort = null;
    if (token === queueToken && !delegated) opts.onEnd?.();
  }
}

export function getMisoAnalyser(): AnalyserNode | null {
  return getSharedAnalyser();
}

export function stopMiso(): void {
  queueToken++;
  synthAbort?.abort();
  synthAbort = null;
  abortPcmStream();
  stopSharedAudio();
}

/** Prueba rápida de latencia + síntesis (para panel de conectores). */
export async function probeMiso(baseV1?: string): Promise<MisoHealth & { voices: MisoVoiceOption[] }> {
  const url = normalizeMisoBase(baseV1 || useAi.getState().misoTtsUrl || MISO_DEFAULT_URL);
  const health = await checkMisoHealth(url, true);
  let voices = MISO_VOICES;
  if (health.ok) {
    try {
      voices = await listMisoVoicesApi(url);
    } catch {
      /* keep default */
    }
  }
  return { ...health, voices };
}
