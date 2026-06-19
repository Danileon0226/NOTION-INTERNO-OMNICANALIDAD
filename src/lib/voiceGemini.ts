"use client";

// Voz neural de Gemini: TTS realista usando la MISMA API key de Gemini.
// Devuelve audio PCM (L16) que envolvemos en WAV para reproducir.

import { useAi } from "@/lib/ai/store";
import { geminiError } from "@/lib/ai/client";
import { playBlobUrl, stopSharedAudio, getSharedAnalyser } from "@/lib/audioPlayer";

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
// Modelos TTS en orden de preferencia (el primero disponible para tu key gana).
const TTS_MODELS = ["gemini-2.5-flash-preview-tts", "gemini-2.5-pro-preview-tts"];

// Voces prebuilt curadas (con su carácter). Por defecto una grave tipo JARVIS.
export const GEMINI_VOICES: { id: string; label: string }[] = [
  { id: "Charon", label: "Charon · grave, informativa (JARVIS)" },
  { id: "Orus", label: "Orus · firme" },
  { id: "Iapetus", label: "Iapetus · clara" },
  { id: "Fenrir", label: "Fenrir · enérgica" },
  { id: "Enceladus", label: "Enceladus · serena" },
  { id: "Kore", label: "Kore · firme (femenina)" },
  { id: "Aoede", label: "Aoede · brillante (femenina)" },
  { id: "Zephyr", label: "Zephyr · luminosa" },
];

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Envuelve PCM 16-bit mono en un contenedor WAV reproducible. */
function pcmToWav(pcm: Uint8Array, sampleRate: number): Blob {
  const numChannels = 1;
  const bitsPerSample = 16;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  const buffer = new ArrayBuffer(44 + pcm.length);
  const view = new DataView(buffer);
  let o = 0;
  const ws = (s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(o++, s.charCodeAt(i));
  };
  ws("RIFF");
  view.setUint32(o, 36 + pcm.length, true);
  o += 4;
  ws("WAVE");
  ws("fmt ");
  view.setUint32(o, 16, true);
  o += 4;
  view.setUint16(o, 1, true);
  o += 2;
  view.setUint16(o, numChannels, true);
  o += 2;
  view.setUint32(o, sampleRate, true);
  o += 4;
  view.setUint32(o, byteRate, true);
  o += 4;
  view.setUint16(o, blockAlign, true);
  o += 2;
  view.setUint16(o, bitsPerSample, true);
  o += 2;
  ws("data");
  view.setUint32(o, pcm.length, true);
  o += 4;
  new Uint8Array(buffer, 44).set(pcm);
  return new Blob([buffer], { type: "audio/wav" });
}

/** Sintetiza texto a un Blob URL de audio WAV con la voz neural de Gemini. */
export async function geminiTTS(text: string, voiceName = "Charon"): Promise<string> {
  const { apiKey } = useAi.getState();
  if (!apiKey) throw new Error("Falta la API key de Gemini.");
  const body = JSON.stringify({
    contents: [{ parts: [{ text }] }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
    },
  });
  let lastErr = "Gemini TTS no disponible";
  for (const model of TTS_MODELS) {
    const res = await fetch(`${ENDPOINT}/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-goog-api-key": apiKey },
      body,
    });
    const data = await res.json();
    if (!res.ok) {
      lastErr = data?.error?.message || `Gemini TTS ${res.status}`;
      continue;
    }
    const parts: { inlineData?: { data?: string; mimeType?: string } }[] =
      data?.candidates?.[0]?.content?.parts ?? [];
    const audio = parts.find((p) => p.inlineData?.data)?.inlineData;
    if (!audio?.data) {
      lastErr = "La respuesta no incluyó audio.";
      continue;
    }
    const rate = Number((audio.mimeType?.match(/rate=(\d+)/) || [])[1]) || 24000;
    const wav = pcmToWav(base64ToBytes(audio.data), rate);
    return URL.createObjectURL(wav);
  }
  throw geminiError(lastErr);
}

// Reproductor con control de parada y analizador para el visualizador.
let queueToken = 0; // invalida la cola al detener

export interface SpeakNeuralOpts {
  voiceName?: string;
  style?: string; // dirección de estilo (p. ej. "tono grave, calmado y profesional")
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (e: Error) => void;
}

/** Trocea el texto en frases agrupadas (~máx 220 chars) para pipeline de voz. */
function chunkText(text: string, max = 220): string[] {
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

/** Reproduce un blob URL conectándolo al analizador; resuelve al terminar. */
function playUrl(url: string, onFirst?: () => void): Promise<void> {
  return playBlobUrl(url, onFirst);
}

/**
 * Voz neural pipelined: sintetiza frase a frase y reproduce la primera en cuanto
 * está lista mientras prefetchea la siguiente → empieza a hablar casi al instante.
 * Aplica una dirección de estilo para máxima naturalidad.
 */
export async function speakGeminiQueued(text: string, opts: SpeakNeuralOpts = {}): Promise<void> {
  stopGemini();
  const token = ++queueToken;
  const voice = opts.voiceName || "Charon";
  const stylePrefix = opts.style ? `${opts.style}: ` : "";
  const chunks = chunkText(text);
  if (!chunks.length) {
    opts.onEnd?.();
    return;
  }

  const synth = (c: string) => geminiTTS(stylePrefix + c, voice);
  let next = synth(chunks[0]);
  let firstPlayed = false;
  let delegated = false;
  try {
    for (let i = 0; i < chunks.length; i++) {
      let url: string;
      try {
        url = await next;
      } catch (e) {
        if (!firstPlayed) {
          delegated = true;
          opts.onError?.(e as Error);
        }
        return;
      }
      if (token !== queueToken) {
        URL.revokeObjectURL(url);
        return;
      }
      next = i + 1 < chunks.length ? synth(chunks[i + 1]) : Promise.reject(new Error("end"));
      next.catch(() => {});
      try {
        await playUrl(url, () => {
          if (!firstPlayed) {
            firstPlayed = true;
            opts.onStart?.();
          }
        });
      } catch (e) {
        if (!firstPlayed) {
          delegated = true;
          opts.onError?.(e as Error);
        }
        return;
      }
      if (token !== queueToken) {
        // Cancelado: libera el audio prefetcheado que ya no se reproducirá.
        next.then((u) => URL.revokeObjectURL(u)).catch(() => {});
        return;
      }
    }
  } finally {
    if (token === queueToken && !delegated) opts.onEnd?.();
  }
}

export function getAnalyser(): AnalyserNode | null {
  return getSharedAnalyser();
}

export function stopGemini(): void {
  queueToken++;
  stopSharedAudio();
}
