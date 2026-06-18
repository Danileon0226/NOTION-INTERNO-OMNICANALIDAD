"use client";

import type { Report } from "@/lib/reports";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Convierte el texto (markdown ligero del agente) a HTML seguro y con marca.
function contentToHtml(text: string): string {
  const lines = text.split("\n");
  const out: string[] = [];
  let inList = false;
  const closeList = () => {
    if (inList) {
      out.push("</ul>");
      inList = false;
    }
  };
  const inline = (s: string) =>
    esc(s)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/`(.+?)`/g, "<code>$1</code>");

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      closeList();
      continue;
    }
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      closeList();
      const lvl = h[1].length;
      out.push(`<h${lvl + 1}>${inline(h[2])}</h${lvl + 1}>`);
      continue;
    }
    const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
    if (bullet) {
      if (!inList) {
        out.push("<ul>");
        inList = true;
      }
      out.push(`<li>${inline(bullet[1])}</li>`);
      continue;
    }
    closeList();
    out.push(`<p>${inline(line)}</p>`);
  }
  closeList();
  return out.join("\n");
}

/** Abre una ventana con el reporte maquetado con la marca ZERO y lanza imprimir → PDF. */
export function exportReportPdf(report: Report) {
  const date = new Date(report.ts).toLocaleString("es-CO", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const body = contentToHtml(report.content);
  const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(report.title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  :root{ --brand:#392851; --accent:#5b3fa6; --soft:#927cb7; --ink:#241d33; --muted:#6f6886; }
  *{ box-sizing:border-box; }
  html,body{ margin:0; padding:0; color:var(--ink);
    font-family:'Outfit',ui-sans-serif,-apple-system,Segoe UI,Helvetica,Arial,sans-serif;
    -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  .page{ max-width:760px; margin:0 auto; padding:40px 48px; }
  .header{ display:flex; align-items:center; gap:14px; padding:22px 24px; border-radius:14px;
    background:linear-gradient(135deg,var(--brand),var(--accent)); color:#fff; }
  .mark{ width:44px; height:44px; border-radius:11px; background:rgba(255,255,255,.16);
    display:flex; align-items:center; justify-content:center; font-weight:800; font-size:20px; letter-spacing:.04em; }
  .brand{ font-weight:700; letter-spacing:.18em; font-size:13px; opacity:.9; }
  .title{ font-weight:800; font-size:22px; margin-top:2px; letter-spacing:-.01em; }
  .meta{ margin:18px 2px 8px; color:var(--muted); font-size:12px; }
  h2{ font-size:18px; margin:22px 0 8px; color:var(--brand); letter-spacing:-.01em; }
  h3{ font-size:15px; margin:16px 0 6px; color:var(--accent); }
  h4{ font-size:13px; margin:12px 0 4px; color:var(--muted); text-transform:uppercase; letter-spacing:.04em; }
  p{ font-size:13.5px; line-height:1.6; margin:6px 0; }
  ul{ margin:6px 0 6px 2px; padding-left:18px; }
  li{ font-size:13.5px; line-height:1.6; margin:3px 0; }
  code{ background:#f1edfa; padding:1px 5px; border-radius:5px; font-size:12px; }
  strong{ color:var(--brand); }
  .footer{ margin-top:32px; padding-top:14px; border-top:1px solid #e9e5f2; color:var(--muted); font-size:11px;
    display:flex; justify-content:space-between; }
  @page{ margin:14mm; }
  @media print{ .page{ padding:0; } }
</style></head>
<body><div class="page">
  <div class="header">
    <div class="mark">Z</div>
    <div>
      <div class="brand">ZERO AGENCY · OS OMNICANAL</div>
      <div class="title">${esc(report.title)}</div>
    </div>
  </div>
  <div class="meta">Generado por ZERO · ${esc(date)}</div>
  ${body}
  <div class="footer"><span>ZERO AGENCY · Reporte interno</span><span>${esc(date)}</span></div>
</div>
<script>window.onload=function(){setTimeout(function(){window.print();},350);};</script>
</body></html>`;

  const w = window.open("", "_blank", "noopener,noreferrer,width=820,height=1000");
  if (!w) {
    alert("Permite las ventanas emergentes para exportar el PDF.");
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}
