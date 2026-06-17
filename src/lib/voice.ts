"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
// Capa de voz: reconocimiento (Web Speech API) + síntesis (SpeechSynthesis).

export function recognitionSupported(): boolean {
  return typeof window !== "undefined" && (!!(window as any).SpeechRecognition || !!(window as any).webkitSpeechRecognition);
}
export function synthesisSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function createRecognition(lang = "es-ES"): any | null {
  if (typeof window === "undefined") return null;
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SR) return null;
  const r = new SR();
  r.lang = lang;
  r.continuous = true;
  r.interimResults = true;
  return r;
}

let cachedVoice: SpeechSynthesisVoice | null = null;

function pickVoice(): SpeechSynthesisVoice | null {
  if (!synthesisSupported()) return null;
  if (cachedVoice) return cachedVoice;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  // Preferencia: voz en español; luego cualquier "Google"/"natural".
  const es = voices.filter((v) => /es(-|_)/i.test(v.lang));
  const prefer =
    es.find((v) => /google|premium|natural|neural/i.test(v.name)) ||
    es.find((v) => /(es-US|es-MX|es-419|es-ES)/i.test(v.lang)) ||
    es[0] ||
    voices.find((v) => /google/i.test(v.name)) ||
    voices[0];
  cachedVoice = prefer ?? null;
  return cachedVoice;
}

// Precarga de voces (algunas se cargan async).
if (typeof window !== "undefined" && synthesisSupported()) {
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoice = null;
    pickVoice();
  };
}

export interface SpeakOptions {
  onStart?: () => void;
  onEnd?: () => void;
  rate?: number;
  pitch?: number;
}

export function speak(text: string, opts: SpeakOptions = {}): void {
  if (!synthesisSupported() || !text.trim()) {
    opts.onEnd?.();
    return;
  }
  const synth = window.speechSynthesis;
  synth.cancel();
  // Trocea en frases para una locución más natural y estable.
  const chunks = text.match(/[^.!?\n]+[.!?]?/g) ?? [text];
  let i = 0;
  const voice = pickVoice();
  opts.onStart?.();
  const speakNext = () => {
    if (i >= chunks.length) {
      opts.onEnd?.();
      return;
    }
    const u = new SpeechSynthesisUtterance(chunks[i].trim());
    u.lang = voice?.lang || "es-ES";
    if (voice) u.voice = voice;
    u.rate = opts.rate ?? 1.02;
    u.pitch = opts.pitch ?? 0.9;
    u.onend = () => {
      i += 1;
      speakNext();
    };
    u.onerror = () => {
      i += 1;
      speakNext();
    };
    synth.speak(u);
  };
  speakNext();
}

export function stopSpeaking(): void {
  if (synthesisSupported()) window.speechSynthesis.cancel();
}
