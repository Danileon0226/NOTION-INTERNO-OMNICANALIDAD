"use client";

import type { Check } from "@/lib/monitor/store";

// Sonda de disponibilidad client-side. Usa fetch `no-cors`: la promesa se
// resuelve si el host respondió (aunque la respuesta sea opaca por CORS) y
// se rechaza ante fallo de red/DNS/timeout. Mide la latencia real.
// Cumple la CSP (connect-src https:) y solo permite https.
export async function pingSite(url: string, timeoutMs = 9000): Promise<Check> {
  const start = performance.now();
  if (!/^https:\/\//i.test(url)) {
    return { ts: Date.now(), ok: false, ms: 0 };
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    await fetch(`${url}${url.includes("?") ? "&" : "?"}_z=${Date.now()}`, {
      mode: "no-cors",
      cache: "no-store",
      signal: ctrl.signal,
      redirect: "follow",
    });
    return { ts: Date.now(), ok: true, ms: Math.round(performance.now() - start) };
  } catch {
    return { ts: Date.now(), ok: false, ms: Math.round(performance.now() - start) };
  } finally {
    clearTimeout(timer);
  }
}
