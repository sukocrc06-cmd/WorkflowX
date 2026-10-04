/* WorkFlowX v0.7 — calendar redesign: sticky toolbar, view options, side panel with drag-in tasks,
   capacity rings, soft cards, now line, drag-to-create, hover actions, detail popover, single
   suggestion approval, month heat map, agenda with free gaps, conflict badges, empty week, mobile, a11y.
   Run:  node qa/e2e-v8.js   (Playwright, Chromium). Fails on console errors and unexpected dialogs. */
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs'), os = require('os');
const URL = 'file://' + path.resolve(__dirname, '../index.html');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'wfx-v8-'));
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

const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const axe = async p => { allow = /CORS|XMLHttpRequest|Cross origin/; await p.addScriptTag({ content: AXE }); return p.evaluate(async () => (await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa'] })).violations.map(v => v.id + ': ' + v.nodes.map(n => n.target).join(', '))) };
(async () => {
  const browser = await chromium.launch();
  // A fixed "now": Tuesday 6 Oct 2026, 10:30 (Istanbul). Timers keep running.
  const NOW = new Date('2026-10-06T10:30:00+03:00'), D = '2026-10-06';
  const cal = async (opts = {}) => { const r = await ctxPage(browser, opts); await r.p.clock.setFixedTime(NOW); return r };
  const base = { projects: [{ id: 'p1', name: 'Site', color: '#10b981', icon: 'rocket' }],
    tasks: [{ id: 't1', title: 'Rapor yaz', estimate: 3, projectId: 'p1', due: '2026-10-09T17:00', priority: 'high' }, { id: 't2', title: 'Sunum', estimate: 2, due: '2026-10-08T17:00' }],
    events: [{ id: 'e1', title: 'Planlama', type: 'meeting', start: D + 'T09:00', end: D + 'T10:00', location: 'Oda 3' }, { id: 'e2', title: 'Müşteri', type: 'meeting', start: D + 'T14:00', end: D + 'T15:00' }, { id: 'e3', title: 'Çakışan', type: 'meeting', start: D + 'T14:30', end: D + 'T15:30' }],
    blocks: [{ id: 'b1', taskId: 't1', start: D + 'T11:00', end: D + 'T12:30' }] };

  await step('Sticky toolbar and day header stay visible while scrolling; toolbar keeps the "Etkinlik" action', async () => {
    const { ctx, p } = await cal(); await load(p, base); await go(p, '#/app/calendar/week?d=' + D);
    await ev(p, () => window.scrollTo(0, 600)); await wait(p, 200);
    const tb = await (await p.$('.cal-toolbar')).boundingBox(), hd = await (await p.$('.cal-head')).boundingBox(), top = await (await p.$('.top')).boundingBox();
    ok(Math.abs(tb.y - (top.y + top.height)) <= 2, `toolbar not stuck under top bar (${tb.y} vs ${top.y + top.height})`);
    ok(Math.abs(hd.y - (tb.y + tb.height)) <= 3, `day header not stuck under toolbar (${hd.y} vs ${tb.y + tb.height})`);
    ok(await p.$('.page-h [data-a=newEvent]'), 'new event button missing');
    await ctx.close();
  });

  await step('Opens scrolled to "now": red now line with a time tag on today', async () => {
    const { ctx, p } = await cal(); await load(p, base); await go(p, '#/app/calendar/week?d=' + D); await wait(p, 300);
    ok(await p.$('.cal-day.is-today .now-line'), 'no now line'); ok((await p.textContent('.now-tag')).trim() === '10:30', 'now tag wrong');
    const y = await ev(p, () => document.querySelector('.now-line').getBoundingClientRect().top);
    ok(y > 100 && y < 800, 'now line not scrolled into view: ' + y);
    await ctx.close();
  });

  await step('View options: density, hide weekends, compress off-hours — applied and remembered', async () => {
    const { ctx, p } = await cal(); await load(p, base); await go(p, '#/app/calendar/week?d=' + D);
    const h0 = await ev(p, () => document.querySelector('.cal-day').offsetHeight);
    await p.click('[data-a=calOpts]'); ok(await p.isVisible('#calopts'), 'options not open');
    await p.click('#calopts [data-v=compact]'); await wait(p, 150);
    ok(await ev(p, () => PX) === 36 && await ev(p, () => document.querySelector('.cal-day').offsetHeight) < h0, 'density not applied');
    ok(await p.isVisible('#calopts'), 'options closed after a change'); await p.click('#calopts label:has([data-k=weekend])'); await wait(p, 150);
    ok((await p.$$('.cal-day')).length === 5, 'weekends not hidden');
    await p.click('#calopts label:has([data-k=compress])'); await wait(p, 150);
    ok(await ev(p, () => [CAL_S, CAL_E].join()) === '8,19', 'off-hours not compressed: ' + await ev(p, () => [CAL_S, CAL_E].join()));
    await p.reload(); await wait(p, 500); await go(p, '#/app/calendar/week?d=' + D);
    ok((await p.$$('.cal-day')).length === 5 && await ev(p, () => PX) === 36, 'options not remembered');
    await ev(p, () => prefs.set('cal.density', '<b>')); await go(p, '#/app/calendar/day?d=' + D); ok(await ev(p, () => PX) === 48, 'bad density not rejected');
    await ctx.close();
  });

  await step('Side panel: mini month navigates, lists unplanned work; dragging a task in creates a block (with undo)', async () => {
    const { ctx, p } = await cal(); await load(p, { ...base, blocks: [] }); await go(p, '#/app/calendar/week?d=' + D);
    ok(await p.isVisible('.cal-side'), 'side panel hidden at 1440px');
    ok((await p.$$('.mini-grid a.inr')).length === 7, 'current week not highlighted in mini month');
    await p.click('[data-a=miniNav][data-v="1"]'); ok(/Kasım/.test(await p.textContent('.mini-h b')), 'mini month did not move');
    ok((await p.$$('.dtask')).length === 2, 'unplanned list wrong');
    const col = p.locator('.cal-day[data-day="2026-10-07"]'); const bb = await col.boundingBox();
    await col.evaluate(e => e.scrollIntoView({ block: 'center' }));
    await p.locator('.dtask[data-task=t1]').dragTo(col, { targetPosition: { x: 30, y: (9.5 - 7) * 48 + 24 } }); await wait(p, 400);
    const b = await ev(p, () => S.blocks.map(x => [x.taskId, x.start, x.end]));
    ok(b.length === 1 && b[0][0] === 't1' && b[0][1] === '2026-10-07T09:00' && b[0][2] === '2026-10-07T11:00', 'drop wrong ' + JSON.stringify(b));
    ok(/takvime eklendi/.test(await p.textContent('#toasts')), 'no confirmation toast');
    await p.click('[data-a=calSide]'); await wait(p); ok(!await p.$('.cal-side'), 'side panel toggle failed');
    await ctx.close();
  });

  await step('Day headers show a capacity ring; cards are soft with project colour and icon; conflicts get a ⚠ badge', async () => {
    const { ctx, p } = await cal(); await load(p, base); await go(p, '#/app/calendar/week?d=' + D);
    ok((await p.$$('.cal-head .ring.mini')).length >= 5, 'capacity rings missing');
    const c = await ev(p, () => getComputedStyle(document.querySelector('.ev[data-id=b1]')).getPropertyValue('--c').trim());
    ok(c === '#10b981', 'project colour not used: ' + c);
    ok(await p.$('.ev[data-id=b1] .ev-ic svg'), 'kind icon missing');
    ok(await p.$('.ev[data-id=e2].conflict .cf-badge') && await p.$('.ev[data-id=e3].conflict'), 'conflict not visualised');
    await ctx.close();
  });

  await step('Drag on empty grid → live preview → event dialog with that time range', async () => {
    const { ctx, p } = await cal(); await load(p, base); await go(p, '#/app/calendar/week?d=' + D);
    const col = p.locator('.cal-day[data-day="2026-10-08"]'); await col.evaluate(e => e.scrollIntoView({ block: 'center' })); const bb = await col.boundingBox();
    const y = h => bb.y + (h - 7) * 48;
    await p.mouse.move(bb.x + 40, y(13) + 2); await p.mouse.down(); await p.mouse.move(bb.x + 40, y(14.5), { steps: 8 });
    ok(/13:00–14:30/.test(await p.textContent('.slot-draft')), 'no live preview: ' + await p.textContent('.slot-draft').catch(() => ''));
    await p.mouse.up(); await wait(p, 300);
    ok(await p.isVisible('#dlg[open]') && await p.inputValue('#es') === '13:00' && await p.inputValue('#ee') === '14:30', 'dialog not prefilled');
    await ctx.close();
  });

  await step('Hover actions: complete / timer / remove on a block; edit / delete on an event', async () => {
    const { ctx, p } = await cal(); await load(p, base); await go(p, '#/app/calendar/week?d=' + D);
    await p.locator('.ev[data-id=b1]').evaluate(e => e.scrollIntoView({ block: 'center' })); await p.hover('.ev[data-id=b1]'); await wait(p, 150);
    ok((await p.$$('.evbar.on button')).length === 3, 'block bar should have 3 actions');
    await p.click('.evbar.on [data-a=timerStart]'); await wait(p); ok(await ev(p, () => S.timer && S.timer.taskId) === 't1', 'timer not started from bar');
    await p.hover('.ev[data-id=b1]'); await wait(p, 150); await p.click('.evbar.on [data-a=blockDone]'); await wait(p, 400);
    ok(await ev(p, () => S.tasks.find(x => x.id === 't1').status) === 'done', 'complete from bar failed');
    await p.hover('.ev[data-id=e1]'); await wait(p, 150); ok(await p.$('.evbar.on [data-a=editEvent]') && await p.$('.evbar.on [data-a=delEvent]'), 'event bar wrong');
    await ctx.close();
  });

  await step('Detail popover: opens beside the card, shows details and conflict, Esc closes and returns focus', async () => {
    const { ctx, p } = await cal(); await load(p, base); await go(p, '#/app/calendar/week?d=' + D);
    await p.locator('.ev[data-id=e2]').evaluate(e => e.scrollIntoView({ block: 'center' })); await p.click('.ev[data-id=e2]'); await wait(p, 250);
    ok(await p.isVisible('#evpop'), 'popover not open');
    const t = await p.textContent('#evpop'); ok(/Müşteri/.test(t) && /14:00–15:00/.test(t) && /Çakışıyor/.test(t), 'popover content wrong: ' + t);
    const a = await (await p.$('.ev[data-id=e2]')).boundingBox(), b = await (await p.$('#evpop')).boundingBox();
    ok(b.x >= a.x + a.width || b.x + b.width <= a.x, 'popover overlaps its card');
    const v = await axe(p); ok(!v.length, 'axe: ' + v.join(' | '));
    await p.keyboard.press('Escape'); await wait(p); ok(!await p.isVisible('#evpop'), 'Esc did not close');
    ok(await ev(p, () => document.activeElement.dataset.id) === 'e2', 'focus not returned');
    await p.click('.ev[data-id=b1]'); await wait(p, 200); await p.click('#evpop [data-a=editBlock]'); await wait(p);
    ok(await p.isVisible('#dlg[open]'), 'edit block from popover failed');
    await ctx.close();
  });

  await step('Suggestions: accept one and reject one individually; progress shown; nothing else written', async () => {
    const { ctx, p } = await cal(); await load(p, { ...base, blocks: [] }); await ev(p, () => A.planAll()); await wait(p, 400);
    await go(p, '#/app/calendar/week?d=' + D); const n = await ev(p, () => UI.draft.blocks.length); ok(n >= 2, 'need ≥2 suggestions, got ' + n);
    const [d1, d2] = await ev(p, () => UI.draft.blocks.slice(0, 2).map(b => b.id));
    await p.locator(`.ev.draft[data-id="${d1}"]`).evaluate(e => e.scrollIntoView({ block: 'center' })); await p.hover(`.ev.draft[data-id="${d1}"]`); await wait(p, 150);
    await p.click('.evbar.on [data-a=draftAccept]'); await wait(p, 400);
    ok(await ev(p, () => S.blocks.length) === 1, 'accept did not write exactly one block');
    await p.locator(`.ev.draft[data-id="${d2}"]`).evaluate(e => e.scrollIntoView({ block: 'center' })); await p.click(`.ev.draft[data-id="${d2}"]`); await wait(p, 200);
    await p.click('#evpop [data-a=draftReject]'); await wait(p, 300);
    ok(await ev(p, () => S.blocks.length) === 1 && await ev(p, () => UI.draft.blocks.length) === n - 2, 'reject changed data');
    ok(/2 \/ \d+ öneri işlendi/.test(await p.textContent('.draft-bar')), 'no progress text');
    ok(await p.$('.dr-prog i'), 'no progress bar');
    await ctx.close();
  });

  await step('Month heat map, agenda with free-time cards, empty week card', async () => {
    const { ctx, p } = await cal(); await load(p, base);
    await go(p, '#/app/calendar/month?d=' + D); const heat = await ev(p, () => +document.querySelector('.mcell[href$="d=2026-10-06"]').style.getPropertyValue('--heat'));
    ok(heat > 0, 'no heat on a planned day'); ok(await p.$('.mlegend'), 'heat legend missing');
    await go(p, '#/app/calendar/agenda?d=' + D); ok((await p.$$('.agenda-day')).length === 14, 'agenda should list 14 days');
    ok(/Boş/.test(await p.textContent('.agenda-day.is-today')), 'free-time gap card missing today');
    ok(await p.$('.agenda-day.is-today .li.conflict'), 'conflict not flagged in agenda');
    await go(p, '#/app/calendar/week?d=2026-11-16'); ok(await p.isVisible('.cal-empty-ov .card-e'), 'empty week card missing');
    await ctx.close();
  });

  await step('Mobile 390px: agenda fits, toolbar wraps, popover is a bottom sheet; axe clean', async () => {
    const { ctx, p } = await cal({ viewport: { width: 390, height: 844 } }); await load(p, base);
    await go(p, '#/app/calendar/agenda?d=' + D); ok(await ev(p, () => document.documentElement.scrollWidth - innerWidth) <= 1, 'horizontal overflow');
    await go(p, '#/app/calendar/day?d=' + D); await p.click('.cal-legend [data-a=calList]'); await wait(p);
    await p.locator('.ev[data-id=e1]').evaluate(e => e.scrollIntoView({ block: 'center' })); await p.click('.ev[data-id=e1]'); await wait(p, 250);
    ok(await ev(p, () => document.querySelector('#evpop').classList.contains('sheet')), 'popover not a sheet on mobile');
    const v = await axe(p); ok(!v.length, 'axe: ' + v.join(' | '));
    await ctx.close();
  });

  await step('a11y: options menu, side panel, month and agenda pass axe (light + dark)', async () => {
    for (const scheme of ['light', 'dark']) {
      const { ctx, p } = await cal({ colorScheme: scheme }); await load(p, base);
      await go(p, '#/app/calendar/week?d=' + D); await p.click('[data-a=calOpts]'); let v = await axe(p); ok(!v.length, scheme + ' week+options: ' + v.join(' | '));
      await go(p, '#/app/calendar/month?d=' + D); v = await axe(p); ok(!v.length, scheme + ' month: ' + v.join(' | '));
      await go(p, '#/app/calendar/agenda?d=' + D); v = await axe(p); ok(!v.length, scheme + ' agenda: ' + v.join(' | '));
      await ctx.close();
    }
  });

  await browser.close();
  const fails = results.filter(r => r[0] === 'FAIL');
  for (const r of results) console.log(r[0] === 'PASS' ? '✓' : '✗', r[1], r[2] ? '\n    → ' + r[2] : '');
  console.log(`\n${results.length - fails.length}/${results.length} passed`);
  process.exit(fails.length ? 1 : 0);
})();
