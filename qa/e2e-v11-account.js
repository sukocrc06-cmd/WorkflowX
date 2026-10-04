/* WorkFlowX v1.1 — account menu, landing sign-out, account deletion, Vercel deploy (headers + Google hand-off).
   Run:  node qa/e2e-v11-account.js   (Playwright + axe-core). No network needed:
   the published site is emulated by routing https://workflow-x-gules.vercel.app to these files
   with the exact headers from vercel.json (so the CSP is exercised too). */
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const ROOT = path.resolve(__dirname, '..'), FILE = 'file://' + path.join(ROOT, 'index.html');
const SITE = 'https://workflow-x-gules.vercel.app';
const MOCK = fs.readFileSync(path.join(__dirname, 'mock-supabase.js'), 'utf8');
const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const VERCEL = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
const IGNORE = fs.readFileSync(path.join(ROOT, '.vercelignore'), 'utf8').split(/\r?\n/).filter(Boolean);
const cfg = site => `window.WFX_SUPABASE={url:'https://hkgsjcftnldnzqyyphsk.supabase.co',anonKey:'${'k'.repeat(40)}',google:true${site ? `,site:'${SITE}'` : ''}};`;
const results = []; let errs = [];
async function step(name, fn) { errs = []; try { await fn(); if (errs.length) throw new Error('console: ' + errs.join(' | ')); results.push(['PASS', name]) } catch (e) { results.push(['FAIL', name, e.message.split('\n')[0]]) } }
const ok = (c, m) => { if (!c) throw new Error(m) };
const wait = (p, ms = 300) => p.waitForTimeout(ms);
const ev = (p, fn, a) => p.evaluate(fn, a);
function watch(p) { p.on('pageerror', e => errs.push('pageerror: ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/ERR_|fonts\.g|net::/.test(m.text())) errs.push(m.text()) }); p.on('dialog', d => { errs.push('dialog ' + d.message()); d.dismiss() }) }
/* Headers Vercel would send for a path (only the rules this project uses: "/(.*)" and exact/optional paths). */
function headersFor(p) {
  const h = {};
  for (const r of VERCEL.headers) { const re = new RegExp('^' + r.source.replace(/\(\.\*\)/g, '.*') + '$'); if (re.test(p)) r.headers.forEach(x => h[x.key.toLowerCase()] = x.value) }
  return h;
}
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.json': 'application/json' };
async function emulateVercel(ctx) {
  await ctx.route(SITE + '/**', route => {
    const u = new URL(route.request().url()), rel = decodeURIComponent(u.pathname).replace(/^\/+/, '') || 'index.html';
    const blocked = IGNORE.some(g => g.startsWith('*.') ? rel.endsWith(g.slice(1)) : rel === g || rel.startsWith(g + '/'));
    const f = path.join(ROOT, rel);
    if (blocked || !f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) return route.fulfill({ status: 404, body: 'not found' });
    route.fulfill({ status: 200, headers: { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream', ...headersFor(u.pathname) }, body: fs.readFileSync(f) });
  });
}
async function page(browser, { vw = 1280, site = false, web = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: vw, height: 860 }, timezoneId: 'Europe/Istanbul' });
  await ctx.addInitScript(cfg(site) + '\n' + MOCK);
  if (web) await emulateVercel(ctx);
  const p = await ctx.newPage(); watch(p); p._base = web ? SITE + '/' : FILE; return { ctx, p };
}
const open = async (p, hash) => { await p.goto(p._base + hash); await wait(p, 600) };
const addUser = (p, email, pw, name) => ev(p, ([e, pw, n]) => { const d = JSON.parse(localStorage.getItem('mock.sb') || '{"users":{},"log":[]}'); d.users[e] = { password: pw, user: { id: 'u' + Math.random().toString(36).slice(2, 10), email: e, user_metadata: { full_name: n }, app_metadata: { provider: 'email' }, email_confirmed_at: '2026-01-01' } }; localStorage.setItem('mock.sb', JSON.stringify(d)) }, [email, pw, name]);
const settle = p => ev(p, () => { if (typeof closeDlg === 'function') closeDlg(); if (UI.boot === 'ready' && !S.onboarded) { S.onboarded = true; save() } });
async function signIn(p, email, pw) { await open(p, '#/login'); await p.fill('#au-email', email); await p.fill('#au-password', pw); await p.click('#landing form .btn.primary'); await wait(p, 900); await settle(p) }
const mockDB = p => ev(p, () => JSON.parse(localStorage.getItem('mock.sb') || '{"users":{},"log":[]}'));
const axe = async p => { await p.addScriptTag({ content: AXE }); const v = await ev(p, async () => (await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa'] })).violations.map(v => v.id + ': ' + v.nodes.map(n => n.target).join(', '))); errs = errs.filter(e => !/CORS|XMLHttpRequest|Cross origin/.test(e)); return v };

(async () => {
  const browser = await chromium.launch();

  await step('Avatar opens an account menu (name, email, profile, sign out); Escape and outside click close it; sign out works', async () => {
    const { ctx, p } = await page(browser); await open(p, '#/'); await addUser(p, 'ece@ornek.com', 'Parola123', 'Ece Yılmaz');
    await signIn(p, 'ece@ornek.com', 'Parola123');
    await p.click('#av'); ok(await p.isVisible('#upop'), 'menu not open'); ok(await p.getAttribute('#av', 'aria-expanded') === 'true', 'aria-expanded not set');
    const txt = await p.textContent('#upop'); ok(/Ece Yılmaz/.test(txt) && /ece@ornek\.com/.test(txt) && /Çıkış yap/.test(txt), 'menu content: ' + txt);
    await p.keyboard.press('Escape'); ok(!await p.isVisible('#upop'), 'Escape did not close');
    await p.click('#av'); await p.click('#main', { position: { x: 30, y: 300 } }); ok(!await p.isVisible('#upop'), 'outside click did not close');
    await p.click('#av'); await p.click('#upop a[href="#/app/settings/profile"]'); await wait(p, 300);
    ok(/settings\/profile$/.test(p.url()) && !await p.isVisible('#upop'), 'profile link');
    await p.click('#av'); await p.click('#upop [data-a=signOut]'); await wait(p, 700);
    ok(/#\/login/.test(p.url()) && !await ev(p, () => AUTH.user), 'not signed out: ' + p.url());
    await ctx.close();
  });

  await step('Landing page: signed in → "Çıkış yap" + "Uygulamaya git"; sign out from there; signed out → "Giriş yap"', async () => {
    const { ctx, p } = await page(browser); await open(p, '#/'); await addUser(p, 'can@ornek.com', 'Parola123', 'Can');
    await signIn(p, 'can@ornek.com', 'Parola123'); await open(p, '#/');
    ok(await p.$('.l-nav [data-a=signOut]') && /Uygulamaya git/.test(await p.textContent('.l-nav')), 'signed-in nav missing');
    await p.click('.l-nav [data-a=signOut]'); await wait(p, 700);
    ok(!await ev(p, () => AUTH.user), 'not signed out'); await open(p, '#/');
    ok(!await p.$('.l-nav [data-a=signOut]') && /Giriş yap/.test(await p.textContent('.l-nav')), 'signed-out nav wrong');
    await ctx.close();
  });

  await step('Delete account: needs the exact email; then account, cloud row and this device’s copy are gone; back on the landing page', async () => {
    const { ctx, p } = await page(browser); await open(p, '#/'); await addUser(p, 'sil@ornek.com', 'Parola123', 'Sil');
    await signIn(p, 'sil@ornek.com', 'Parola123'); await ev(p, () => { S.tasks.push(newTask({ title: 'Silinecek' })); save() }); await wait(p, 1600);
    const uid = await ev(p, () => AUTH.user.id); ok((await mockDB(p)).rows[uid], 'precondition: no cloud row');
    await open(p, '#/app/settings/profile'); ok(/Hesabı sil/.test(await p.textContent('.danger-zone')), 'no danger zone');
    await p.click('[data-a=deleteAccount]'); ok(await p.isVisible('#dlg[open]'), 'no confirm dialog');
    ok(await p.$('#dlg [data-a=export]'), 'no backup option');
    await p.fill('#delc', 'baska@ornek.com'); await p.click('#dlg .danger-solid'); await wait(p, 200);
    ok(/eşleşmiyor/.test(await p.textContent('#dlg .err')) && (await mockDB(p)).users['sil@ornek.com'], 'deleted with wrong email');
    await p.fill('#delc', 'SIL@ornek.com'); await p.click('#dlg .danger-solid'); await wait(p, 900);
    const db = await mockDB(p);
    ok(!db.users['sil@ornek.com'] && !(db.rows || {})[uid] && db.log.some(([k, v]) => k === 'rpc' && v === 'delete_my_account'), 'not deleted on the server');
    ok(!await ev(p, () => AUTH.user) && /#\/$/.test(p.url()), 'still signed in / wrong page: ' + p.url());
    const left = await ev(p, u => Object.keys(localStorage).filter(k => k.includes(u)), uid); ok(!left.length, 'local copy left: ' + left);
    ok(await ev(p, () => !S.tasks.some(x => x.title === 'Silinecek')), 'data still in memory');
    await ctx.close();
  });

  await step('Delete account when the SQL function is missing: clear message, nothing removed, still signed in', async () => {
    const { ctx, p } = await page(browser); await open(p, '#/'); await addUser(p, 'yok@ornek.com', 'Parola123', 'Yok');
    await signIn(p, 'yok@ornek.com', 'Parola123'); await ev(p, () => { window.__sbNoRpc = true });
    await open(p, '#/app/settings/profile'); await p.click('[data-a=deleteAccount]'); await p.fill('#delc', 'yok@ornek.com'); await p.click('#dlg .danger-solid'); await wait(p, 500);
    ok(/delete_account\.sql/.test(await p.textContent('#dlg .err')), 'no setup hint: ' + await p.textContent('#dlg .err'));
    ok(await ev(p, () => !!AUTH.user) && (await mockDB(p)).users['yok@ornek.com'], 'something was removed');
    await ctx.close();
  });

  await step('Published site (vercel.json headers, CSP): every screen works with no CSP violation; Google redirects back to the site', async () => {
    const { ctx, p } = await page(browser, { web: true }); await open(p, '#/');
    const h = await ev(p, async () => { const r = await fetch(location.href); return { csp: r.headers.get('content-security-policy'), xfo: r.headers.get('x-frame-options') } });
    ok(/frame-ancestors 'none'/.test(h.csp || '') && h.xfo === 'DENY', 'headers not applied');
    await addUser(p, 'web@ornek.com', 'Parola123', 'Web'); await signIn(p, 'web@ornek.com', 'Parola123');
    for (const r of ['#/app', '#/app/today', '#/app/tasks', '#/app/projects', '#/app/calendar', '#/app/planning', '#/app/analytics', '#/app/roadmap', '#/app/settings/profile']) { await ev(p, h => { location.hash = h }, r); await wait(p, 250) }
    ok(await ev(p, () => typeof window.supabase.createClient) === 'function', 'SDK not loaded under CSP');
    await ev(p, () => authSignOut(false)); await wait(p, 600); await open(p, '#/login'); await p.click('[data-a=authGoogle]'); await wait(p, 400);
    const log = (await mockDB(p)).log; ok(log.some(([k, v]) => k === 'oauth' && v.redirectTo === SITE + '/'), 'google redirect not to the site: ' + JSON.stringify(log.filter(l => l[0] === 'oauth')));
    for (const x of ['web/package.json', 'qa/e2e.js', 'tools/serve.js', 'WorkflowX-Baslat.bat', 'docs/AUTH_SUPABASE.md']) ok((await ev(p, async u => (await fetch(u)).status, SITE + '/' + x)) === 404, 'deployed but should be ignored: ' + x);
    errs = errs.filter(e => !/status of 404/.test(e));                          // the 404s above are expected
    await ctx.close();
  });

  await step('Opened from a file + site configured: "Google ile devam et" continues on the published site and starts Google there', async () => {
    const { ctx, p } = await page(browser, { site: true }); await emulateVercel(ctx); await open(p, '#/login');
    await p.click('[data-a=authGoogle]'); await wait(p, 2600);
    ok(p.url().startsWith(SITE + '/#/login'), 'did not move to the site: ' + p.url());
    const log = (await mockDB(p)).log; ok(log.some(([k, v]) => k === 'oauth' && v.provider === 'google'), 'google not started on the site');
    await ctx.close();
  });

  await step('a11y: account menu, danger zone, delete dialog and signed-in landing nav pass axe (light desktop + dark mobile)', async () => {
    for (const [vw, th] of [[1280, 'light'], [390, 'dark']]) {
      const { ctx, p } = await page(browser, { vw }); await open(p, '#/'); await addUser(p, 'ax@ornek.com', 'Parola123', 'Ax');
      await ev(p, t => localStorage.setItem('workflowx.v1.theme', t), th); await signIn(p, 'ax@ornek.com', 'Parola123');
      await open(p, '#/app/settings/profile'); await p.click('#av'); await wait(p, 400); let v = await axe(p); ok(!v.length, `${vw}/${th} menu+profile: ` + v.join(' ; '));
      await p.keyboard.press('Escape'); await p.click('[data-a=deleteAccount]'); await wait(p, 600); v = await axe(p); ok(!v.length, `${vw}/${th} dialog: ` + v.join(' ; '));
      await ev(p, () => closeDlg()); await open(p, '#/'); await wait(p, 2500); v = await axe(p); ok(!v.length, `${vw}/${th} landing: ` + v.join(' ; '));
      await ctx.close();
    }
  });

  await browser.close();
  const pass = results.filter(r => r[0] === 'PASS').length;
  results.forEach(r => console.log(r[0] === 'PASS' ? '✓' : '✗', r[1], r[2] ? '\n    → ' + r[2] : ''));
  console.log(`\n${pass}/${results.length} passed`); process.exit(pass === results.length ? 0 : 1);
})();
