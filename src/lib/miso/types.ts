export interface MisoVoiceOption {
  id: string;
  label: string;
  description?: string;
}

export interface MisoHealth {
  ok: boolean;
  latencyMs?: number;
  engine?: string;
  error?: string;
}

export interface MisoSpeechRequest {
  input: string;
  voice?: string;
  stream?: boolean;
  response_format?: "wav" | "mp3" | "pcm";
  speed?: number;
  seed?: number;
}

export type MisoConnectionStatus = "unknown" | "checking" | "online" | "offline";
