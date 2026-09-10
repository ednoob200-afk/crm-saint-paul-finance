/** @type {import('next').NextConfig} */
const desenvolvimento = process.env.NODE_ENV !== 'production'

// O React em modo de desenvolvimento usa eval() para reconstruir pilhas de
// chamada. Em produção ele nunca usa, então a diretiva fica estrita lá.
const scriptSrc = desenvolvimento
  ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
  : "script-src 'self' 'unsafe-inline'"

// O recarregamento a quente do next dev usa WebSocket. Em produção não existe,
// e a diretiva volta a permitir apenas a própria origem.
const connectSrc = desenvolvimento ? "connect-src 'self' ws: wss:" : "connect-src 'self'"

const cabecalhosSeguranca = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      scriptSrc,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://*.public.blob.vercel-storage.com",
      connectSrc,
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
]

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: ['pg'],
  async headers() {
    return [{ source: '/:path*', headers: cabecalhosSeguranca }]
  },
}

export default nextConfig
