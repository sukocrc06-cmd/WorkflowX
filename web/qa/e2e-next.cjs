/* WorkFlowX Next.js app (Faz 1) — shell, design system, motion, command palette, illustrations, auth pages.
   Run against a running server:  BASE=http://127.0.0.1:3100 node qa/e2e-next.cjs   (AUTH=1 when built with Supabase env) */
const { chromium } = require('playwright');
const fs = require('fs');
const BASE = process.env.BASE || 'http://127.0.0.1:3000', AUTH = process.env.AUTH === '1';
const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const results = []; let errs = [];
const ok = (c, m) => { if (!c) throw new Error(m) };
async function step(name, fn) { errs = []; try { await fn(); const bad = errs.filter(e => !/Failed to fetch|ERR_|net::|supabase\.co/.test(e)); if (bad.length) throw new Error('console: ' + bad.join(' | ')); results.push(['PASS', name]) } catch (e) { results.push(['FAIL', name, e.message.split('\n')[0]]) } }
async function page(b, o = {}) { const c = await b.newContext({ viewport: { width: 1280, height: 860 }, ...o }); const p = await c.newPage(); p.on('pageerror', e => errs.push('pageerror ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) }); return { c, p } }
const go = (p, path) => p.goto(BASE + path, { waitUntil: 'networkidle' });
const axe = async p => { await p.addScriptTag({ content: AXE }); return p.evaluate(async () => (await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa'] })).violations.map(v => v.id + ': ' + v.nodes.slice(0, 3).map(n => n.target).join(', '))) };

(async () => {
  const b = await chromium.launch();
  if (!AUTH) {
    await step('Landing: hero, steps, features, CTA; security headers present', async () => {
      const { c, p } = await page(b); const r = await go(p, '/');
      ok(/İşini/.test(await p.textContent('h1')), 'no hero'); ok((await p.$$('main section')).length >= 5, 'sections missing');
      const h = r.headers(); ok(/frame-ancestors 'none'/.test(h['content-security-policy'] || '') && h['x-content-type-options'] === 'nosniff', 'security headers missing');
      ok(!h['x-powered-by'], 'x-powered-by leaked'); await c.close();
    });
    await step('Shell: sidebar navigation, active state, F-badges, placeholder pages, 404 for unknown sections', async () => {
      const { c, p } = await page(b); await go(p, '/app');
      ok(await p.$('aside nav a[aria-current="page"][href="/app"]'), 'overview not active');
      await p.click('aside nav a[href="/app/calendar"]'); await p.waitForURL('**/app/calendar'); await p.waitForSelector('main h3:has-text("Faz 6")'); ok(await p.$('main svg.illo'), 'illustration missing');
      ok(await p.$('aside nav a[aria-current="page"][href="/app/calendar"]'), 'active state not moved');
      await go(p, '/app/nope'); ok(/bulunamadı/.test(await p.textContent('body')) && await p.$('meta[name=robots][content*=noindex]'), 'no not-found page');
      await c.close();
    });
    await step('Sidebar collapses to an icon rail with tooltips and remembers it', async () => {
      const { c, p } = await page(b); await go(p, '/app');
      await p.click('aside button[aria-label="Kenar çubuğunu daralt"]'); await p.waitForTimeout(400);
      ok((await p.$eval('aside', e => e.getBoundingClientRect().width)) < 80, 'not collapsed');
      await p.hover('aside nav a[href="/app/tasks"]'); await p.waitForTimeout(500); ok(/Görevlerim/.test(await p.textContent('[role=tooltip]').catch(() => '')), 'no tooltip');
      await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(300); ok((await p.$eval('aside', e => e.getBoundingClientRect().width)) < 80, 'collapse not remembered');
      await c.close();
    });
    await step('Command palette: Ctrl K opens, search + Enter navigates; G T shortcut; ? shows shortcuts', async () => {
      const { c, p } = await page(b); await go(p, '/app');
      await p.waitForTimeout(500); await p.keyboard.press('Control+k'); await p.waitForSelector('[cmdk-input]'); ok(await p.isVisible('[cmdk-input]'), 'palette not open');
      await p.keyboard.type('yol hari'); await p.waitForTimeout(200); await p.keyboard.press('Enter'); await p.waitForURL('**/app/roadmap'); await p.waitForTimeout(600);
      await p.keyboard.press('g'); await p.keyboard.press('t'); await p.waitForURL('**/app/today');
      await p.keyboard.press('Shift+Slash'); await p.waitForTimeout(300); ok(/Klavye kısayolları/.test(await p.textContent('[role=dialog]')), 'shortcuts dialog missing');
      await c.close();
    });
    await step('Theme + accent: menu switches dark mode and accent instantly; both persist; settings page mirrors them', async () => {
      const { c, p } = await page(b); await go(p, '/app');
      await p.click('button[aria-label="Tema ve vurgu rengi"]'); await p.click('[role=menuitemradio]:has-text("Karanlık")'); await p.waitForTimeout(200);
      ok(await p.evaluate(() => document.documentElement.classList.contains('dark')), 'dark not applied');
      await p.click('button[aria-label="Tema ve vurgu rengi"]'); await p.click('[role=radio][aria-label="Deniz"]'); await p.waitForTimeout(200);
      ok(await p.evaluate(() => document.documentElement.dataset.accent) === 'teal', 'accent not applied');
      await p.keyboard.press('Escape'); await p.reload({ waitUntil: 'networkidle' });
      ok(await p.evaluate(() => document.documentElement.dataset.accent === 'teal' && document.documentElement.classList.contains('dark')), 'not persisted');
      await go(p, '/app/settings'); ok(await p.isChecked('input[name=accent][value=teal]') && await p.isChecked('input[name=theme][value=dark]'), 'settings out of sync');
      await p.click('label:has(input[name=accent][value=rose])'); ok(await p.evaluate(() => document.documentElement.dataset.accent) === 'rose', 'settings accent failed');
      await p.evaluate(() => localStorage.setItem('workflowx.accent', '"><img src=x>')); await p.reload({ waitUntil: 'networkidle' });
      ok(await p.evaluate(() => document.documentElement.dataset.accent) === 'indigo', 'bad accent not rejected');
      await c.close();
    });
    await step('Mobile 390px: tab bar, menu sheet, no horizontal overflow on every page', async () => {
      const { c, p } = await page(b, { viewport: { width: 390, height: 844 } }); await go(p, '/app');
      ok(await p.isVisible('nav[aria-label="Mobil menü"]'), 'no tab bar'); ok(!(await p.isVisible('aside[aria-label="Kenar çubuğu"] >> nth=0')), 'desktop sidebar visible');
      await p.click('button[aria-label="Menüyü aç"]'); await p.waitForTimeout(400); await p.click('[role=dialog] a[href="/app/projects"]'); await p.waitForURL('**/app/projects');
      await p.waitForTimeout(400); ok(!(await p.isVisible('[role=dialog]')), 'sheet did not close');
      for (const path of ['/', '/app', '/app/roadmap', '/app/settings', '/login', '/signup']) { await go(p, path); ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'overflow on ' + path) }
      await c.close();
    });
    await step('Reduced motion: no running animations on the landing hero', async () => {
      const { c, p } = await page(b, { reducedMotion: 'reduce' }); await go(p, '/');
      const n = await p.evaluate(() => document.getAnimations().filter(a => a.playState === 'running' && (a.effect?.getTiming().duration ?? 0) > 50).length);
      ok(n === 0, n + ' animations still running'); await c.close();
    });
    await step('Local mode auth pages: explain, allow continuing without account; no Google button', async () => {
      const { c, p } = await page(b); await go(p, '/login');
      ok(/Hesap sistemi henüz bağlanmadı/.test(await p.textContent('main')), 'no notice'); ok(!(await p.$('text=Google ile devam et')), 'google shown');
      await p.fill('#au-email', 'x'); await p.click('form button[type=submit]'); ok(/Geçerli bir e-posta/.test(await p.textContent('#au-email-e')), 'no validation');
      await go(p, '/signup'); await p.fill('#au-password', 'uzunparola'); ok(/harf ve bir rakam/.test(await p.textContent('#pw-meter')), 'meter rule');
      await c.close();
    });
  } else {
    await step('Auth mode: /app redirects to /login?next=…; Google button shown; unreachable Supabase gives a friendly error', async () => {
      const { c, p } = await page(b); await go(p, '/app/roadmap'); ok(/\/login\?next=%2Fapp%2Froadmap/.test(p.url()), 'no redirect: ' + p.url());
      ok(await p.isVisible('text=Google ile devam et'), 'no google button');
      await p.fill('#au-email', 'a@ornek.com'); await p.fill('#au-password', 'Parola123'); await p.click('form button[type=submit]'); await p.waitForTimeout(1500);
      ok(/Bağlantı kurulamadı|tamamlanamadı/.test(await p.textContent('[role=alert]')), 'no friendly error'); ok(await p.inputValue('#au-password') === '', 'password not cleared');
      const r = await go(p, '/auth/callback?code=bad&next=//evil.com'); ok(/\/login\?error=link/.test(p.url()), 'bad code not handled: ' + p.url());
      await c.close();
    });
  }
  await step('a11y: axe clean on all public + app pages (light & dark, desktop & mobile)', async () => {
    const paths = AUTH ? ['/login', '/signup', '/forgot-password', '/reset-password'] : ['/', '/login', '/signup', '/forgot-password', '/app', '/app/roadmap', '/app/settings', '/app/tasks', '/legal/privacy'];
    for (const [scheme, vw] of [['light', 1280], ['dark', 390]]) {
      const { c, p } = await page(b, { colorScheme: scheme, viewport: { width: vw, height: 860 } });
      for (const path of paths) { await go(p, path); await p.waitForTimeout(path === '/' ? 3500 : 1200); const v = await axe(p); ok(!v.length, `${scheme}/${vw} ${path}: ${v.join(' | ')}`) }
      if (!AUTH) { await go(p, '/app'); await p.keyboard.press('Control+k'); await p.waitForTimeout(300); const v = await axe(p); ok(!v.length, 'palette: ' + v.join(' | ')) }
      await c.close();
    }
  });
  await b.close();
  const fails = results.filter(r => r[0] === 'FAIL');
  for (const r of results) console.log(r[0] === 'PASS' ? '✓' : '✗', r[1], r[2] ? '\n    → ' + r[2] : '');
  console.log(`\n${results.length - fails.length}/${results.length} passed`); process.exit(fails.length ? 1 : 0);
})();
