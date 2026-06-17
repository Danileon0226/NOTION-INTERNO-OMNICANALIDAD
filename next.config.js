/** @type {import('next').NextConfig} */
const isExport = process.env.NEXT_OUTPUT_EXPORT === "true";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

// Content-Security-Policy: orígenes que la app necesita de verdad.
// Google Identity (login), APIs de Google/GitHub/Telegram/Gemini, e imágenes
// de avatares/iconos. fetch_url permite https: (sólo público, validado en cliente).
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  // Next sirve scripts propios; GSI para el login de Google.
  "script-src 'self' 'unsafe-inline' https://accounts.google.com https://apis.google.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https:",
  // Vista previa de páginas web generadas (iframe sandbox) + login de Google.
  "frame-src 'self' https://accounts.google.com",
  "child-src 'self' blob:",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=(), interest-cohort=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Para GitHub Pages: exportación estática + basePath del repo.
  // En Vercel (sin estas env vars) se sirve normal desde la raíz.
  ...(isExport ? { output: "export" } : {}),
  ...(basePath ? { basePath, assetPrefix: basePath } : {}),
  images: { unoptimized: true },
  trailingSlash: isExport,
  // Las cabeceras solo aplican en Vercel (la exportación estática las ignora;
  // ahí cubrimos lo posible con un <meta> CSP en el layout).
  ...(isExport
    ? {}
    : {
        async headers() {
          return [{ source: "/:path*", headers: securityHeaders }];
        },
      }),
};

module.exports = nextConfig;
