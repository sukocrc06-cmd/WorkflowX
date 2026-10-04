import Link from 'next/link';
import { ArrowRightIcon, LockIcon, CheckIcon, SparklesIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Reveal } from '@/components/marketing/reveal';
import { HeroMock } from '@/components/marketing/hero-mock';
import { FEATURE_ART } from '@/components/marketing/feature-art';

const FEATURES: [string, string][] = [
  ['Görev + takvim birlikte', 'Bir görev tek kalır, çalışma süresi birden çok zaman bloğuna dağılır.'],
  ['Açıklanabilir, onaylı plan', 'Her öneri “neden bu saat?” sorusunu cevaplar. Takvimin asla sessizce değişmez.'],
  ['Gerçek süreyi öğrenir', 'Zamanlayıcıyla harcadığın süreyi kaydet; tahmin hatanı gör ve planlamaya yansıt.'],
  ['Takvimini getir', 'Google veya Outlook takviminden .ics dosyası ile toplantılarını içe aktar.'],
  ['Gerçek iş yükü', 'Günlük kapasiteyi aşan günleri ve yetişmeyebilecek teslimleri önceden gör.'],
  ['Klavyeyle uçar', 'Ctrl K ile her şeye ulaş, takvimde sürükle-bırak ile planı elle ince ayarla.'],
];
const STEPS: [string, string][] = [
  ['Görevi tanımla', 'Başlık, süre, öncelik ve teslim tarihi. Tek satırda da yazabilirsin.'],
  ['Zamanı ayır', 'Akıllı planlama işini toplantıların arasındaki gerçek boşluklara yerleştirir ve nedenini açıklar.'],
  ['Projeyi tamamla', 'İlerlemeyi, iş yükünü ve teslim riskini tek panelde gör.'],
  ['Planı onayla', 'Sen onaylamadan hiçbir şey değişmez; yapay zekâ geldiğinde bunu açıkça göreceksin.'],
];

