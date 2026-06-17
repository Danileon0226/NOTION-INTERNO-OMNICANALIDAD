"use client";

import type { Block, WorkspacePage } from "@/lib/types";

function blockToMarkdown(b: Block): string {
  const c = (b.content || "").trim();
  switch (b.type) {
    case "heading1":
      return `# ${c}`;
    case "heading2":
      return `## ${c}`;
    case "heading3":
      return `### ${c}`;
    case "todo":
      return `- [${b.checked ? "x" : " "}] ${c}`;
    case "bulleted":
      return `- ${c}`;
    case "numbered":
      return `1. ${c}`;
    case "quote":
      return `> ${c}`;
    case "callout":
      return `> 📌 ${c}`;
    case "code":
      return c ? `\`\`\`\n${c}\n\`\`\`` : "";
    case "divider":
      return "---";
    case "page":
      return `- 📄 ${c}`;
    case "html":
      return c ? `\`\`\`html\n${c}\n\`\`\`` : "";
    default:
      return c;
  }
}

/** Convierte una página del workspace a Markdown. */
export function pageToMarkdown(page: WorkspacePage): string {
  const head = `# ${page.icon ? `${page.icon} ` : ""}${page.title}\n`;
  const body = page.blocks
    .map(blockToMarkdown)
    .filter((l, i, arr) => l !== "" || arr[i - 1] !== "")
    .join("\n\n");
  return `${head}\n${body}\n`;
}

/** Descarga texto como archivo en el navegador. */
export function downloadText(filename: string, text: string, mime = "text/markdown") {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function slug(s: string): string {
  return (
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "pagina"
  );
}

/** Exporta una página como archivo .md descargable. */
export function exportPageMarkdown(page: WorkspacePage) {
  downloadText(`${slug(page.title)}.md`, pageToMarkdown(page));
}
