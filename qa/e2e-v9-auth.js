/* WorkFlowX Faz 2 — Supabase Auth flows against a mock SDK (qa/mock-supabase.js).
   Covers local mode, protected routes, sign-in/up, verification, password reset, Google redirect,
   guest-data import, per-account data isolation, session expiry, account settings and a11y.
   Run:  node qa/e2e-v9-auth.js   (Playwright + axe-core). No network needed. */
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs'), http = require('http');
const ROOT = path.resolve(__dirname, '..'), FILE = 'file://' + path.join(ROOT, 'index.html');
const MOCK = fs.readFileSync(path.join(__dirname, 'mock-supabase.js'), 'utf8');
const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const CFG = `window.WFX_SUPABASE={url:'https://wfxtest.supabase.co',anonKey:'${'k'.repeat(40)}',google:true};`;
const results = []; let errs = [], allow = null;
async function step(name, fn) { errs = []; allow = null; try { await fn(); const bad = errs.filter(e => !(allow && allow.test(e))); if (bad.length) throw new Error('console: ' + bad.join(' | ')); results.push(['PASS', name]) } catch (e) { results.push(['FAIL', name, e.message.split('\n')[0]]) } }
const ok = (c, m) => { if (!c) throw new Error(m) };
const wait = (p, ms = 300) => p.waitForTimeout(ms);
const ev = (p, fn, a) => p.evaluate(fn, a);
const axe = async p => { allow = /CORS|XMLHttpRequest|Cross origin/; await p.addScriptTag({ content: AXE }); return p.evaluate(async () => (await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa'] })).violations.map(v => v.id + ': ' + v.nodes.map(n => n.target).join(', '))) };
function watch(p) { p.on('pageerror', e => errs.push('pageerror: ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/ERR_|fonts\.g|net::/.test(m.text())) errs.push(m.text()) }); p.on('dialog', d => { errs.push('dialog ' + d.message()); d.dismiss() }) }
function serve() { return new Promise(res => { const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/json' };
  const s = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(ROOT, u === '/' ? 'index.html' : u); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return } r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r) });
  s.listen(0, '127.0.0.1', () => res(s)) }) }
async function page(browser, { sb = true, base = FILE, vw = 1280 } = {}) {
  const ctx = await browser.newContext({ viewport: { width: vw, height: 860 }, timezoneId: 'Europe/Istanbul' });
  if (sb) await ctx.addInitScript(CFG + '\n' + MOCK);
  const p = await ctx.newPage(); watch(p); p._base = base; return { ctx, p };
}
const open = async (p, hash) => { await p.goto(p._base + hash); await wait(p, 500) };
const fill = async (p, o) => { for (const [k, v] of Object.entries(o)) await p.fill('#au-' + k, v) };
const mockLog = p => ev(p, () => JSON.parse(localStorage.getItem('mock.sb') || '{"log":[]}').log);
const addUser = (p, email, password, name = '', confirmed = true) => ev(p, ([e, pw, n, c]) => { const d = JSON.parse(localStorage.getItem('mock.sb') || '{"users":{},"log":[]}'); d.users[e] = { password: pw, user: { id: 'u' + Math.random().toString(36).slice(2, 10), email: e, user_metadata: { full_name: n }, app_metadata: { provider: 'email' }, email_confirmed_at: c ? '2026-01-01' : null } }; localStorage.setItem('mock.sb', JSON.stringify(d)) }, [email, password, name, confirmed]);
async function signIn(p, email, pw) { await open(p, '#/login'); await fill(p, { email, password: pw }); await p.click('#landing form .btn.primary'); await wait(p, 600) }

(async () => {
  const browser = await chromium.launch(); const srv = await serve(); const HTTP = `http://127.0.0.1:${srv.address().port}/index.html`;

  await step('Local mode (no Supabase config): app opens without an account; auth pages explain it', async () => {
    const { ctx, p } = await page(browser, { sb: false }); await open(p, '#/app');
    ok(await ev(p, () => AUTH.mode) === 'local' && await ev(p, () => UI.view) === 'overview', 'app not open in local mode');
    await open(p, '#/login'); ok(/Hesap sistemi henüz bağlanmadı/.test(await p.textContent('#landing')), 'no explanation');
    ok(await p.$('a[href="#/app"]'), 'no "continue without account" link'); ok(!await p.$('[data-a=authGoogle]'), 'google shown in local mode');
    ok(await ev(p, () => typeof window.supabase) === 'undefined', 'SDK loaded although not configured');
    await ctx.close();
  });

  await step('Protected routes: /app/* redirects to login with next; sign-in returns there; unsafe next is ignored', async () => {
    const { ctx, p } = await page(browser); await open(p, '#/'); await addUser(p, 'ayse@ornek.com', 'Parola123', 'Ayşe');
    await open(p, '#/app/tasks'); ok(/#\/login\?next=%2Fapp%2Ftasks/.test(p.url()), 'no redirect: ' + p.url());
    await fill(p, { email: 'ayse@ornek.com', password: 'Parola123' }); await p.click('#landing form .btn.primary'); await wait(p, 700);
    ok(/#\/app\/tasks$/.test(p.url()) && await ev(p, () => UI.view) === 'tasks', 'did not return to next: ' + p.url());
    ok(await ev(p, () => storage.key) === 'workflowx.v1.u.' + await ev(p, () => AUTH.user.id), 'data not scoped to account');
    await open(p, '#/login'); ok(/#\/app$/.test(p.url()), 'signed-in user can still see login');
    await ev(p, () => { location.hash = '#/login?next=' + encodeURIComponent('//evil.com') }); await wait(p);
    ok(await ev(p, () => safeNext()) === '#/app', 'unsafe next accepted');
    await ctx.close();
  });

  await step('Sign-in errors are friendly, password is cleared, unconfirmed email offers resend', async () => {
    const { ctx, p } = await page(browser); await open(p, '#/'); await addUser(p, 'ali@ornek.com', 'Parola123', 'Ali'); await addUser(p, 'yeni@ornek.com', 'Parola123', 'Yeni', false);
    await signIn(p, 'ali@ornek.com', 'yanlis123');
    ok(/E-posta veya şifre hatalı/.test(await p.textContent('#au-err')), 'no friendly error'); ok(await p.inputValue('#au-password') === '', 'password not cleared');
    await fill(p, { email: 'yeni@ornek.com', password: 'Parola123' }); await p.click('#landing form .btn.primary'); await wait(p, 500);
    ok(/doğrulaman gerekiyor/.test(await p.textContent('#au-err')), 'unconfirmed message missing');
    await p.click('#au-err [data-a=authResend]'); await wait(p, 300); ok((await mockLog(p)).some(([k, v]) => k === 'resend' && v === 'yeni@ornek.com'), 'resend not called');
    await ev(p, () => { window.__sbFail = new TypeError('Failed to fetch') }); await fill(p, { email: 'ali@ornek.com', password: 'Parola123' }); await p.click('#landing form .btn.primary'); await wait(p, 400);
    ok(/Bağlantı kurulamadı/.test(await p.textContent('#au-err')), 'network error not mapped');
    await ctx.close();
  });

  await step('Sign-up: validation + strength meter; with email confirmation → "check your email" + resend cooldown', async () => {
    const { ctx, p } = await page(browser); await open(p, '#/signup'); await ev(p, () => { window.__sbConfirm = true });
    await fill(p, { name: 'Can', email: 'can@ornek.com', password: 'kisa' }); await p.click('#landing form .btn.primary'); await wait(p, 150);
    ok(/en az 8/.test(await p.textContent('#au-password-e')), 'weak password accepted');
    await p.fill('#au-password', 'uzunparola'); ok(/harf ve bir rakam/.test(await p.textContent('#au-meter')), 'meter does not explain rule');
    await p.fill('#au-password', 'Guclu-Parola-2026'); ok(+await p.getAttribute('#au-meter', 'data-s') >= 3, 'meter not strong');
    await p.check('input[name=terms]'); await p.click('#landing form .btn.primary'); await wait(p, 500);
    ok(/E-postanı kontrol et/.test(await p.textContent('#landing')) && /can@ornek.com/.test(await p.textContent('#landing')), 'no confirmation screen');
    await p.click('[data-a=authResend]'); await wait(p, 300); ok(await p.isDisabled('[data-a=authResend]'), 'no resend cooldown');
    const su = (await mockLog(p)).find(([k]) => k === 'signUp'); ok(su && su[1].redirect === null, 'file:// should not send a redirect URL');
    await ctx.close();
  });

  await step('Sign-up without confirmation lands in the app; name from sign-up prefills the profile', async () => {
    const { ctx, p } = await page(browser); await open(p, '#/signup');
    await fill(p, { name: 'Deniz Ak', email: 'deniz@ornek.com', password: 'Parola2026' }); await p.check('input[name=terms]'); await p.click('#landing form .btn.primary'); await wait(p, 900);
    ok(await ev(p, () => UI.view) === 'overview' || await ev(p, () => UI.view) === 'today', 'not in app');
    ok(await ev(p, () => S.profile.name) === 'Deniz Ak', 'name not prefilled: ' + await ev(p, () => S.profile.name));
    await ctx.close();
  });

  await step('First sign-in offers to import account-less device data; accepting copies it, device copy stays', async () => {
    const { ctx, p } = await page(browser); await open(p, '#/');
    await ev(p, () => localStorage.setItem('workflowx.v1', JSON.stringify({ schema: 2, onboarded: true, profile: { name: 'Misafir' }, tasks: [{ id: 'g1', title: 'Cihazdaki görev', status: 'todo', priority: 'medium' }], projects: [{ id: 'gp', name: 'Cihaz projesi', color: '#6366f1' }], events: [], blocks: [] })));
    await addUser(p, 'ece@ornek.com', 'Parola123', 'Ece'); await signIn(p, 'ece@ornek.com', 'Parola123');
    ok(/verileri hesabına ekleyelim/.test(await p.textContent('#dlg')), 'no import offer');
    await p.click('#dlg .btn.primary'); await wait(p, 500);
    ok(await ev(p, () => S.tasks.some(x => x.title === 'Cihazdaki görev') && S.projects.length === 1), 'not imported');
    ok(await ev(p, () => JSON.parse(localStorage.getItem('workflowx.v1')).tasks.length) === 1, 'device copy removed');
    await p.reload(); await wait(p, 700); ok(!await p.isVisible('#dlg[open]'), 'import offered twice');
    await ctx.close();
  });

  await step('Accounts are isolated: sign out clears memory; another account never sees the first one’s data', async () => {
    const { ctx, p } = await page(browser); await open(p, '#/'); await addUser(p, 'a@ornek.com', 'Parola123', 'A'); await addUser(p, 'b@ornek.com', 'Parola123', 'B');
    await signIn(p, 'a@ornek.com', 'Parola123'); await ev(p, () => { closeDlg(); commit('x', () => { S.tasks.push(newTask({ title: 'A’nın gizli görevi' })); S.onboarded = true }) });
    await ev(p, () => authSignOut(false)); await wait(p, 500);
    ok(/#\/login/.test(p.url()), 'not sent to login'); ok(await ev(p, () => S.tasks.length) === 0, 'memory not cleared on sign-out');
    await signIn(p, 'b@ornek.com', 'Parola123'); await ev(p, () => closeDlg());
    ok(!(await ev(p, () => S.tasks.some(x => /gizli/.test(x.title)))), 'B sees A’s data!');
    await ev(p, () => authSignOut(false)); await wait(p, 400); await signIn(p, 'a@ornek.com', 'Parola123');
    ok(await ev(p, () => S.tasks.some(x => /gizli/.test(x.title))), 'A’s data lost after re-login');
    await ctx.close();
  });

  await step('Session expiry sends the user to login with an explanation', async () => {
    const { ctx, p } = await page(browser); await open(p, '#/'); await addUser(p, 'z@ornek.com', 'Parola123', 'Z'); await signIn(p, 'z@ornek.com', 'Parola123'); await ev(p, () => closeDlg());
    await ev(p, () => window.__sbAuth.__expire()); await wait(p, 400);
    ok(/#\/login/.test(p.url()), 'not redirected'); ok(/Oturumun kapandı/.test(await p.textContent('#toasts')), 'no explanation');
    await ctx.close();
  });

  await step('Over http: Google button redirects via Supabase OAuth; forgot password sends a PKCE reset link', async () => {
    const { ctx, p } = await page(browser, { base: HTTP }); await open(p, '#/login');
    await p.click('[data-a=authGoogle]'); await wait(p, 200);
    const o = (await mockLog(p)).find(([k]) => k === 'oauth'); ok(o && o[1].provider === 'google' && o[1].redirectTo === HTTP, 'oauth wrong ' + JSON.stringify(o));
    ok((await mockLog(p)).find(([k]) => k === 'createClient')[1].flowType === 'pkce', 'not PKCE');
    await open(p, '#/forgot-password'); await fill(p, { email: 'kimse@ornek.com' }); await p.click('#landing form .btn.primary'); await wait(p, 400);
    ok(/Bağlantı gönderildi/.test(await p.textContent('#landing')), 'no neutral confirmation');
    const r = (await mockLog(p)).find(([k]) => k === 'reset'); ok(r && r[1].redirectTo === HTTP + '?next=reset', 'reset redirect wrong ' + JSON.stringify(r));
    await ctx.close();
  });

  await step('Reset link (?code=…&next=reset) → new password page → password updated → into the app; invalid link explained', async () => {
    const { ctx, p } = await page(browser, { base: HTTP }); await open(p, '#/'); await addUser(p, 'r@ornek.com', 'Eskiparola1', 'R');
    await open(p, '#/reset-password'); ok(/Bağlantı geçersiz/.test(await p.textContent('#landing')), 'invalid link not explained');
    await ev(p, () => { const d = JSON.parse(localStorage.getItem('mock.sb')); d.pending = 'r@ornek.com'; localStorage.setItem('mock.sb', JSON.stringify(d)) });
    await p.goto(HTTP.replace('index.html', 'index.html?code=abc&next=reset')); await wait(p, 700);
    ok(/#\/reset-password$/.test(p.url()) && !/code=/.test(p.url()), 'URL not cleaned / not on reset page: ' + p.url());
    await fill(p, { password: 'Yeniparola2', password2: 'Farkli123' }); await p.click('#landing form .btn.primary'); await wait(p, 150);
    ok(/aynı değil/.test(await p.textContent('#au-password2-e')), 'mismatch not caught');
    await fill(p, { password: 'Yeniparola2', password2: 'Yeniparola2' }); await p.click('#landing form .btn.primary'); await wait(p, 600);
    ok(/#\/app/.test(p.url()) && /Şifren güncellendi/.test(await p.textContent('#toasts')), 'reset flow did not finish');
    ok(await ev(p, () => JSON.parse(localStorage.getItem('mock.sb')).users['r@ornek.com'].password) === 'Yeniparola2', 'password not updated');
    await ctx.close();
  });

  await step('Settings → Profile: account card, change password, sign out everywhere; palette has sign-out', async () => {
    const { ctx, p } = await page(browser); await open(p, '#/'); await addUser(p, 's@ornek.com', 'Parola123', 'Selin'); await signIn(p, 's@ornek.com', 'Parola123'); await ev(p, () => closeDlg());
    await ev(p, () => { location.hash = '#/app/settings/profile' }); await wait(p, 400);
    const t = await p.textContent('.acct-card'); ok(/s@ornek.com/.test(t) && /Doğrulandı/.test(t) && /E-posta ve şifre/.test(t), 'account card wrong');
    await p.fill('#npw', 'Yeni12345'); await p.fill('#npw2', 'Yeni12345'); await p.click('form[data-f=pwchange] > .btn'); await wait(p, 500);
    ok(await ev(p, () => JSON.parse(localStorage.getItem('mock.sb')).users['s@ornek.com'].password) === 'Yeni12345', 'password not changed');
    await p.keyboard.press('Control+k'); await p.fill('#cmdq', 'çıkış'); await wait(p, 150); ok(/Çıkış yap/.test(await p.textContent('#cmdl')), 'palette lacks sign-out'); await p.keyboard.press('Escape');
    await p.click('.acct-card [data-a=signOut][data-v=all]'); await wait(p, 500);
    ok((await mockLog(p)).some(([k, v]) => k === 'signOut' && v === 'global'), 'not a global sign-out'); ok(/#\/login/.test(p.url()), 'not at login');
    await ctx.close();
  });

  await step('Roadmap: Faz 2 is complete (incl. cloud sync); the current phase is Faz 12', async () => {
    const { ctx, p } = await page(browser); await open(p, '#/'); await addUser(p, 'q@ornek.com', 'Parola123', 'Q'); await signIn(p, 'q@ornek.com', 'Parola123'); await ev(p, () => closeDlg());
    await ev(p, () => { location.hash = '#/app/roadmap' }); await wait(p, 400);
    ok(/Şu anki faz/.test(await p.textContent('.rm-now')) && /Faz 12/.test(await p.textContent('.rm-now')), 'no current-phase card');
    ok(await p.$('#rm-12.is-now'), 'phase 12 not highlighted');
    ok(await ev(p, () => rmPct(ROADMAP[2].items)) === 100 && await ev(p, () => rmState('p2j')) === 'done', 'Faz 2 not complete');
    await ctx.close();
    const l = await page(browser, { sb: false }); await open(l.p, '#/app/roadmap'); await wait(l.p, 300); await l.p.evaluate(() => { if (dlg.open) closeDlg() });
    ok(await ev(l.p, () => rmState('p2a')) === 'done', 'local mode should show the same roadmap'); await l.ctx.close();
  });

  await step('a11y: login, sign-up, forgot, reset pages and account card pass axe (light + dark, desktop + mobile)', async () => {
    for (const [scheme, vw] of [['light', 1280], ['dark', 390]]) {
      const { ctx, p } = await page(browser, { vw }); await ctx.close();
      const c2 = await browser.newContext({ viewport: { width: vw, height: 860 }, colorScheme: scheme }); await c2.addInitScript(CFG + '\n' + MOCK); const q = await c2.newPage(); watch(q); q._base = FILE;
      for (const h of ['#/login', '#/signup', '#/forgot-password']) { await open(q, h); const v = await axe(q); ok(!v.length, `${scheme}/${vw} ${h}: ` + v.join(' | ')) }
      await open(q, '#/'); await addUser(q, 'x@ornek.com', 'Parola123', 'X'); await signIn(q, 'x@ornek.com', 'Parola123'); await ev(q, () => closeDlg());
      await ev(q, () => { location.hash = '#/app/settings/profile' }); await wait(q, 400); const v = await axe(q); ok(!v.length, `${scheme}/${vw} account: ` + v.join(' | '));
      await c2.close();
    }
  });

  await browser.close(); srv.close();
  const fails = results.filter(r => r[0] === 'FAIL');
  for (const r of results) console.log(r[0] === 'PASS' ? '✓' : '✗', r[1], r[2] ? '\n    → ' + r[2] : '');
  console.log(`\n${results.length - fails.length}/${results.length} passed`);
  process.exit(fails.length ? 1 : 0);
})();