export default function Landing() {
  return (
    <>
      <section className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 pt-16 pb-20 sm:px-6 md:grid-cols-[1.05fr_1fr] md:pt-24">
        <div aria-hidden="true" className="pointer-events-none absolute top-[10%] right-0 -z-10 h-[80%] w-[55%] rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--primary)_16%,transparent),transparent)] blur-2xl" />
        <div className="motion-safe:animate-rise">
          <p className="mb-5 flex items-center gap-2 text-[11.5px] font-semibold tracking-[.12em] text-muted-foreground uppercase"><span className="h-px w-5 bg-primary" />Görev · Proje · Takvim · Planlama</p>
          <h1 className="text-[clamp(40px,6vw,72px)] leading-[1] font-semibold tracking-[-0.045em]">İşini <em className="font-serif font-normal text-brand-ink">plana</em><br />dönüştür.</h1>
          <p className="mt-6 max-w-[470px] text-lg leading-relaxed text-muted-foreground">Görevlerini, projelerini, teslim tarihlerini ve çalışma zamanını tek bir çalışma alanında yönet.</p>
          <div className="mt-8 flex flex-wrap gap-2.5">
            <Button size="lg" asChild className="group"><Link href="/signup">Hemen başla<ArrowRightIcon className="transition-transform group-hover:translate-x-1" /></Link></Button>
            <Button size="lg" variant="secondary" asChild><Link href="#nasil">Nasıl çalışır?</Link></Button>
          </div>
          <p className="mt-4 text-[13px] text-muted-foreground">Kredi kartı gerekmez · Planın sen onaylamadan değişmez</p>
        </div>
        <Reveal delay={150}><HeroMock /></Reveal>
      </section>

      <section id="nasil" aria-labelledby="h-steps" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <Reveal><p className="text-center text-[11.5px] font-semibold tracking-[.12em] text-brand-ink uppercase">Nasıl çalışır</p><h2 id="h-steps" className="mt-2 text-center text-[clamp(28px,4vw,40px)] font-semibold tracking-[-0.035em]">Dört adımda plan</h2></Reveal>
        <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(([h, p], i) => <li key={h}><Reveal delay={i * 80} className="h-full rounded-2xl border bg-card p-5 shadow-soft"><span className="font-mono text-sm text-brand-ink">0{i + 1}</span><h3 className="mt-2 font-semibold">{h}</h3><p className="mt-1 text-sm text-muted-foreground">{p}</p></Reveal></li>)}
        </ol>
      </section>

      <section aria-label="Özellikler" className="mx-auto grid max-w-6xl gap-4 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-3">
        {FEATURES.map(([h, p], i) => (
          <Reveal key={h} delay={(i % 3) * 80}>
            <div className="group h-full rounded-2xl border bg-card p-4 shadow-soft transition-[transform,box-shadow] duration-200 hover:-translate-y-[3px] hover:shadow-card">
              <span aria-hidden="true" className="mb-3 block h-24 overflow-hidden rounded-xl border bg-[linear-gradient(180deg,var(--muted),color-mix(in_oklab,var(--muted)_40%,var(--card)))] [&_.a]:fill-primary [&_.al]:fill-[color-mix(in_oklab,var(--primary)_20%,var(--card))] [&_.as]:fill-none [&_.as]:stroke-primary [&_.b]:fill-card [&_.b]:stroke-border-strong [&_.d]:fill-destructive [&_.g]:fill-success [&_.ln]:fill-none [&_.ln]:stroke-border-strong [&_.mv]:transition-transform [&_.mv]:duration-500 group-hover:[&_.mv]:translate-x-1.5 [&_.s]:fill-muted [&_svg]:h-full [&_svg]:w-full"
                dangerouslySetInnerHTML={{ __html: FEATURE_ART[i] ?? '' }} />
              <h3 className="font-semibold">{h}</h3><p className="mt-1 text-sm text-muted-foreground">{p}</p>
            </div>
          </Reveal>
        ))}
      </section>

      <section aria-labelledby="h-trust" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <Reveal><h2 id="h-trust" className="text-center text-[clamp(26px,3.5vw,36px)] font-semibold tracking-[-0.035em]">Güven ilk günden tasarımın parçası</h2></Reveal>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {([[LockIcon, 'Verilerin senin', 'Satır düzeyi güvenlik (RLS): her kayıt yalnızca sahibine ve davet ettiklerine açık.'], [CheckIcon, 'Onaysız değişiklik yok', 'Planlama önerileri sen onaylamadan takvime yazılmaz.'], [SparklesIcon, 'Dürüst akıllı planlama', 'Bugün kurallara dayalı çalışır; yapay zekâ geldiğinde bunu açıkça göreceksin.']] as const).map(([Icon, h, p], i) => (
            <Reveal key={h} delay={i * 80} className="rounded-2xl border bg-card p-5 shadow-soft"><Icon className="size-5 text-brand-ink" aria-hidden="true" /><h3 className="mt-3 font-semibold">{h}</h3><p className="mt-1 text-sm text-muted-foreground">{p}</p></Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <Reveal className="rounded-[28px] border bg-[radial-gradient(400px_200px_at_80%_0%,color-mix(in_oklab,var(--primary)_18%,transparent),transparent),var(--card)] px-6 py-14 text-center shadow-card">
          <h2 className="text-[clamp(26px,3.5vw,38px)] font-semibold tracking-[-0.035em]">İşi planla. Zamanı ayır. Projeyi bitir.</h2>
          <p className="mx-auto mt-3 max-w-md text-muted-foreground">Birkaç saniyede hesabını oluştur, ilk haftanı planla.</p>
          <Button size="lg" className="group mt-7" asChild><Link href="/signup">WorkFlowX&apos;i dene<ArrowRightIcon className="transition-transform group-hover:translate-x-1" /></Link></Button>
        </Reveal>
      </section>
    </>
  );
}
