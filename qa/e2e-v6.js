/* WorkFlowX v0.6 — final-phase checks: onboarding, safe import, ICS time zones, timer pause/resume,
   workload optimisation, drag feedback, DST, error UX, grouped settings, demo label, mobile actions.
   Run:  node qa/e2e-v6.js   (Playwright, Chromium). Fails on console errors and unexpected dialogs. */
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs'), os = require('os');
const URL = 'file://' + path.resolve(__dirname, '../index.html');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'wfx-v6-'));
const results = []; let errs = [], allow = null;
async function step(name, fn) { errs = []; allow = null; try { await fn(); const bad = errs.filter(e => !(allow && allow.test(e))); if (bad.length) throw new Error('console: ' + bad.join(' | ')); results.push(['PASS', name]) } catch (e) { results.push(['FAIL', name, String(e.message || e).slice(0, 400)]) } }
const ok = (c, m) => { if (!c) throw new Error(m) };
function watch(p) { p.on('pageerror', e => errs.push('pageerror: ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/ERR_TUNNEL|fonts\.g|net::ERR_/.test(m.text())) errs.push(m.text()) }); p.on('dialog', d => { errs.push('unexpected dialog: ' + d.message()); d.dismiss() }) }
const wait = (p, ms = 300) => p.waitForTimeout(ms);
const go = async (p, h) => { await p.evaluate(h => { location.hash = h }, h); await wait(p, 350) };
const ev = (p, fn, a) => p.evaluate(fn, a);
const L = (d, h, m = 0) => { const x = new Date(d); const z = n => String(n).padStart(2, '0'); return `${x.getFullYear()}-${z(x.getMonth() + 1)}-${z(x.getDate())}T${z(h)}:${z(m)}` };
const workday = n => { const d = new Date(); d.setHours(0, 0, 0, 0); let k = 0; while (k < n) { d.setDate(d.getDate() + 1); if (d.getDay() % 6) k++ } return d };
async function ctxPage(browser, opts = {}, skip = true) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, timezoneId: 'Europe/Istanbul', acceptDownloads: true, ...opts });
  const p = await ctx.newPage(); watch(p); await p.goto(URL + '#/app'); await wait(p, 500);
  if (skip && await p.isVisible('#dlg[open]')) { await p.click('[data-a=obSkip]'); await wait(p) }
  return { ctx, p };
}
const load = (p, st) => ev(p, st => { setState(sanitizeState({ onboarded: true, ...st }).state); save(); render() }, st);

