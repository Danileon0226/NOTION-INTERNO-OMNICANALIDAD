"use client";

// Extrae archivos reales de los artefactos Markdown del orquestador.
// Formato canónico que pedimos al modelo:
//   FILE: ruta/relativa.ext
//   ```lang
//   <contenido>
//   ```
// Además es tolerante con variantes comunes (ruta en el info-string del fence,
// o como primera línea-comentario del bloque) para no perder archivos.

export interface GenFile {
  path: string;
  content: string;
}

const FILE_MARKER = /(?:^|\n)[>\s]*(?:FILE|ARCHIVO|File|Archivo)\s*:\s*[`"']?([^\n`"']+?)[`"']?\s*\n+```[^\n]*\n([\s\S]*?)\n?```/g;

// Fence con ruta en el info-string: ```ts title="path" | ```ts path/to/file
const FENCE_WITH_PATH = /```[a-zA-Z0-9]*[ \t]+(?:title=)?["']?([^\n"']+?\.[a-zA-Z0-9]+)["']?[ \t]*\n([\s\S]*?)\n?```/g;

// Primera línea del bloque es un comentario de ruta: // path  | # path  | <!-- path -->
const FENCE_COMMENT_PATH = /```[a-zA-Z0-9]*\n[ \t]*(?:\/\/|#|<!--|\/\*)\s*([\w./-]+?\.[a-zA-Z0-9]+)\s*(?:-->|\*\/)?\s*\n([\s\S]*?)\n?```/g;

function clean(path: string): string {
  return path
    .trim()
    .replace(/^[./]+/, "") // sin ./ ni / inicial
    .replace(/\\/g, "/")
    .replace(/^`+|`+$/g, "")
    .trim();
}

function valid(path: string): boolean {
  // Ruta plausible de archivo: tiene extensión o es un dotfile conocido.
  if (!path || path.includes(" ") || path.length > 200) return false;
  if (/^\.[a-z]/i.test(path)) return true; // .gitignore, .env.example…
  return /\.[a-zA-Z0-9]+$/.test(path);
}

/** Parsea archivos de uno o varios artefactos Markdown, deduplicando por ruta. */
export function parseFiles(...markdown: (string | undefined)[]): GenFile[] {
  const out = new Map<string, string>();
  const text = markdown.filter(Boolean).join("\n\n");

  const collect = (re: RegExp) => {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      const path = clean(m[1]);
      const content = m[2];
      if (valid(path) && content.trim() && !out.has(path)) out.set(path, content);
    }
  };

  collect(FILE_MARKER); // formato canónico primero (gana)
  collect(FENCE_WITH_PATH);
  collect(FENCE_COMMENT_PATH);

  return Array.from(out, ([path, content]) => ({ path, content }));
}

/** Resumen de un árbol de archivos para previsualización. */
export function fileTreeSummary(files: GenFile[]): { totalBytes: number; byExt: Record<string, number> } {
  const byExt: Record<string, number> = {};
  let totalBytes = 0;
  for (const f of files) {
    totalBytes += new Blob([f.content]).size;
    const ext = f.path.includes(".") ? f.path.split(".").pop()! : "—";
    byExt[ext] = (byExt[ext] || 0) + 1;
  }
  return { totalBytes, byExt };
}
