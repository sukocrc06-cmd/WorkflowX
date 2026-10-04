import { Logo } from '@/components/brand/logo';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col items-center overflow-hidden px-4 pt-5 pb-12">
      <div aria-hidden="true" className="pointer-events-none absolute -top-40 right-[-10%] h-[520px] w-[520px] rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--primary)_16%,transparent),transparent)] blur-2xl" />
      <header className="flex w-full max-w-5xl items-center justify-between"><Logo /></header>
      <main className="mt-[7vh] w-full max-w-[420px] rounded-[22px] border bg-card p-6 shadow-pop motion-safe:animate-rise sm:p-8">{children}</main>
    </div>
  );
}
