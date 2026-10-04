import type { Metadata, Viewport } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { Providers, accentBootScript } from '@/components/providers';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'WorkFlowX — İşini plana dönüştür', template: '%s · WorkFlowX' },
  description: 'Görevlerini, projelerini ve çalışma zamanını tek bir akışta planla.',
  applicationName: 'WorkFlowX',
};
export const viewport: Viewport = {
  themeColor: [{ media: '(prefers-color-scheme: light)', color: '#f6f6f7' }, { media: '(prefers-color-scheme: dark)', color: '#0e0f12' }],
  width: 'device-width', initialScale: 1, viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" data-accent="indigo" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: accentBootScript }} /></head>
      <body className="min-h-dvh font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
