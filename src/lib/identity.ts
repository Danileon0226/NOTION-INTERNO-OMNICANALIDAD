"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

// Identidad de agente para ZERO (self-sovereign, 100% en el dispositivo).
// Cada dispositivo genera un par de claves (ECDSA P-256, WebCrypto) y un
// identificador `did:jwk:` estándar. Con él se FIRMAN las acciones del agente,
// con una cadena de delegación humano → ZERO → agente → acción. No hay raíz
// central: la confianza viene de la credencial verificable, no de quién la emitió.

// ── base64url ──────────────────────────────────────────────────
function b64urlFromBytes(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function bytesFromB64url(s: string): Uint8Array {
  const b = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
const enc = (s: string) => new TextEncoder().encode(s);
const b64urlFromString = (s: string) => b64urlFromBytes(enc(s));
const stringFromB64url = (s: string) => new TextDecoder().decode(bytesFromB64url(s));

const ALG = { name: "ECDSA", namedCurve: "P-256" } as const;
const SIGN_ALG = { name: "ECDSA", hash: "SHA-256" } as const;

function subtle(): SubtleCrypto {
  if (typeof crypto === "undefined" || !crypto.subtle) throw new Error("WebCrypto no disponible.");
  return crypto.subtle;
}

// ── store de identidad (persistido) ────────────────────────────
interface IdentityState {
  did: string; // did:jwk de este dispositivo
  privJwk: string; // JWK privada (JSON) — solo en este navegador
  ownerLabel: string; // humano que delega (cabeza de la cadena)
  setOwner: (label: string) => void;
  reset: () => void;
}

export const useIdentity = create<IdentityState>()(
  persist(
    (set) => ({
      did: "",
      privJwk: "",
      ownerLabel: "",
      setOwner: (ownerLabel) => set({ ownerLabel }),
      reset: () => set({ did: "", privJwk: "" }),
    }),
    { name: "zero-agency-identity" }
  )
);

/** Garantiza que exista la identidad del dispositivo; la crea si hace falta. */
export async function ensureIdentity(): Promise<string> {
  const cur = useIdentity.getState();
  if (cur.did && cur.privJwk) return cur.did;
  const pair = await subtle().generateKey(ALG, true, ["sign", "verify"]);
  const pub = (await subtle().exportKey("jwk", pair.publicKey)) as JsonWebKey;
  const priv = (await subtle().exportKey("jwk", pair.privateKey)) as JsonWebKey;
  // did:jwk estándar: base64url(JSON(jwk pública)).
  const pubMin: JsonWebKey = { kty: pub.kty, crv: pub.crv, x: pub.x, y: pub.y };
  const did = `did:jwk:${b64urlFromString(JSON.stringify(pubMin))}`;
  useIdentity.setState({ did, privJwk: JSON.stringify(priv) });
  return did;
}

/** Firma un mensaje con la clave del dispositivo; devuelve la firma en base64url. */
export async function signMessage(message: string): Promise<string> {
  const { privJwk } = useIdentity.getState();
  if (!privJwk) throw new Error("Identidad no inicializada.");
  const key = await subtle().importKey("jwk", JSON.parse(privJwk), ALG, false, ["sign"]);
  const sig = await subtle().sign(SIGN_ALG, key, enc(message) as BufferSource);
  return b64urlFromBytes(new Uint8Array(sig));
}

/** Verifica una firma usando la clave pública embebida en el did:jwk. */
export async function verifyMessage(message: string, sigB64: string, did: string): Promise<boolean> {
  try {
    const jwkPart = did.replace(/^did:jwk:/, "").split("#")[0];
    const pubJwk = JSON.parse(stringFromB64url(jwkPart)) as JsonWebKey;
    const key = await subtle().importKey("jwk", pubJwk, ALG, false, ["verify"]);
    return await subtle().verify(SIGN_ALG, key, bytesFromB64url(sigB64) as BufferSource, enc(message) as BufferSource);
  } catch {
    return false;
  }
}

// ── capacidades (naming estilo ANS por capacidad del agente) ───
const CAPABILITIES: Record<string, string> = {
  copiloto: "assistant.chat",
  voz: "voice.command",
  "manos libres": "voice.handsfree",
  anticipación: "anticipation.suggest",
  anticipacion: "anticipation.suggest",
  autonomía: "autonomy.act",
  autonomia: "autonomy.act",
  rutina: "routine.run",
  orquestación: "orchestration.deliver",
  orquestacion: "orchestration.deliver",
  briefing: "briefing.compose",
  reporte: "reports.generate",
  monitor: "monitor.scan",
  ai: "agent.generic",
};

/** Capacidad (ANS-style) a partir de la fuente del run. */
export function capabilityFor(source: string): string {
  const key = source.trim().toLowerCase();
  return CAPABILITIES[key] || `agent.${key.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "generic"}`;
}

/** Identificador del agente: did del dispositivo + capacidad (did:jwk:…#capability). */
export function agentDid(did: string, capability: string): string {
  return `${did}#${capability}`;
}

// ── huella firmable de una acción del agente ───────────────────
export interface SignableRun {
  source: string;
  capability: string;
  prompt: string;
  text: string;
  ok: boolean;
  ts: number;
  delegatedBy: string;
  signerDid: string;
}

/** Mensaje canónico que se firma/verifica para una acción. */
export function runFingerprint(r: SignableRun): string {
  return JSON.stringify({
    v: 1,
    source: r.source,
    capability: r.capability,
    prompt: r.prompt,
    text: r.text,
    ok: r.ok,
    ts: r.ts,
    delegatedBy: r.delegatedBy,
    signerDid: r.signerDid,
  });
}

/** DID abreviado para mostrar en la UI. */
export function shortDid(did: string): string {
  const [base, cap] = did.split("#");
  const body = base.replace(/^did:jwk:/, "");
  const tail = body.length > 12 ? `${body.slice(0, 6)}…${body.slice(-6)}` : body;
  return cap ? `did:jwk:${tail}#${cap}` : `did:jwk:${tail}`;
}
