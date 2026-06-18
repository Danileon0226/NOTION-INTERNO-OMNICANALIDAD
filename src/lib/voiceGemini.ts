"use client";

// Voz neural de Gemini: TTS realista usando la MISMA API key de Gemini.
// Devuelve audio PCM (L16) que envolvemos en WAV para reproducir.

import { useAi } from "@/lib/ai/store";
import { geminiError } from "@/lib/ai/client";

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
const TTS_MODEL = "gemini-2.5-flash-preview-tts";

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
  const res = await fetch(`${ENDPOINT}/${TTS_MODEL}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-goog-api-key": apiKey },
    body: JSON.stringify({
      contents: [{ parts: [{ text }] }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
      },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw geminiError(data?.error?.message || `Gemini TTS ${res.status}`);
  const parts: { inlineData?: { data?: string; mimeType?: string } }[] =
    data?.candidates?.[0]?.content?.parts ?? [];
  const audio = parts.find((p) => p.inlineData?.data)?.inlineData;
  if (!audio?.data) throw new Error("La respuesta no incluyó audio (¿modelo TTS no disponible para tu key?).");
  const rate = Number((audio.mimeType?.match(/rate=(\d+)/) || [])[1]) || 24000;
  const wav = pcmToWav(base64ToBytes(audio.data), rate);
  return URL.createObjectURL(wav);
}

// Reproductor con control de parada y analizador para el visualizador.
let currentAudio: HTMLAudioElement | null = null;
let currentCtx: AudioContext | null = null;
let currentAnalyser: AnalyserNode | null = null;

export interface SpeakNeuralOpts {
  voiceName?: string;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (e: Error) => void;
}

/** Sintetiza y reproduce. Devuelve un AnalyserNode para visualizar la onda. */
export async function speakGemini(text: string, opts: SpeakNeuralOpts = {}): Promise<void> {
  stopGemini();
  let url: string;
  try {
    url = await geminiTTS(text, opts.voiceName);
  } catch (e) {
    opts.onError?.(e as Error);
    return;
  }
  const audio = new Audio(url);
  currentAudio = audio;
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    currentCtx = new Ctx();
    const src = currentCtx.createMediaElementSource(audio);
    currentAnalyser = currentCtx.createAnalyser();
    currentAnalyser.fftSize = 256;
    src.connect(currentAnalyser);
    currentAnalyser.connect(currentCtx.destination);
  } catch {
    /* visualizador opcional */
  }
  audio.onplay = () => opts.onStart?.();
  audio.onended = () => {
    URL.revokeObjectURL(url);
    opts.onEnd?.();
  };
  audio.onerror = () => {
    opts.onError?.(new Error("No se pudo reproducir el audio."));
    opts.onEnd?.();
  };
  try {
    await audio.play();
  } catch (e) {
    opts.onError?.(e as Error);
    opts.onEnd?.();
  }
}

export function getAnalyser(): AnalyserNode | null {
  return currentAnalyser;
}

export function stopGemini(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  if (currentCtx) {
    currentCtx.close().catch(() => {});
    currentCtx = null;
  }
  currentAnalyser = null;
}
