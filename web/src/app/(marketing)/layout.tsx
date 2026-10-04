import Link from 'next/link';
import { Logo } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-transparent bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav aria-label="Site" className="flex items-center gap-1.5">
            <Button variant="ghost" asChild className="hidden sm:inline-flex"><Link href="/login">Giriş yap</Link></Button>
            <Button asChild><Link href="/app">Uygulamayı aç</Link></Button>
          </nav>
        </div>
      </header>
      <main id="main">{children}</main>
      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 text-sm text-muted-foreground sm:flex-row sm:items-start sm:justify-between sm:px-6">
          <div><Logo /><p className="mt-2">İşi planla. Zamanı ayır. Projeyi bitir.</p></div>
          <nav aria-label="Alt bilgi" className="grid grid-cols-2 gap-x-12 gap-y-2">
            <Link href="/app" className="hover:text-foreground">Uygulama</Link><Link href="/legal/privacy" className="hover:text-foreground">Gizlilik</Link>
            <Link href="/signup" className="hover:text-foreground">Kayıt ol</Link><Link href="/legal/terms" className="hover:text-foreground">Kullanım koşulları</Link>
          </nav>
          <p>© {new Date().getFullYear()} WorkFlowX</p>
        </div>
      </footer>
    </>
  );
}