(async () => {
  const browser = await chromium.launch();

  await step('Onboarding: 3 short steps → settings, first project and first task', async () => {
    const { ctx, p } = await ctxPage(browser, {}, false);
    ok(await p.isVisible('.ob-steps'), 'no step indicator');
    await p.fill('#on', 'Ayşe'); await p.selectOption('#or', 'Tasarımcı'); await p.click('#dlg .btn.primary'); await wait(p);
    ok(await p.isVisible('input[name=wd]'), 'step 2 missing work days');
    await p.uncheck('input[name=wd][value="5"]'); await p.selectOption('#ows', '10'); await p.selectOption('#owe', '19'); await p.fill('#omd', '7'); await p.click('#dlg .btn.primary'); await wait(p);
    await p.fill('#op', 'Acme'); await p.fill('#ot', 'Sunumu hazırla perşembe 3 saat yüksek'); await wait(p, 150);
    ok(/Süre/.test(await p.textContent('#ob-prev')), 'parsed preview missing'); await p.click('#dlg .btn.primary'); await wait(p, 500);
    const st = await ev(p, () => ({ s: S.settings, n: S.profile.name, p: S.projects.map(x => x.name), t: S.tasks.map(x => ({ t: x.title, e: x.estimate, pr: x.priority, pj: !!x.projectId })) , ob: S.onboarded }));
    ok(st.ob && st.n === 'Ayşe' && st.s.workStart === 10 && st.s.workEnd === 19 && st.s.maxDaily === 7 && !st.s.workDays.includes(5), 'settings not saved ' + JSON.stringify(st.s));
    ok(st.p[0] === 'Acme' && st.t[0].t === 'Sunumu hazırla' && st.t[0].e === 3 && st.t[0].pr === 'high' && st.t[0].pj, 'first work wrong ' + JSON.stringify(st));
    ok(/takvime/i.test(await p.textContent('#toasts')), 'no “schedule it?” offer');
    await ctx.close();
  });
  await step('Onboarding: skippable from any step; Back keeps answers', async () => {
    const { ctx, p } = await ctxPage(browser, {}, false);
    await p.fill('#on', 'Can'); await p.click('#dlg .btn.primary'); await wait(p); await p.click('[data-a=obBack]'); await wait(p);
    ok(await p.inputValue('#on') === 'Can', 'Back lost the name'); await p.click('#dlg .btn.primary'); await wait(p);
    await p.click('[data-a=obSkip]'); await wait(p); ok(await ev(p, () => S.onboarded && !dlg.open), 'skip failed');
    await ctx.close();
  });

  {
    const { ctx, p } = await ctxPage(browser);
    await step('Import: invalid file explained; merge keeps data; replace keeps a backup', async () => {
      const bad = path.join(TMP, 'bad.json'); fs.writeFileSync(bad, '{nope'); await go(p, '#/app/settings/data');
      await p.setInputFiles('input[data-c=imp]', bad); await wait(p); ok(/Dosya geçersiz/.test(await p.textContent('#toasts')), 'invalid file not explained');
      await load(p, { tasks: [{ id: 'mine', title: 'Benim görevim' }] }); await go(p, '#/app/settings/data');
      const f = path.join(TMP, 'b.json'); fs.writeFileSync(f, JSON.stringify({ projects: [], tasks: [{ id: 'imp', title: 'Yedekteki görev' }] }));
      await p.setInputFiles('input[data-c=imp]', f); await wait(p); ok(await p.isChecked('input[name=mode][value=merge]'), 'merge is not the default');
      await p.click('#dlg .dlg-f .btn.primary'); await wait(p, 500);
      ok(await ev(p, () => S.tasks.map(x => x.id).sort().join()) === 'imp,mine', 'merge lost data');
      await go(p, '#/app/settings/data'); await p.setInputFiles('input[data-c=imp]', f); await wait(p); await p.check('input[name=mode][value=replace]'); await p.click('#dlg .dlg-f .btn.primary'); await wait(p, 500);
      ok(await ev(p, () => S.tasks.map(x => x.id).join()) === 'imp', 'replace failed');
      ok(await ev(p, () => JSON.parse(prefs.get('backup')).tasks.length === 2), 'no automatic backup before replace');
      await go(p, '#/app/settings/data'); ok(await p.isVisible('[data-a=downloadBackup]'), 'backup download missing');
    });
    await step('ICS: TZID converted, unknown zones and invalid dates reported (no crash)', async () => {
      const d = workday(2), y = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
      const ics = ['BEGIN:VCALENDAR', 'BEGIN:VEVENT', 'UID:tz1', 'SUMMARY:NY call', `DTSTART;TZID=America/New_York:${y}T090000`, `DTEND;TZID=America/New_York:${y}T100000`, 'END:VEVENT',
        'BEGIN:VEVENT', 'UID:tz2', 'SUMMARY:Win zone', `DTSTART;TZID=Turkey Standard Time:${y}T090000`, `DTEND;TZID=Turkey Standard Time:${y}T100000`, 'END:VEVENT',
        'BEGIN:VEVENT', 'UID:bad', 'SUMMARY:Broken', 'DTSTART:20261399T250000', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
      const f = path.join(TMP, 'tz.ics'); fs.writeFileSync(f, ics); await go(p, '#/app/settings/data');
      await p.setInputFiles('input[data-c=ics]', f); await wait(p, 500);
      const e = await ev(p, () => S.events.filter(x => x.source === 'ics').map(x => [x.title, x.start.slice(11)]));
      const ny = e.find(x => x[0] === 'NY call'), off = await ev(p, y => { const u = Date.UTC(+y.slice(0, 4), +y.slice(4, 6) - 1, +y.slice(6, 8), 12); const f = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hourCycle: 'h23', hour: '2-digit' }); return (12 - +f.format(new Date(u)) + 24) % 24 }, y);
      ok(ny && ny[1] === String(9 + off + 3).padStart(2, '0') + ':00', 'TZID not converted ' + JSON.stringify(e) + ' off=' + off);
      ok(e.some(x => x[0] === 'Win zone' && x[1] === '09:00'), 'unknown zone not kept as local');
      const tt = await p.textContent('#toasts'); ok(/geçersiz/.test(tt) && /saat dilimi/.test(tt), 'not reported: ' + tt);
    });
    await step('Timer: pause keeps it on the task, persists across reload, resume + stop log segments', async () => {
      await load(p, { tasks: [{ id: 'tt', title: 'Zaman testi', estimate: 2 }] });
      await go(p, '#/app/tasks/tt'); await p.click('.detail-actions [data-a=timerStart]'); await wait(p);
      await ev(p, () => { S.timer.start = new Date(Date.now() - 20 * 60e3).toISOString(); save() });
      await p.click('#timer [data-a=timerPause]'); await wait(p);
      ok(await p.isVisible('#timer.paused'), 'paused state not shown');
      await p.reload(); await wait(p, 700);
      ok(await ev(p, () => S.timer && S.timer.paused && taskOf('tt').logs.length === 1), 'paused timer lost on reload');
      await p.click('#timer [data-a=timerResume]'); await wait(p); await ev(p, () => { S.timer.start = new Date(Date.now() - 10 * 60e3).toISOString() });
      await p.click('#timer [data-a=timerStop]'); await wait(p);
      const logs = await ev(p, () => taskOf('tt').logs.map(l => Math.round((new Date(l.end) - new Date(l.start)) / 60e3)));
      ok(logs.join() === '20,10' && await p.isHidden('#timer'), 'segments wrong ' + logs);
    });
    await step('Workload: “Optimise plan” moves focus blocks off an overloaded day (meetings untouched), only after approval', async () => {
      const d = workday(1);
      await load(p, { tasks: [{ id: 'w', title: 'Rapor', estimate: 3, due: L(workday(5), 17) }], events: [{ id: 'm', title: 'Workshop', type: 'meeting', start: L(d, 9), end: L(d, 14) }], blocks: [{ id: 'b1', taskId: 'w', start: L(d, 14), end: L(d, 17) }] });
      await go(p, '#/app'); ok(await p.isVisible('[data-a=optimize]'), 'optimise button missing on overview');
      await p.click('[data-a=optimize]'); await wait(p, 500);
      ok(await ev(p, () => UI.view === 'planning' && UI.draft && UI.draft.replaces.includes('b1')), 'no replacing draft');
      ok(await ev(p, () => S.blocks.length === 1 && S.blocks[0].id === 'b1'), 'changed before approval');
      await p.click('.plan-actions [data-a=applyDraft]'); await wait(p, 500);
      const r = await ev(p, d => ({ old: S.blocks.some(b => b.id === 'b1'), onDay: S.blocks.filter(b => b.start.startsWith(d)).length, total: S.blocks.reduce((s, b) => s + (new Date(b.end) - new Date(b.start)) / 36e5, 0), meet: S.events[0].start }), L(d, 0).slice(0, 10));
      ok(!r.old && r.total === 3 && r.meet.endsWith('09:00'), 'optimisation wrong ' + JSON.stringify(r));
    });
    await step('Drag: live conflict warning while dragging; Esc cancels the move', async () => {
      const d = workday(2), ds = L(d, 0).slice(0, 10);
      await load(p, { tasks: [{ id: 'k', title: 'Odak', estimate: 1 }], events: [{ id: 'm2', title: 'Toplantı', type: 'meeting', start: L(d, 11), end: L(d, 12) }], blocks: [{ id: 'bb', taskId: 'k', start: L(d, 9), end: L(d, 10) }] });
      await go(p, '#/app/calendar/week?d=' + ds); const bb = await (await p.$('.ev[data-id="bb"]')).boundingBox();
      await p.mouse.move(bb.x + bb.width / 2, bb.y + 6); await p.mouse.down(); await p.mouse.move(bb.x + bb.width / 2, bb.y + 40, { steps: 5 }); await p.mouse.move(bb.x + bb.width / 2, bb.y + 6 + 2 * 48, { steps: 5 }); await wait(p, 100);
      ok(await p.$('.ev.dragging.will-conflict'), 'no live conflict warning'); ok(await p.$('.cal-day.drop'), 'no drop target highlight');
      await p.keyboard.press('Escape'); await wait(p); await p.mouse.up(); await wait(p);
      ok(await ev(p, () => S.blocks[0].start.endsWith('09:00')), 'Esc did not cancel'); ok(!(await p.isVisible('#dlg[open]')), 'dialog after cancel');
    });
    await step('Error UX: a failing page offers Retry; a failing action shows a plain message', async () => {
      allow = /\[render\]|\[action\]|boom/;
      await ev(p, () => { window.__orig = V.analytics; V.analytics = () => { throw new TypeError('boom') } }); await go(p, '#/app/analytics');
      ok(/Bu sayfa gösterilemedi/.test(await p.textContent('#main')) && !/TypeError/.test(await p.textContent('#main')), 'technical error shown');
      await ev(p, () => { V.analytics = window.__orig }); await p.click('[data-a=rerender]'); await wait(p); ok(await p.$('.kpis'), 'retry did not recover');
      await ev(p, () => { A.__boom = () => { throw new Error('boom') }; const b = document.createElement('button'); b.dataset.a = '__boom'; b.id = 'boom'; document.body.appendChild(b) }); await p.click('#boom'); await wait(p);
      ok(/İşlem gerçekleştirilemedi/.test(await p.textContent('#toasts')), 'no friendly message');
    });
    await step('Settings: grouped sections with own URLs; theme/language apply immediately; sync states', async () => {
      for (const s of ['profile', 'appearance', 'work', 'notifications', 'shortcuts', 'templates', 'data', 'privacy', 'developer']) { await go(p, '#/app/settings/' + s); ok(await p.$(`.set-nav a.on[href="#/app/settings/${s}"]`), 'section ' + s) }
      await go(p, '#/app/settings/nope'); ok(await ev(p, () => UI.view) === 'notfound', 'bad section not 404');
      await go(p, '#/app/settings/appearance'); await p.click('label:has(input[name=theme][value=dark])'); await wait(p); ok(await ev(p, () => document.documentElement.dataset.theme) === 'dark', 'theme');
      await p.click('label:has(input[name=theme][value=system])'); await wait(p); ok(await ev(p, () => !document.documentElement.dataset.theme), 'system theme');
      await go(p, '#/app/settings/developer'); for (const s of ['saving', 'syncing', 'synced', 'failed']) { await p.click(`[data-a=devSync][data-v=${s}]`); ok(await p.$('#sync.s-' + s), 'sync state ' + s) }
      await p.click('#sync'); await wait(p); ok(await p.$('#sync.s-saved'), 'retry from failed state');
    });
    await step('Demo data is labelled and removable', async () => {
      await ev(p, () => seed()); await wait(p, 500); ok(await p.isVisible('#demochip'), 'demo chip hidden'); await go(p, '#/app/projects'); ok(await p.$('.pill.demo'), 'project demo pill missing');
      await ev(p, () => unseed()); await wait(p); ok(await p.isHidden('#demochip'), 'chip still visible after cleanup');
    });
    await step('Dashboard answers now / next; Today shows delay risk', async () => {
      await load(p, { tasks: [{ id: 'r1', title: 'Riskli iş', estimate: 4, due: L(new Date(Date.now() + 864e5), 12) }], events: [{ id: 'n', title: 'Sonraki toplantı', type: 'meeting', start: L(new Date(Date.now() + 36e5), new Date(Date.now() + 36e5).getHours()), end: L(new Date(Date.now() + 36e5), Math.min(23, new Date(Date.now() + 36e5).getHours() + 1)) }] });
      await go(p, '#/app'); const k = await p.textContent('.kpi-now'); ok(/Şu an/.test(k) && /Sırada/.test(k), 'now/next missing');
      await go(p, '#/app/today'); ok(await p.isVisible('.callout.risk'), 'delay risk missing');
    });
    await ctx.close();
  }

  await step('DST (America/New_York): events on the 25-hour day stay on that day; capacity and agenda agree', async () => {
    const { ctx, p } = await ctxPage(browser, { timezoneId: 'America/New_York' });
    await load(p, { events: [{ id: 'late', title: 'Late call', type: 'meeting', start: '2026-11-01T22:00', end: '2026-11-01T23:30' }, { id: 'early', title: 'Early', type: 'meeting', start: '2026-11-02T00:30', end: '2026-11-02T01:30' }] });
    const r = await ev(p, () => ({ l1: dayLoad(parseDay('2026-11-01')), l2: dayLoad(parseDay('2026-11-02')), a1: agendaFor(parseDay('2026-11-01')).map(i => i.x.id), a2: agendaFor(parseDay('2026-11-02')).map(i => i.x.id) }));
    ok(r.l1 === 1.5 && r.l2 === 1 && r.a1.join() === 'late' && r.a2.join() === 'early', 'DST day boundary wrong ' + JSON.stringify(r));
    await go(p, '#/app/calendar/day?d=2026-11-01'); ok(/Late call/.test(await p.textContent('#main')), 'not on day view');
    await ctx.close();
  });

  await step('Mobile 360px: task detail primary actions within thumb reach; FAB hidden there; no overflow', async () => {
    const { ctx, p } = await ctxPage(browser, { viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true });
    await ev(p, () => seed()); await wait(p, 500);
    const id = await ev(p, () => S.tasks.find(x => x.status !== 'done' && x.estimate).id); await go(p, '#/app/tasks/' + id);
    const bar = await (await p.$('.m-actions')).boundingBox(); ok(bar && bar.y > 740 - 160, 'actions not at the bottom');
    ok(await p.isHidden('#fab'), 'FAB overlaps actions'); ok(await ev(p, () => document.documentElement.scrollWidth <= innerWidth + 1), 'overflow');
    await p.click('.m-actions [data-a=toggle]'); await wait(p, 600); ok(await ev(p, id => taskOf(id).status === 'done', id), 'complete from bar failed');
    await ctx.close();
  });

  await browser.close();
  const fails = results.filter(r => r[0] === 'FAIL');
  for (const r of results) console.log(r[0] === 'PASS' ? '✓' : '✗', r[1], r[2] ? '\n    → ' + r[2] : '');
  console.log(`\n${results.length - fails.length}/${results.length} passed`);
  process.exit(fails.length ? 1 : 0);
})();
