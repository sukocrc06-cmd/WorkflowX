import type { NextConfig } from 'next';

/* Security headers for every route. The CSP allows only this origin plus the Supabase project
   (auth + data); inline styles are needed by Next/Radix, scripts are self-hosted. */
const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const csp = [
  "default-src 'self'",
  `connect-src 'self' ${supabase} ${supabase.replace('https://', 'wss://')}`.trim(),
  "img-src 'self' data: blob: https://lh3.googleusercontent.com",
  "style-src 'self' 'unsafe-inline'",
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''}`,
  "font-src 'self' data:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'Content-Security-Policy', value: csp },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      ],
    }];
  },
};
export default config;
