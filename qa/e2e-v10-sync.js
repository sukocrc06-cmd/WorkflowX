/* WorkFlowX v1.0 — cloud sync (core/sync.js) against the mock SDK's user_data table.
   Run:  node qa/e2e-v10-sync.js   (Playwright + axe-core). No network needed.
   "Another device" is simulated by writing the mock row directly (rev + 1), exactly what a
   second browser would do through the API. */
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const ROOT = path.resolve(__dirname, '..'), FILE = 'file://' + path.join(ROOT, 'index.html');
const MOCK = fs.readFileSync(path.join(__dirname, 'mock-supabase.js'), 'utf8');
const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const CFG = `window.WFX_SUPABASE={url:'https://wfxtest.supabase.co',anonKey:'${'k'.repeat(40)}',google:true};`;
const results = []; let errs = [];
async function step(name, fn) { errs = []; try { await fn(); if (errs.length) throw new Error('console: ' + errs.join(' | ')); results.push(['PASS', name]) } catch (e) { results.push(['FAIL', name, e.message.split('\n')[0]]) } }
const ok = (c, m) => { if (!c) throw new Error(m) };
const wait = (p, ms = 300) => p.waitForTimeout(ms);
const ev = (p, fn, a) => p.evaluate(fn, a);
function watch(p) { p.on('pageerror', e => errs.push('pageerror: ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/ERR_|fonts\.g|net::/.test(m.text())) errs.push(m.text()) }); p.on('dialog', d => { errs.push('dialog ' + d.message()); d.dismiss() }) }
async function page(browser, vw = 1280) {
  const ctx = await browser.newContext({ viewport: { width: vw, height: 860 }, timezoneId: 'Europe/Istanbul' });
  await ctx.addInitScript(CFG + '\n' + MOCK);
  const p = await ctx.newPage(); watch(p); return { ctx, p };
}
const open = async (p, hash) => { await p.goto(FILE + hash); await wait(p, 600) };
const addUser = (p, email, pw, name) => ev(p, ([e, pw, n]) => { const d = JSON.parse(localStorage.getItem('mock.sb') || '{"users":{},"log":[]}'); d.users[e] = { password: pw, user: { id: 'u' + Math.random().toString(36).slice(2, 10), email: e, user_metadata: { full_name: n }, app_metadata: { provider: 'email' }, email_confirmed_at: '2026-01-01' } }; localStorage.setItem('mock.sb', JSON.stringify(d)) }, [email, pw, name]);
async function signIn(p, email, pw) { await open(p, '#/login'); await p.fill('#au-email', email); await p.fill('#au-password', pw); await p.click('#landing form .btn.primary'); await wait(p, 900); await settle(p) }
/* Skip onboarding so dialogs don't hold back downloads. */
const settle = p => ev(p, () => { if (typeof closeDlg === 'function') closeDlg(); if (UI.boot === 'ready' && !S.onboarded) { S.onboarded = true; save() } });
const row = p => ev(p, () => { const d = JSON.parse(localStorage.getItem('mock.sb') || '{}'); return (d.rows || {})[AUTH.user.id] || null });
/* What a second device does: read the row, change it, write it back with rev + 1. */
const remoteEdit = (p, fnSrc) => ev(p, src => { const d = JSON.parse(localStorage.getItem('mock.sb')); const r = d.rows[AUTH.user.id]; (new Function('data', src))(r.data); r.rev += 1; localStorage.setItem('mock.sb', JSON.stringify(d)) }, fnSrc);
const addTask = (p, title) => ev(p, t => { S.tasks.push(newTask({ title: t })); save() }, title);
const badge = p => p.textContent('#sync');

(async () => {
  const browser = await chromium.launch();

  await step('First sign-in: changes are saved on the device, then uploaded (rev 1 → 2); badge says "Buluta kaydedildi"', async () => {
    const { ctx, p } = await page(browser); await open(p, '#/'); await addUser(p, 'ece@ornek.com', 'Parola123', 'Ece');
    await signIn(p, 'ece@ornek.com', 'Parola123'); await wait(p, 1600);
    let r = await row(p); ok(r && r.rev === 1, 'no first upload: ' + JSON.stringify(r && r.rev));
    await addTask(p, 'Bulut görevi'); ok(/Kaydediliyor/.test(await badge(p)), 'badge not pending: ' + await badge(p));
    await wait(p, 1700); r = await row(p);
    ok(r.rev === 2 && r.data.tasks.some(x => x.title === 'Bulut görevi'), 'task not uploaded');
    ok(/Buluta kaydedildi/.test(await badge(p)), 'badge: ' + await badge(p));
    ok(/hesabında/.test(await p.textContent('.ws-btn')), 'workspace label still says device');
    await ctx.close();
  });

  await step('New device: an empty browser gets everything from the cloud before the first screen', async () => {
    const { ctx, p } = await page(browser); await open(p, '#/'); await addUser(p, 'can@ornek.com', 'Parola123', 'Can');
    await signIn(p, 'can@ornek.com', 'Parola123'); await addTask(p, 'Masaüstünde yazıldı'); await wait(p, 1600);
    const uid = await ev(p, () => AUTH.user.id);
    await ev(p, u => { Object.keys(localStorage).filter(k => k.startsWith('workflowx.v1.u.' + u) || k === 'workflowx.v1.sync.' + u).forEach(k => localStorage.removeItem(k)) }, uid);
    await open(p, '#/app/tasks'); await p.reload(); await wait(p, 1000);
    ok(await ev(p, () => S.tasks.some(x => x.title === 'Masaüstünde yazıldı')), 'cloud data not loaded on new device');
    ok(/Masaüstünde yazıldı/.test(await p.textContent('#main')), 'not on screen');
    ok(await ev(p, () => !!localStorage.getItem(storage.key)), 'not cached on the device');
    await ctx.close();
  });

  await step('Changes from another device arrive when the tab is shown again', async () => {
    const { ctx, p } = await page(browser); await open(p, '#/'); await addUser(p, 'ada@ornek.com', 'Parola123', 'Ada');
    await signIn(p, 'ada@ornek.com', 'Parola123'); await addTask(p, 'İlk'); await wait(p, 1600);
    await remoteEdit(p, `data.tasks.push({...data.tasks[0], id:'remote01', title:'Telefondan eklendi'})`);
    await ev(p, () => document.dispatchEvent(new Event('visibilitychange'))); await wait(p, 500);
    ok(await ev(p, () => S.tasks.some(x => x.title === 'Telefondan eklendi')), 'remote change not applied');
    ok(await ev(p, () => CLOUD.rev) === (await row(p)).rev && !await ev(p, () => CLOUD.dirty), 'not in sync after download');
    await ctx.close();
  });

  await step('Both devices changed: merged per item — both edits kept, remote delete respected, then uploaded', async () => {
    const { ctx, p } = await page(browser); await open(p, '#/'); await addUser(p, 'ege@ornek.com', 'Parola123', 'Ege');
    await signIn(p, 'ege@ornek.com', 'Parola123');
    await ev(p, () => { ['A', 'B', 'C'].forEach(t => S.tasks.push(newTask({ title: t }))); save() }); await wait(p, 1600);
    await ev(p, () => { window.__sbDbFail = true; S.tasks.find(x => x.title === 'A').title = 'A (bu cihaz)'; save() }); await wait(p, 1500);
    ok(/kaydedilemedi/i.test(await badge(p)), 'failure not shown: ' + await badge(p));
    await remoteEdit(p, `data.tasks.find(x=>x.title==='B').title='B (telefon)'; data.tasks=data.tasks.filter(x=>x.title!=='C'); data.tasks.push({...data.tasks[0], id:'remote02', title:'D (telefon)'})`);
    await ev(p, () => { window.__sbDbFail = false; return cloudSync({ loud: true }) }); await wait(p, 400);
    const titles = (await ev(p, () => S.tasks.map(x => x.title))).sort().join('|');
    ok(titles === 'A (bu cihaz)|B (telefon)|D (telefon)', 'merge wrong: ' + titles);
    const r = await row(p); ok(r.data.tasks.map(x => x.title).sort().join('|') === titles, 'merged result not uploaded');
    ok(/Buluta kaydedildi/.test(await badge(p)), 'badge after merge: ' + await badge(p));
    await ctx.close();
  });

  await step('Write race: another device writes during our upload → download, merge, retry (nothing lost)', async () => {
    const { ctx, p } = await page(browser); await open(p, '#/'); await addUser(p, 'oya@ornek.com', 'Parola123', 'Oya');
    await signIn(p, 'oya@ornek.com', 'Parola123'); await addTask(p, 'Bir'); await wait(p, 1600);
    await remoteEdit(p, `data.tasks.push({...data.tasks[0], id:'remote03', title:'Araya giren'})`);
    await ev(p, () => { const real = cloudRemoteRev; let n = 0; window.cloudRemoteRev = async () => n++ === 0 ? CLOUD.rev : real() }); await addTask(p, 'İki');   // first check misses the other write → upload must fail and retry
    await wait(p, 1800);
    const r = await row(p), t = r.data.tasks.map(x => x.title).sort().join('|');
    ok(t === 'Araya giren|Bir|İki', 'race lost data: ' + t);
    ok(await ev(p, () => S.tasks.length) === 3, 'local not merged');
    await ctx.close();
  });

  await step('Offline: keeps working on the device, uploads when the network returns', async () => {
    const { ctx, p } = await page(browser); await open(p, '#/'); await addUser(p, 'arda@ornek.com', 'Parola123', 'Arda');
    await signIn(p, 'arda@ornek.com', 'Parola123'); await wait(p, 1600); const rev0 = (await row(p)).rev;
    await ctx.setOffline(true); await addTask(p, 'Uçakta yazıldı'); await wait(p, 1500);
    ok(/Çevrimdışı/.test(await badge(p)), 'offline not shown: ' + await badge(p)); ok((await row(p)).rev === rev0, 'uploaded while offline');
    await ctx.setOffline(false); await wait(p, 800);
    const r = await row(p); ok(r.rev === rev0 + 1 && r.data.tasks.some(x => x.title === 'Uçakta yazıldı'), 'not uploaded after reconnect');
    await ctx.close();
  });

  await step('Sign-out sends pending changes first; another account on the same device sees only its own data', async () => {
    const { ctx, p } = await page(browser); await open(p, '#/'); await addUser(p, 'bir@ornek.com', 'Parola123', 'Bir'); await addUser(p, 'iki@ornek.com', 'Parola123', 'İki');
    await signIn(p, 'bir@ornek.com', 'Parola123'); await wait(p, 1600);
    await addTask(p, 'Gizli iş'); await ev(p, () => authSignOut(false)); await wait(p, 700);
    const d = await ev(p, () => JSON.parse(localStorage.getItem('mock.sb')).rows);
    ok(Object.values(d).some(r => r.data.tasks.some(x => x.title === 'Gizli iş')), 'pending change lost on sign-out');
    await signIn(p, 'iki@ornek.com', 'Parola123'); await wait(p, 1500);
    ok(!await ev(p, () => S.tasks.some(x => x.title === 'Gizli iş')), 'other account data leaked');
    const mine = await row(p); ok(!mine || !mine.data.tasks.some(x => x.title === 'Gizli iş'), 'wrong row');
    await ctx.close();
  });

  await step('Cloud data is untrusted: markup is escaped, broken records are fixed, nothing runs', async () => {
    const { ctx, p } = await page(browser); await open(p, '#/'); await addUser(p, 'xss@ornek.com', 'Parola123', 'X');
    await signIn(p, 'xss@ornek.com', 'Parola123'); await addTask(p, 'Normal'); await wait(p, 1600);
    await remoteEdit(p, `data.tasks.push({...data.tasks[0], id:'evil01', title:'<img src=x onerror="window.__pwned=1">'}); data.tasks.push({id:'bad', title:42, status:'???'}); data.projects='nope'; data.__proto__x=1`);
    await ev(p, () => cloudSync()); await wait(p, 400); await open(p, '#/app/tasks'); await wait(p, 400);
    ok(!await ev(p, () => window.__pwned), 'script ran'); ok(!await p.$('#main img[src=x]'), 'markup rendered as HTML');
    ok(await ev(p, () => Array.isArray(S.projects) && S.tasks.every(x => typeof x.title === 'string')), 'invalid data not sanitized');
    await ctx.close();
  });

  await step('Table not set up yet: no errors, data stays on the device, Settings explains what to run', async () => {
    const { ctx, p } = await page(browser); await open(p, '#/'); await addUser(p, 'yok@ornek.com', 'Parola123', 'Yok');
    await ev(p, () => { window.__sbNoTable = true });
    await signIn(p, 'yok@ornek.com', 'Parola123'); await addTask(p, 'Yerel'); await wait(p, 1500);
    ok(await ev(p, () => CLOUD.missing) && /Bu cihaza kaydedildi/.test(await badge(p)), 'badge: ' + await badge(p));
    await open(p, '#/app/settings/profile'); await wait(p, 300); ok(/Bulut tablosu henüz kurulmamış/.test(await p.textContent('.acct-card')), 'no hint in settings');
    await ctx.close();
  });

  await step('Settings → Profile shows cloud status + "Şimdi eşitle"; axe clean (light + dark, desktop + mobile)', async () => {
    for (const [vw, th] of [[1280, 'light'], [390, 'dark']]) {
      const { ctx, p } = await page(browser, vw); await open(p, '#/'); await addUser(p, 'ayla@ornek.com', 'Parola123', 'Ayla');
      await ev(p, t => localStorage.setItem('workflowx.v1.theme', t), th);
      await signIn(p, 'ayla@ornek.com', 'Parola123'); await wait(p, 1500); await open(p, '#/app/settings/profile');
      ok(/bulutta saklanıyor/.test(await p.textContent('.acct-card')), 'status text missing');
      await p.click('[data-a=syncNow]'); await wait(p, 500); ok(/Son eşitleme/.test(await p.textContent('.acct-card')), 'last sync time missing');
      await p.addScriptTag({ content: AXE });
      const v = await ev(p, async () => (await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa'] })).violations.map(v => v.id + ': ' + v.nodes.map(n => n.target).join(', ')));
      errs = errs.filter(e => !/CORS|XMLHttpRequest|Cross origin/.test(e));
      ok(!v.length, `${vw}/${th}: ` + v.join(' ; '));
      await ctx.close();
    }
  });

  await step('Local mode (no Supabase): sync stays off, nothing changes for account-less use', async () => {
    const ctx = await browser.newContext(); const p = await ctx.newPage(); watch(p); await open(p, '#/app'); await wait(p, 300);
    await ev(p, () => { S.onboarded = true; closeDlg(); S.tasks.push(newTask({ title: 'Hesapsız' })); save() }); await wait(p, 1500);
    ok(!await ev(p, () => cloudOn()) && /Bu cihaza kaydedildi/.test(await badge(p)), 'sync active in local mode');
    await ctx.close();
  });

  await step('File version + Google: without the launcher a clear hint; with WorkflowX-Baslat running it continues on localhost:5500 and starts Google sign-in', async () => {
    const { ctx, p } = await page(browser); await open(p, '#/login');
    ok(/WorkflowX-Baslat/.test(await p.textContent('#landing')), 'file callout does not mention the launcher');
    await p.click('[data-a=authGoogle]'); await wait(p, 1900);
    ok(/WorkflowX-Baslat/.test(await p.textContent('#au-err')), 'no launcher hint: ' + await p.textContent('#au-err'));
    const { spawn } = require('child_process');
    const srv = spawn(process.execPath, [path.join(ROOT, 'tools', 'serve.js')], { env: { ...process.env, WFX_NO_OPEN: '1' } });
    let out = ''; srv.stdout.on('data', d => out += d);
    for (let i = 0; i < 30 && !/açık/.test(out); i++) await wait(p, 100);
    try {
      const r = await (await fetch('http://localhost:5500/__wfx.gif')).status; ok(r === 200, 'ping not served');
      ok((await fetch('http://localhost:5500/web/package.json')).status === 404 && (await fetch('http://localhost:5500/%2e%2e/%2e%2e/etc/passwd')).status === 404 && (await fetch('http://localhost:5500/.git/config')).status === 404, 'serves hidden/outside files');
      await p.click('[data-a=authGoogle]'); await wait(p, 1500);
      ok(p.url().startsWith('http://localhost:5500/index.html#/login'), 'did not move to launcher: ' + p.url());
      const log = await ev(p, () => JSON.parse(localStorage.getItem('mock.sb') || '{"log":[]}').log);
      ok(log.some(([k, v]) => k === 'oauth' && v.provider === 'google' && v.redirectTo === 'http://localhost:5500/index.html'), 'google sign-in not started on localhost: ' + JSON.stringify(log));
      ok(!/go=google/.test(p.url()), 'one-shot param left in the address');
    } finally { srv.kill() }
    await ctx.close();
  });

  await browser.close();
  const pass = results.filter(r => r[0] === 'PASS').length;
  results.forEach(r => console.log(r[0] === 'PASS' ? '✓' : '✗', r[1], r[2] ? '\n    → ' + r[2] : ''));
  console.log(`\n${pass}/${results.length} passed`); process.exit(pass === results.length ? 0 : 1);
})();
