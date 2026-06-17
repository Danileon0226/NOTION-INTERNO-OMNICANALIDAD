"use client";

import { downloadText } from "@/lib/export";

// Respaldo/restauración de todos los datos de la plataforma. Como el estado
// vive en localStorage (por dominio), esto permite mover el workspace, la
// memoria de ZERO, los conectores y la configuración entre dominios o navegadores.

const PREFIX = "zero-agency-";

export interface Backup {
  app: "zero-agency-os";
  version: 1;
  exportedAt: string;
  data: Record<string, unknown>;
}

/** Construye el objeto de respaldo con todas las claves de la plataforma. */
export function buildBackup(): Backup {
  const data: Record<string, unknown> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(PREFIX)) continue;
    const raw = localStorage.getItem(key);
    if (raw == null) continue;
    try {
      data[key] = JSON.parse(raw);
    } catch {
      data[key] = raw;
    }
  }
  return { app: "zero-agency-os", version: 1, exportedAt: new Date().toISOString(), data };
}

/** Descarga el respaldo como archivo .json. */
export function exportBackup() {
  const stamp = new Date().toISOString().slice(0, 10);
  downloadText(`zero-agency-backup-${stamp}.json`, JSON.stringify(buildBackup(), null, 2), "application/json");
}

/** Restaura un respaldo desde texto JSON. Devuelve cuántas claves escribió. */
export function restoreBackup(json: string): number {
  const parsed = JSON.parse(json) as Backup;
  if (parsed?.app !== "zero-agency-os" || !parsed.data || typeof parsed.data !== "object") {
    throw new Error("Archivo de respaldo no válido (no es un backup de Zero Agency OS).");
  }
  let n = 0;
  for (const [key, value] of Object.entries(parsed.data)) {
    if (!key.startsWith(PREFIX)) continue;
    localStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value));
    n += 1;
  }
  return n;
}

/** Cuenta cuántas claves de la plataforma hay actualmente. */
export function backupKeyCount(): number {
  let n = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(PREFIX)) n += 1;
  }
  return n;
}
