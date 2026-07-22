// Escritura en Google Drive del lado del cliente (Drive API v3).
// Complementa a google.ts (solo lectura) para el módulo "Campañas IG":
// crea/busca la carpeta de campañas, sube archivos de texto (multipart)
// y hace públicos los archivos para obtener una URL de descarga directa
// que la Graph API de Meta pueda leer (image_url de Instagram).
//
// Requiere DRIVE_WRITE_SCOPE (https://www.googleapis.com/auth/drive):
// si el token actual solo tiene drive.readonly, el usuario debe volver a
// conectar Google para otorgar el permiso de escritura.

const DRIVE = "https://www.googleapis.com/drive/v3";
const UPLOAD = "https://www.googleapis.com/upload/drive/v3";

/** Nombre de la carpeta de trabajo de las campañas en el Drive del usuario. */
export const CAMPAIGNS_FOLDER = "ZERO Campañas";

const FOLDER_MIME = "application/vnd.google-apps.folder";

async function driveFetch<T>(url: string, token: string, init: RequestInit = {}): Promise<T> {
  if (!token) throw new Error("Falta el token de Google. Conecta Google Drive primero.");
  const res = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init.headers as Record<string, string> | undefined) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      (data as { error?: { message?: string } })?.error?.message || `Drive API ${res.status}`;
    if (res.status === 401) {
      throw new Error("La sesión de Google expiró. Pulsa 'Conectar Google' de nuevo.");
    }
    if (res.status === 403 && /insufficient|scope|permission/i.test(msg)) {
      throw new Error(
        "Tu sesión de Google no tiene permiso de ESCRITURA en Drive. Pulsa 'Conectar Google' y acepta el permiso nuevo de Drive."
      );
    }
    throw new Error(msg);
  }
  return data as T;
}

/**
 * Busca la carpeta `name` en el Drive del usuario y devuelve su id.
 * Si no existe, la crea en la raíz de "Mi unidad".
 */
export async function ensureFolder(token: string, name = CAMPAIGNS_FOLDER): Promise<string> {
  const q = `name = '${name.replace(/'/g, "\\'")}' and mimeType = '${FOLDER_MIME}' and trashed = false`;
  const params = new URLSearchParams({ q, fields: "files(id,name)", pageSize: "1" });
  const found = await driveFetch<{ files?: { id: string }[] }>(
    `${DRIVE}/files?${params.toString()}`,
    token
  );
  if (found.files?.[0]?.id) return found.files[0].id;

  const created = await driveFetch<{ id: string }>(`${DRIVE}/files?fields=id`, token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, mimeType: FOLDER_MIME }),
  });
  return created.id;
}

export interface DriveCreatedFile {
  id: string;
  name?: string;
  webViewLink?: string;
}

/**
 * Sube un archivo de texto a la carpeta indicada (files.create multipart).
 * Devuelve el id (y enlace de vista) del archivo creado.
 */
export async function driveUploadText(
  token: string,
  folderId: string,
  filename: string,
  text: string,
  mime = "text/plain"
): Promise<DriveCreatedFile> {
  const boundary = `zero_campanas_${Math.random().toString(36).slice(2)}`;
  const metadata = { name: filename, parents: [folderId], mimeType: mime };
  const body =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: ${mime}; charset=UTF-8\r\n\r\n` +
    `${text}\r\n` +
    `--${boundary}--`;
  return driveFetch<DriveCreatedFile>(
    `${UPLOAD}/files?uploadType=multipart&fields=id,name,webViewLink`,
    token,
    {
      method: "POST",
      headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
      body,
    }
  );
}

/**
 * Reemplaza el contenido de un archivo existente (files.update media).
 * Se usa al volver a "Dejar en mi Drive" para no duplicar archivos.
 */
export async function driveUpdateText(
  token: string,
  fileId: string,
  text: string,
  mime = "text/plain"
): Promise<DriveCreatedFile> {
  return driveFetch<DriveCreatedFile>(
    `${UPLOAD}/files/${encodeURIComponent(fileId)}?uploadType=media&fields=id,name,webViewLink`,
    token,
    {
      method: "PATCH",
      headers: { "Content-Type": `${mime}; charset=UTF-8` },
      body: text,
    }
  );
}

/**
 * Hace público un archivo (permissions.create anyone/reader). Tras esto,
 * `webContentUrl(fileId)` sirve como URL de descarga directa sin sesión.
 */
export async function driveMakePublic(token: string, fileId: string): Promise<void> {
  await driveFetch<{ id: string }>(
    `${DRIVE}/files/${encodeURIComponent(fileId)}/permissions?supportsAllDrives=true`,
    token,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "reader", type: "anyone" }),
    }
  );
}

/** URL de descarga directa de un archivo público de Drive (apta para image_url de IG). */
export function webContentUrl(fileId: string): string {
  return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`;
}

/**
 * Extrae el id de archivo de cualquier forma habitual de URL de Drive
 * (…/file/d/ID/view, open?id=ID, uc?id=ID) o de un id pegado tal cual.
 * Devuelve null si el texto no parece de Drive.
 */
export function driveExtractFileId(input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  const byPath = s.match(/\/(?:file\/)?d\/([\w-]{20,})/);
  if (byPath) return byPath[1];
  const byParam = s.match(/[?&]id=([\w-]{20,})/);
  if (byParam) return byParam[1];
  if (/^[\w-]{20,}$/.test(s)) return s; // id pegado directamente
  return null;
}
