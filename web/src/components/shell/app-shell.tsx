'use client';
import * as React from 'react';
import { AppSidebar } from './app-sidebar';
import { Topbar } from './topbar';
import { MobileTabBar } from './mobile-tab-bar';
import { CommandMenu } from './command-menu';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';

export interface ShellUser { name: string; email: string; provider: string }
const ShellCtx = React.createContext<{ openCommand: () => void; user: ShellUser | null; authEnabled: boolean }>({ openCommand: () => {}, user: null, authEnabled: false });
export const useShell = () => React.useContext(ShellCtx);

const COLLAPSE_KEY = 'workflowx.sidebar';

/** App frame: sidebar (collapsible) · sticky glass top bar · content · mobile tab bar · command palette. */
export function AppShell({ user, authEnabled, children }: { user: ShellUser | null; authEnabled: boolean; children: React.ReactNode }) {
  const [cmd, setCmd] = React.useState(false);
  const [mobile, setMobile] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState(false);
  React.useEffect(() => { try { setCollapsed(localStorage.getItem(COLLAPSE_KEY) === '1') } catch { /* ignore */ } }, []);
  const toggleCollapsed = React.useCallback(() => setCollapsed(c => { try { localStorage.setItem(COLLAPSE_KEY, c ? '0' : '1') } catch { /* ignore */ } return !c }), []);
  const ctx = React.useMemo(() => ({ openCommand: () => setCmd(true), user, authEnabled }), [user, authEnabled]);
  return (
    <ShellCtx.Provider value={ctx}>
      <a href="#main" className="fixed top-2 left-2 z-[100] -translate-y-20 rounded-lg bg-foreground px-3 py-2 text-sm font-semibold text-background transition-transform focus:translate-y-0">İçeriğe geç</a>
      <div className="grid min-h-dvh md:grid-cols-[auto_minmax(0,1fr)]">
        <AppSidebar collapsed={collapsed} onToggle={toggleCollapsed} className="hidden md:flex" />
        <div className="flex min-w-0 flex-col">
          <Topbar onMenu={() => setMobile(true)} />
          <main id="main" tabIndex={-1} className="mx-auto w-full max-w-[1280px] flex-1 px-4 pt-6 pb-28 outline-none md:px-8 md:pt-8 md:pb-12">{children}</main>
        </div>
      </div>
      <MobileTabBar onMore={() => setMobile(true)} />
      <Sheet open={mobile} onOpenChange={setMobile}>
        <SheetContent side="left" className="p-0">
          <SheetTitle className="sr-only">Menü</SheetTitle>
          <SheetDescription className="sr-only">Uygulama bölümleri</SheetDescription>
          <AppSidebar collapsed={false} onNavigate={() => setMobile(false)} className="flex h-full w-full border-0" />
        </SheetContent>
      </Sheet>
      <CommandMenu open={cmd} onOpenChange={setCmd} />
    </ShellCtx.Provider>
  );
}
