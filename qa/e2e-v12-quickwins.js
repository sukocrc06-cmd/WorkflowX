/* WorkFlowX v1.2 — weekly report, structured plan validation, planning usage log + rate limit, new roadmap.
   Run:  node qa/e2e-v12-quickwins.js   (Playwright + axe-core). Local mode, no network. */
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const ROOT = path.resolve(__dirname, '..'), FILE = 'file://' + path.join(ROOT, 'index.html');
const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const results = []; let errs = [];
async function step(name, fn) { errs = []; try { await fn(); if (errs.length) throw new Error('console: ' + errs.join(' | ')); results.push(['PASS', name]) } catch (e) { results.push(['FAIL', name, e.message.split('\n')[0]]) } }
const ok = (c, m) => { if (!c) throw new Error(m) };
const wait = (p, ms = 300) => p.waitForTimeout(ms);
const ev = (p, fn, a) => p.evaluate(fn, a);
function watch(p) { p.on('pageerror', e => errs.push('pageerror: ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/ERR_|fonts\.g|net::/.test(m.text())) errs.push(m.text()) }); p.on('dialog', d => { errs.push('dialog ' + d.message()); d.dismiss() }) }
async function page(browser, vw = 1280, extra = {}) {
  const ctx = await browser.newContext({ viewport: { width: vw, height: 900 }, timezoneId: 'Europe/Istanbul', acceptDownloads: true, ...extra });
  const p = await ctx.newPage(); watch(p); return { ctx, p };
}
const open = async (p, hash) => { await p.goto(FILE + hash); await wait(p, 600) };
const nav = async (p, hash) => { await ev(p, h => { location.hash = h }, hash); await wait(p, 350) };
const axe = async p => { await p.addScriptTag({ content: AXE }); const v = await ev(p, async () => (await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa'] })).violations.map(v => v.id + ': ' + v.nodes.map(n => n.target).join(', '))); errs = errs.filter(e => !/CORS|XMLHttpRequest|Cross origin/.test(e)); return v };
/* A known week: Monday of the current week, with work spread over it. */
const seedWeek = p => ev(p, () => {
  closeDlg(); S.onboarded = true;
  const mon = startOfWeek(new Date()), at = (d, h) => { const x = addDays(mon, d); x.setHours(h, 0, 0, 0); return x };
  const pr = { id: 'prA', name: 'Site <yenileme>', color: '#6366f1', icon: 'globe', status: 'active', archived: false, archivedAt: null, createdAt: toLocal(at(0, 8)), desc: '', start: '', deadline: '', milestones: [] };
  S.projects.push(pr);
  const log = (d, h0, h1) => ({ start: at(d, h0).toISOString(), end: at(d, h1).toISOString() });
  S.tasks.push(
    newTask({ id: 'tk1', title: 'Biten iş <b>1</b>', projectId: 'prA', status: 'done', estimate: 2, completedAt: toLocal(at(0, 15)), logs: [log(0, 9, 11)] }),
    newTask({ id: 'tk2', title: 'Biten iş 2', status: 'done', estimate: 1, completedAt: toLocal(at(1, 15)), logs: [log(1, 9, 10)] }),
    newTask({ id: 'tk3', title: 'Geçen haftadan', status: 'done', estimate: 1, completedAt: toLocal(at(-3, 12)), logs: [log(-3, 9, 12)] }),
    newTask({ id: 'tk4', title: 'Gelecek hafta teslim', status: 'todo', estimate: 3, due: toLocal(at(9, 17)) }),
    newTask({ id: 'tk5', title: 'Açık iş', status: 'todo', estimate: 6, due: toLocal(at(20, 17)) })
  );
  S.blocks.push({ id: 'bl1', taskId: 'tk5', start: toLocal(at(2, 9)), end: toLocal(at(2, 12)) });
  S.events.push({ id: 'ev1', title: 'Toplantı', type: 'meeting', start: toLocal(at(1, 14)), end: toLocal(at(1, 15)) });
  save(); render();
});

(async () => {
  const browser = await chromium.launch();

  await step('Weekly report: real numbers for this week, deltas vs last week, lists, links; Analysis links to it; nav stays on Analysis', async () => {
    const { ctx, p } = await page(browser); await open(p, '#/app'); await seedWeek(p);
    await nav(p, '#/app/analytics'); ok(await p.$('a[href="#/app/analytics/report"]'), 'no link from Analysis');
    await p.click('a[href="#/app/analytics/report"]'); await wait(p, 400);
    ok(await ev(p, () => UI.view) === 'report' && await p.$('.nav-item.on[href="#/app/analytics"]'), 'route / nav highlight');
    const r = await ev(p, () => { const r = weeklyReport(new Date()); return { done: r.completed.length, logged: r.logged, planned: r.planned, meet: r.meetings, prev: r.prev.done, next: r.dueNext.map(x => x.id), proj: r.byProject.map(x => x.name + ':' + x.h) } });
    ok(r.done === 2 && r.logged === 3 && r.planned === 3 && r.meet === 1 && r.prev === 1, 'numbers: ' + JSON.stringify(r));
    ok(r.next.join() === 'tk4' && r.proj.includes('Site <yenileme>:2'), 'lists: ' + JSON.stringify(r));
    const txt = await p.textContent('#main');
    ok(/Biten iş <b>1<\/b>/.test(txt) && !(await p.$('#main .rep-list a b')), 'user text not escaped');
    ok(/Gelecek hafta teslim/.test(txt) && /Toplantı|Etkinlikler/.test(txt), 'sections missing');
    await ctx.close();
  });

  await step('Weekly report: week navigation, invalid ?w falls back to this week, future week note, empty week state', async () => {
    const { ctx, p } = await page(browser); await open(p, '#/app'); await seedWeek(p);
    await nav(p, '#/app/analytics/report?w=2026-13-45'); ok(await ev(p, () => UI.view === 'report' && UI.param === null), 'invalid w not ignored');
    await p.click('a[aria-label="Önceki hafta"]'); await wait(p, 350);
    const prevDone = await ev(p, () => weeklyReport(parseDay(UI.param)).completed.map(x => x.id).join());
    ok(prevDone === 'tk3', 'previous week: ' + prevDone);
    await nav(p, '#/app/analytics/report?w=2030-01-07'); ok(/henüz başlamadı/.test(await p.textContent('#main')) && /kayıt yok/.test(await p.textContent('#main')), 'future/empty week');
    await nav(p, '#/app/analytics/report/x'); ok(await ev(p, () => UI.view) === 'notfound', 'bad subpath accepted');
    await ctx.close();
  });

  await step('Weekly report: Markdown download (content + safe), copy to clipboard, print button', async () => {
    const { ctx, p } = await page(browser, 1280, { permissions: ['clipboard-read', 'clipboard-write'] }); await open(p, '#/app'); await seedWeek(p);
    await nav(p, '#/app/analytics/report');
    const [dl] = await Promise.all([p.waitForEvent('download'), p.click('[data-a=reportMd]')]);
    const md = fs.readFileSync(await dl.path(), 'utf8');
    ok(/^# Haftalık rapor: /.test(md) && /Tamamlanan görev: \*\*2\*\*/.test(md) && /- Biten iş <b>1<\/b> · Site <yenileme>/.test(md) && /Gelecek hafta teslim/.test(md), 'markdown: ' + md.slice(0, 300));
    ok(/^workflowx-rapor-\d{4}-\d{2}-\d{2}\.md$/.test(dl.suggestedFilename()), 'file name ' + dl.suggestedFilename());
    await p.click('[data-a=reportCopy]'); await wait(p, 300);
    ok(/Haftalık rapor/.test(await ev(p, () => navigator.clipboard.readText())), 'not copied');
    await ev(p, () => { window.__printed = 0; window.print = () => { window.__printed++ } }); await p.click('[data-a=reportPrint]');
    ok(await ev(p, () => window.__printed) === 1, 'print not called');
    await ctx.close();
  });

  await step('Structured plan validation: bad plans are rejected whole; bad blocks are dropped with a reason and shown', async () => {
    const { ctx, p } = await page(browser); await open(p, '#/app'); await seedWeek(p);
    const res = await ev(p, () => {
      const fut = h => { const d = addDays(sod(new Date()), 2); d.setHours(h, 0, 0, 0); return toLocal(d) };
      const base = { id: 'pl1', source: 'rules', request: null, createdAt: new Date().toISOString(), taskIds: ['tk5'], addedDeps: [], unplaced: [] };
      const good = { taskId: 'tk5', start: fut(9), end: fut(10), why: null };
      const v = validatePlan({ ...base, blocks: [good, { taskId: 'nope', start: fut(11), end: fut(12) }, { taskId: 'tk5', start: fut(13), end: fut(12) }, { taskId: 'tk5', start: fut(0), end: fut(13) }, { taskId: 'tk5', start: fut(9), end: fut(10) }, { taskId: 'tk1', start: fut(14), end: fut(15) }, { taskId: 'tk5', start: '2020-01-01T09:00', end: '2020-01-01T10:00' }, { taskId: 'tk5', start: 'yarın', end: fut(16) }, '<img src=x>'] });
      const bad1 = validatePlan({ ...base, blocks: 'x' }), bad2 = validatePlan({ ...base, source: 'evil' }), bad3 = validatePlan(null);
      return { kept: v.blocks.length, why: v.rejected.map(r => r.why), b1: bad1.invalid && !bad1.blocks.length, b2: bad2.invalid, b3: bad3.invalid };
    });
    ok(res.kept === 1, 'kept ' + res.kept);
    const w = res.why.join('|');
    ok(/görev yok/.test(w) && /bitiş başlangıçtan önce/.test(w) && /12 saatten uzun/.test(w) && /çakışıyor/.test(w) && /tamamlanmış/.test(w) && /geçmişte/.test(w) && /biçim geçersiz/.test(w) && /nesne olmalı/.test(w), 'reasons: ' + w);
    ok(res.b1 && res.b2 && res.b3, 'invalid plans not rejected');
    errs = errs.filter(e => !/\[plan\] invalid/.test(e));
    await ev(p, () => { UI.draft = validatePlan({ id: 'pl2', source: 'rules', request: null, createdAt: new Date().toISOString(), taskIds: ['tk5'], unplaced: [], blocks: [{ taskId: 'nope', start: '2030-01-01T09:00', end: '2030-01-01T10:00' }] }) });
    await nav(p, '#/app/planning'); ok(/doğrulamadan geçemedi/.test(await p.textContent('#main')), 'rejection not shown');
    await ctx.close();
  });

  await step('Planning usage log + rate limit: each suggestion is logged; the 61st within an hour is refused with a wait time', async () => {
    const { ctx, p } = await page(browser); await open(p, '#/app'); await seedWeek(p);
    await ev(p, () => suggestFor([taskOf('tk5')])); await wait(p, 300);
    let log = await ev(p, () => planUsage.list()); ok(log.length === 1 && log[0].tasks >= 1 && log[0].blocks >= 1 && log[0].ok, 'not logged: ' + JSON.stringify(log));
    ok(!/tk5|Açık iş/.test(JSON.stringify(log)), 'log contains task data');
    await ev(p, () => { const a = planUsage.list(); for (let i = 0; i < 59; i++)a.push({ at: Date.now() - 1000 * i, source: 'rules', tasks: 1, blocks: 1, rejected: 0, ms: 1, ok: true }); prefs.set('usage.plan', JSON.stringify(a)); UI.draft = null });
    await ev(p, () => suggestFor([taskOf('tk5')])); await wait(p, 300);
    ok(/Çok sık öneri istendi \(60\/60/.test(await p.textContent('body')) && !await ev(p, () => UI.draft), 'limit not enforced');
    ok(await ev(p, () => planUsage.list().length) === 60, 'refused request was logged');
    await nav(p, '#/app/settings/privacy'); ok(/60\/60/.test(await p.textContent('#main')) && await p.$('.usage-log'), 'settings log missing');
    await p.click('[data-a=usageClear]'); await wait(p, 300); ok(await ev(p, () => planUsage.list().length) === 0 && /Henüz planlama önerisi/.test(await p.textContent('#main')), 'clear failed');
    await ev(p, () => prefs.set('usage.plan', '{bozuk')); ok(await ev(p, () => planUsage.check().ok), 'corrupt log breaks planning');
    await ctx.close();
  });

  await step('New roadmap: Faz 0–12 complete, Faz 13–17 added, current phase is Faz 13 (Teams), moved items are not duplicated', async () => {
    const { ctx, p } = await page(browser); await open(p, '#/app'); await ev(p, () => closeDlg()); await nav(p, '#/app/roadmap');
    const r = await ev(p, () => ({ old: ROADMAP.filter(x => x.n <= 12).every(x => rmPct(x.items) === 100), nw: ROADMAP.filter(x => x.n >= 13).map(x => x.n + ':' + x.items.length), now: ROADMAP.filter(x => x.now).map(x => x.n), ids: ROADMAP.flatMap(x => x.items.map(i => i[0])), total: rmPct(ROADMAP.flatMap(x => x.items)) }));
    ok(r.old, 'old phases not complete'); ok(r.nw.join() === '13:6,14:6,15:5,16:4,17:5', 'new phases ' + r.nw);
    ok(r.now.join() === '13' && await p.$('#rm-13.is-now'), 'current phase');
    ok(new Set(r.ids).size === r.ids.length && !r.ids.includes('p9c') && !r.ids.includes('p11c'), 'duplicate/moved ids');
    ok(/Ekip ve paylaşım/.test(await p.textContent('.rm-now')) && /V4/.test(await p.textContent('#main')), 'roadmap page');
    await ctx.close();
  });

  await step('a11y: weekly report, privacy settings with usage log and roadmap pass axe (light desktop + dark mobile)', async () => {
    for (const [vw, th] of [[1280, 'light'], [390, 'dark']]) {
      const { ctx, p } = await page(browser, vw); await open(p, '#/app'); await ev(p, t => { localStorage.setItem('workflowx.v1.theme', t) }, th); await p.reload(); await wait(p, 600); await seedWeek(p);
      await ev(p, () => suggestFor([taskOf('tk5')])); await wait(p, 300);
      for (const h of ['#/app/analytics/report', '#/app/settings/privacy', '#/app/roadmap']) { await nav(p, h); await wait(p, 900); const v = await axe(p); ok(!v.length, `${vw}/${th} ${h}: ` + v.join(' ; ')) }
      await ctx.close();
    }
  });

  await browser.close();
  const pass = results.filter(r => r[0] === 'PASS').length;
  results.forEach(r => console.log(r[0] === 'PASS' ? '✓' : '✗', r[1], r[2] ? '\n    → ' + r[2] : ''));
  console.log(`\n${pass}/${results.length} passed`); process.exit(pass === results.length ? 0 : 1);
})();
