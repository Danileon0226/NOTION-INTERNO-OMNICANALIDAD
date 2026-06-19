"use client";

// Gestor unificado de voz para ZERO: Miso One (primario) → Gemini TTS → sistema.

import { useAi } from "@/lib/ai/store";
import { speak, stopSpeaking } from "@/lib/voice";
import { speakGeminiQueued, stopGemini, getAnalyser as getGeminiAnalyser } from "@/lib/voiceGemini";
import { speakMisoQueued, stopMiso, getMisoAnalyser, checkMisoHealth } from "@/lib/voiceMiso";

export const JARVIS_STYLE = "Habla con tono grave, calmado, profesional y seguro, a ritmo pausado";

export interface VoiceOutOpts {
  onSynth?: () => void;
  onStart?: () => void;
  onEnd?: () => void;
}

/** Texto mayoritariamente en español — Miso rinde mejor en inglés. */
function isMostlySpanish(text: string): boolean {
  if (/[áéíóúñ¿¡]/i.test(text)) return true;
  const esWords = text.match(/\b(hola|gracias|qué|que|cómo|como|para|con|los|las|del|una|por|está|esta|puedo|ayuda|hoy|bien)\b/gi);
  return (esWords?.length ?? 0) >= 2;
}

/** Locución según motor configurado, con cadena de respaldo Miso → Gemini → sistema. */
export function speakOut(text: string, opts: VoiceOutOpts = {}): void {
  const state = useAi.getState();
  const { voiceEngine, geminiVoice, voiceURI, voiceRate, voicePitch, apiKey, misoTtsUrl, misoVoice, misoStream, misoSpeed, misoStyle } =
    state;

  const systemSpeak = () => {
    opts.onStart?.();
    speak(text, { voiceURI, rate: voiceRate, pitch: voicePitch, onEnd: opts.onEnd });
  };

  const geminiSpeak = () => {
    if (!apiKey) {
      systemSpeak();
      return;
    }
    opts.onSynth?.();
    speakGeminiQueued(text, {
      voiceName: geminiVoice,
      style: JARVIS_STYLE,
      onStart: opts.onStart,
      onEnd: opts.onEnd,
      onError: systemSpeak,
    });
  };

  const misoSpeak = () => {
    opts.onSynth?.();
    speakMisoQueued(text, {
      voice: misoVoice,
      stream: misoStream,
      speed: misoSpeed,
      style: misoStyle,
      onStart: opts.onStart,
      onEnd: opts.onEnd,
      onError: () => {
        if (apiKey) geminiSpeak();
        else systemSpeak();
      },
    });
  };

  if (voiceEngine === "miso" && misoTtsUrl.trim()) {
    // Español → Gemini/system suelen sonar mejor que Miso (modelo EN).
    if (isMostlySpanish(text) && apiKey) {
      geminiSpeak();
      return;
    }
    if (isMostlySpanish(text) && !apiKey) {
      systemSpeak();
      return;
    }
    void checkMisoHealth(misoTtsUrl).then((h) => {
      if (h.ok) misoSpeak();
      else if (apiKey) geminiSpeak();
      else systemSpeak();
    });
    return;
  }

  if (voiceEngine === "gemini" && apiKey) {
    geminiSpeak();
    return;
  }

  systemSpeak();
}

export function stopVoice(): void {
  stopSpeaking();
  stopGemini();
  stopMiso();
}

export function getVoiceAnalyser(): AnalyserNode | null {
  return getMisoAnalyser() ?? getGeminiAnalyser();
}
