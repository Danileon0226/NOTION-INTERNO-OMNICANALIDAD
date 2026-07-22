"use client";

import { useEffect, useRef } from "react";

/**
 * Orbe de partículas "pensante" (inspirado en los thinking orbs de Jakub
 * Antalík): esfera de puntos por espiral de Fibonacci rotando en 3D sobre un
 * canvas 2D, con profundidad (alpha/tamaño según z). Toma el color del acento
 * del tema activo (var --accent, personalizable en Ajustes), respeta
 * prefers-reduced-motion (frame estático) y se pausa con la pestaña oculta.
 */
const PUNTOS = 170;

function esferaFibonacci(n: number): [number, number, number][] {
  const pts: [number, number, number][] = [];
  const phi = Math.PI * (3 - Math.sqrt(5)); // ángulo áureo
  for (let i = 0; i < n; i += 1) {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const t = phi * i;
    pts.push([Math.cos(t) * r, y, Math.sin(t) * r]);
  }
  return pts;
}

/** Lee el acento del tema (hex) y lo pasa a RGB; lila de marca como respaldo. */
function accentRgb(): [number, number, number] {
  try {
    const hex = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
    const m = /^#?([0-9a-f]{6})$/i.exec(hex);
    if (m) {
      const n = parseInt(m[1], 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }
  } catch {
    /* SSR o var ausente */
  }
  return [167, 143, 214];
}

export function OrbLoader({ size = 56, label }: { size?: number; label?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return undefined;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const puntos = esferaFibonacci(PUNTOS);
    const [cr, cg, cb] = accentRgb();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const radio = (size / 2) * 0.8 * dpr;
    const c = (size / 2) * dpr;

    let raf = 0;
    let yaw = 0;
    let last = performance.now();

    const frame = (now: number) => {
      // Avance por TIEMPO (no por frame): misma velocidad en cualquier pantalla.
      const dt = Math.min(now - last, 64);
      last = now;
      yaw += dt * 0.00045;
      const cabeceo = Math.sin(now * 0.00035) * 0.35;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const sy = Math.sin(yaw);
      const cy = Math.cos(yaw);
      const sp = Math.sin(cabeceo);
      const cp = Math.cos(cabeceo);

      for (const [x0, y0, z0] of puntos) {
        const x1 = x0 * cy + z0 * sy;
        const z1 = -x0 * sy + z0 * cy;
        const y2 = y0 * cp - z1 * sp;
        const z2 = y0 * sp + z1 * cp;

        const prof = (z2 + 1) / 2; // 0 = atrás, 1 = delante
        ctx.beginPath();
        ctx.arc(c + x1 * radio, c + y2 * radio, (0.55 + prof * 0.95) * dpr, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${cr},${cg},${cb},${0.12 + prof * 0.78})`;
        ctx.fill();
      }
      if (!reduce) raf = requestAnimationFrame(frame);
    };

    const arrancar = () => {
      cancelAnimationFrame(raf);
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    const onVisible = () => {
      if (document.hidden) cancelAnimationFrame(raf);
      else arrancar();
    };

    arrancar();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [size]);

  return (
    <div className="relative flex flex-col items-center justify-center gap-3" role="status" aria-live="polite">
      <span
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[62%] rounded-full"
        style={{
          width: size * 1.9,
          height: size * 1.9,
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--accent) 18%, transparent), color-mix(in srgb, var(--accent) 6%, transparent) 45%, transparent 70%)",
        }}
      />
      <canvas ref={canvasRef} aria-hidden className="relative block" style={{ width: size, height: size }} />
      {label ? (
        <span className="relative animate-pulse text-[10px] font-semibold uppercase tracking-[0.3em] text-muted">
          {label}
        </span>
      ) : null}
    </div>
  );
}
