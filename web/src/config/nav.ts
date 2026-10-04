import { SunIcon, HomeIcon, ListChecksIcon, FolderIcon, CalendarIcon, SparklesIcon, BarChart3Icon, UsersIcon, MapIcon, SettingsIcon, type LucideIcon } from 'lucide-react';
import type { IlloName } from '@/components/brand/illustration';

export interface NavItem { href: string; label: string; icon: LucideIcon; phase?: number; illo: IlloName; blurb: string; key: string }

/** App navigation. `phase` = roadmap phase in which the screen moves from the prototype into this app. */
export const NAV: NavItem[] = [
  { key: 'today', href: '/app/today', label: 'Bugün', icon: SunIcon, phase: 3, illo: 'cal', blurb: 'Şimdi / Sonra akışı, günlük kapasite ve gecikme riski.' },
  { key: 'overview', href: '/app', label: 'Genel Bakış', icon: HomeIcon, illo: 'chart', blurb: '' },
  { key: 'tasks', href: '/app/tasks', label: 'Görevlerim', icon: ListChecksIcon, phase: 4, illo: 'check', blurb: 'Akıllı hızlı ekleme, alt görevler, tekrar eden görevler ve süre takibi.' },
  { key: 'projects', href: '/app/projects', label: 'Projeler', icon: FolderIcon, phase: 5, illo: 'folder', blurb: 'Pano, zaman çizelgesi, sağlık durumu ve kilometre taşları.' },
  { key: 'calendar', href: '/app/calendar', label: 'Takvim', icon: CalendarIcon, phase: 6, illo: 'cal', blurb: 'Gün / hafta / ay / ajanda, sürükle-bırak ve çakışma motoru.' },
  { key: 'planning', href: '/app/planning', label: 'Planlama', icon: SparklesIcon, phase: 7, illo: 'spark', blurb: 'Açıklanabilir plan önerileri — sen onaylamadan takvim değişmez.' },
  { key: 'analytics', href: '/app/analytics', label: 'Analiz', icon: BarChart3Icon, phase: 10, illo: 'chart', blurb: 'Proje bazlı iş dağılımı, yük / kapasite ve tahmin doğruluğu.' },
  { key: 'team', href: '/app/team', label: 'Ekip', icon: UsersIcon, phase: 9, illo: 'users', blurb: 'Roller, davetler ve ekip iş yükü.' },
];
export const NAV_SECONDARY: NavItem[] = [
  { key: 'roadmap', href: '/app/roadmap', label: 'Yol Haritası', icon: MapIcon, illo: 'spark', blurb: '' },
  { key: 'settings', href: '/app/settings', label: 'Ayarlar', icon: SettingsIcon, illo: 'users', blurb: '' },
];
export const MOBILE_NAV = ['today', 'tasks', 'calendar', 'projects'] as const;
/** Sections that are still served by the prototype (placeholder pages in this app). */
export const PENDING = NAV.filter(n => n.phase);
