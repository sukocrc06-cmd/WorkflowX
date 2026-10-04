/* WorkFlowX v0.5 — feature test matrix (brief §46) on a real Chromium.
   Run:  node qa/e2e-v5.js      (needs `playwright`; see qa/e2e.js)
   Every step fails on console errors, uncaught exceptions or unexpected browser dialogs. */
const { chromium } = require('playwright');
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '../index.html');
const results = []; let errs = [];
const IGNORE = /ERR_TUNNEL|fonts\.g|net::ERR_/;
async function step(name, fn) { errs = []; try { await fn(); if (errs.length) throw new Error('console: ' + errs.join(' | ')); results.push(['PASS', name]) } catch (e) { results.push(['FAIL', name, String(e.message || e).slice(0, 400)]) } }
const ok = (c, m) => { if (!c) throw new Error(m) };
function watch(p) { p.on('pageerror', e => errs.push('pageerror: ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errs.push(m.text()) }); p.on('dialog', d => { errs.push('unexpected dialog: ' + d.message()); d.dismiss() }) }
const wait = (p, ms = 300) => p.waitForTimeout(ms);
const go = async (p, h) => { await p.evaluate(h => { location.hash = h }, h); await wait(p, 350) };
const submitDlg = async p => { await p.click('#dlg .dlg-f .btn.primary'); await wait(p, 350) };
const ev = (p, fn, arg) => p.evaluate(fn, arg);

async function fresh(browser, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, timezoneId: 'Europe/Istanbul', acceptDownloads: true, ...opts });
  const p = await ctx.newPage(); watch(p);
  await p.goto(URL + '#/app'); await wait(p, 500);
  if (await p.isVisible('#dlg[open]')) { await p.click('[data-a=obSkip]'); await wait(p) }
  return { ctx, p };
}
/* Loads a crafted state through the same sanitiser the app uses for storage and imports. */
const load = (p, st) => ev(p, st => { setState(sanitizeState({ onboarded: true, ...st }).state); save(); render() }, st);
const L = (d, h, m = 0) => { const x = new Date(d); x.setHours(h, m, 0, 0); const z = n => String(n).padStart(2, '0'); return `${x.getFullYear()}-${z(x.getMonth() + 1)}-${z(x.getDate())}T${z(h)}:${z(m)}` };
const workday = n => { const d = new Date(); d.setHours(0, 0, 0, 0); let k = 0; while (k < n) { d.setDate(d.getDate() + 1); if (d.getDay() % 6) k++ } return d };

(async () => {
  const browser = await chromium.launch();

  /* ================= TASK ================= */
  {
    const { ctx, p } = await fresh(browser);
    let id;
    await step('Task: create → edit → complete → reopen → undo / redo (keyboard)', async () => {
      await p.keyboard.press('n'); await wait(p);
      await p.fill('#tt', 'Sözleşme taslağı'); await p.fill('#te', '2');
      await p.fill('#td', L(workday(3), 17)); await submitDlg(p);
      id = await ev(p, () => S.tasks.find(x => x.title === 'Sözleşme taslağı')?.id); ok(id, 'not created');
      await go(p, '#/app/tasks/' + id); await p.click('.detail-actions [data-a=editTask]'); await wait(p);
      await p.fill('#tt', 'Sözleşme taslağı v2'); await submitDlg(p);
      ok(await ev(p, id => taskOf(id).title, id) === 'Sözleşme taslağı v2', 'edit not saved');
      await p.click('.detail-actions [data-a=toggle]'); await wait(p, 500);
      ok(await ev(p, id => taskOf(id).status, id) === 'done', 'not completed');
      await p.click('.detail-actions [data-a=toggle]'); await wait(p, 400);
      ok(await ev(p, id => taskOf(id).status, id) === 'todo', 'not reopened');
      await p.click('#main h1'); await p.keyboard.press('Control+z'); await wait(p);
      ok(await ev(p, id => taskOf(id).status, id) === 'done', 'undo did not restore completion');
      await p.keyboard.press('Control+Shift+z'); await wait(p);
      ok(await ev(p, id => taskOf(id).status, id) === 'todo', 'redo failed');
      const acts = await ev(p, id => activityFor('task', id).map(a => a.type), id);
      ok(acts.includes('created') && acts.includes('updated') && acts.includes('completed'), 'activity missing: ' + acts);
      ok(await p.isVisible('#d-act'), 'activity section missing');
    });
    await step('Task: delete → undo from toast', async () => {
      await p.click('.detail-actions [data-a=delTask]'); await wait(p, 400);
      ok(!(await ev(p, id => !!taskOf(id), id)), 'not deleted');
      await p.click('#toasts .toast:last-child button'); await wait(p);
      ok(await ev(p, id => !!taskOf(id), id), 'undo did not restore');
    });
    await step('Task: schedule → apply → move block by form → undo move', async () => {
      await go(p, '#/app/tasks/' + id); await p.click('.detail-actions [data-a=planOne]'); await wait(p, 600);
      ok(await p.isVisible('.draft-list'), 'no suggestion'); await p.click('.plan-actions [data-a=applyDraft]'); await wait(p, 500);
      const b = await ev(p, id => blocksOf(id)[0], id); ok(b, 'no block after apply');
      await go(p, '#/app/tasks/' + id); await p.click(`[data-a=editBlock][data-id="${b.id}"]`); await wait(p);
      const d = workday(1), z = n => String(n).padStart(2, '0');
      await p.fill('#bd', `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`); await p.fill('#bs', '07:00'); await p.fill('#be', '07:30'); await submitDlg(p);
      const nb = await ev(p, bid => S.blocks.find(x => x.id === bid), b.id);
      ok(nb.start.endsWith('07:00'), 'block not moved: ' + nb.start);
      await p.click('#main h1'); await p.keyboard.press('Control+z'); await wait(p);
      ok(await ev(p, bid => S.blocks.find(x => x.id === bid).start, b.id) === b.start, 'move not undone');
    });
    await step('Task: subtasks, comments, estimate vs actual', async () => {
      await go(p, '#/app/tasks/' + id);
      for (const s of ['Taslak', 'Hukuk kontrolü']) { await p.fill('#subin', s); await p.press('#subin', 'Enter'); await wait(p) }
      ok(await ev(p, id => taskOf(id).subtasks.length, id) === 2, 'subtasks not added');
      await p.click('[data-a=subToggle]'); await wait(p);
      ok(await ev(p, id => taskOf(id).subtasks[0].done, id), 'subtask not toggled');
      await p.fill('#comin', 'Müşteri <b>onayı</b> bekleniyor'); await p.click('form[data-f=comment] .btn'); await wait(p);
      ok(await ev(p, id => taskOf(id).comments.length, id) === 1, 'comment not saved');
      ok(!(await p.$('.comments b:has-text("onayı")')), 'comment rendered as HTML');
      await ev(p, id => { const x = taskOf(id); const e = new Date(); x.logs.push({ start: new Date(+e - 155 * 60e3).toISOString(), end: e.toISOString() }); save(); render() }, id);
      ok(/2 sa 35 dk/.test(await p.textContent('.detail-side')), 'actual not shown as 2 sa 35 dk');
    });
    await step('Task: recurring task spawns next occurrence on completion', async () => {
      await go(p, '#/app/tasks'); await p.fill('#qaddi', 'Haftalık rapor her cuma 16:00 1sa'); await wait(p, 200);
      ok(/Her hafta/.test(await p.textContent('#qprev')), 'recurrence not previewed');
      await p.press('#qaddi', 'Enter'); await wait(p);
      const r = await ev(p, () => { const x = S.tasks.find(t => t.title === 'Haftalık rapor'); return { id: x.id, due: x.due, recur: x.recur } });
      ok(r.recur && r.recur.freq === 'weekly' && r.recur.days.includes(5), 'rule not saved');
      ok(new Date(r.due).getDay() === 5 && r.due.endsWith('16:00'), 'due not next Friday 16:00: ' + r.due);
      await ev(p, id => completeTask(taskOf(id)), r.id); await wait(p);
      const n = await ev(p, () => S.tasks.filter(t => t.title === 'Haftalık rapor').map(t => ({ s: t.status, due: t.due, r: !!t.recur })));
      ok(n.length === 2 && n.some(x => x.s === 'todo' && x.r && (new Date(x.due) - new Date(r.due)) === 7 * 864e5), 'next occurrence wrong: ' + JSON.stringify(n));
      await p.click('#main h1'); await p.keyboard.press('Control+z'); await wait(p);
      ok(await ev(p, () => S.tasks.filter(t => t.title === 'Haftalık rapor').length) === 1, 'undo left a duplicate');
    });
    await step('Task: validation — empty title, negative/invalid duration, start>due, past due, cycle', async () => {
      await p.keyboard.press('n'); await wait(p);
      await submitDlg(p); ok(/Başlık gerekli/.test(await p.textContent('#dlg .err')), 'empty title accepted');
      await p.fill('#tt', 'X'); await p.fill('#te', '-2'); await submitDlg(p); ok(/negatif|0–200|Geçersiz/.test(await p.textContent('#dlg .err')), 'negative duration accepted');
      await p.fill('#te', '1'); await p.click('#dlg details.more summary'); await p.fill('#tst', L(workday(4), 9)); await p.fill('#td', L(workday(2), 9)); await submitDlg(p);
      ok(/Başlangıç, teslim/.test(await p.textContent('#dlg .err')), 'start after due accepted');
      await p.fill('#tst', ''); const past = new Date(Date.now() - 2 * 864e5); await p.fill('#td', L(past, 10)); await submitDlg(p);
      ok(/geçmişte/.test(await p.textContent('#dlg .err')), 'past due not warned');
      await submitDlg(p); ok(await ev(p, () => S.tasks.some(t => t.title === 'X')), 'second confirm did not save');
      await ev(p, () => { const a = newTask({ title: 'A' }), b = newTask({ title: 'B', deps: [] }); a.deps = [b.id]; S.tasks.push(a, b); save(); render() });
      const bid = await ev(p, () => S.tasks.find(t => t.title === 'B').id);
      await ev(p, id => openTask(id), bid); await wait(p);
      ok(!(await p.$('#dlg input[name=dep][value="' + (await ev(p, () => S.tasks.find(t => t.title === 'A').id)) + '"]')), 'cyclic option offered');
      await p.keyboard.press('Escape'); await wait(p);
    });
    await step('Quick add: natural Turkish input is parsed and shown before saving', async () => {
      const r1 = await ev(p, () => { const r = parseQuick("Raporu yarın saat 15'e kadar bitir 2 saat"); return { t: r.title, h: r.due && r.due.getHours(), d: r.due && dayKey(r.due), est: r.est } });
      const tm = new Date(); tm.setDate(tm.getDate() + 1);
      ok(r1.t === 'Raporu bitir' && r1.h === 15 && r1.est === 2 && r1.d === `${tm.getFullYear()}-${String(tm.getMonth() + 1).padStart(2, '0')}-${String(tm.getDate()).padStart(2, '0')}`, 'parse 1: ' + JSON.stringify(r1));
      const r2 = await ev(p, () => { const r = parseQuick('Web sitesi revizyonu cuma 4 saat yüksek'); return { t: r.title, p: r.prio, est: r.est, wd: r.due && r.due.getDay() } });
      ok(r2.t === 'Web sitesi revizyonu' && r2.p === 'high' && r2.est === 4 && r2.wd === 5, 'parse 2: ' + JSON.stringify(r2));
      ok(await ev(p, () => parseQuick('Yüksek lisans başvurusu').prioSet === false), 'leading “Yüksek” taken as priority');
      await go(p, '#/app/tasks'); const n0 = await ev(p, () => S.tasks.length);
      await p.fill('#qaddi', 'Fatura @olmayanproje'); await wait(p, 150);
      ok(/proje bulunamadı/.test(await p.textContent('#qprev')), 'missing project not flagged');
      await p.press('#qaddi', 'Enter'); await wait(p);
      ok(await ev(p, () => S.tasks.length) === n0, 'saved despite unknown project');
    });
    await ctx.close();
  }

  /* ================= PROJECT ================= */
  {
    const { ctx, p } = await fresh(browser);
    let pid;
    await step('Project: create from template with deadline → chained tasks', async () => {
      await p.keyboard.press('p'); await wait(p);
      ok(await p.isVisible('#pn'), 'P did not open project form');
      await p.fill('#pn', 'Acme'); await p.selectOption('#ptp', 'tpl-client');
      const dl = workday(10), z = n => String(n).padStart(2, '0');
      await p.fill('#pdl', `${dl.getFullYear()}-${z(dl.getMonth() + 1)}-${z(dl.getDate())}`); await submitDlg(p); await wait(p, 300);
      pid = await ev(p, () => S.projects.find(x => x.name === 'Acme').id);
      const ts = await ev(p, pid => S.tasks.filter(x => x.projectId === pid).map(x => ({ t: x.title, d: x.deps.length, due: x.due })), pid);
      ok(ts.length === 6 && ts.filter(x => x.d === 1).length === 5, 'template tasks/deps wrong ' + JSON.stringify(ts));
      ok(ts.every(x => x.due && new Date(x.due) <= new Date(+dl + 864e5)), 'deadlines not spread within project');
      ok(await p.isVisible('.proj-head .pill.hl-healthy, .proj-head .pill.hl-risk, .proj-head .pill.hl-nodata'), 'health pill missing');
    });
    await step('Project: board move via status menu + undo; mobile-ready tabs', async () => {
      await go(p, '#/app/projects/' + pid + '/board');
      const tid = await ev(p, pid => S.tasks.find(x => x.projectId === pid).id, pid);
      await p.selectOption(`#s-${tid}`, 'progress'); await wait(p);
      ok(await ev(p, id => taskOf(id).status, tid) === 'progress', 'status not changed');
      await p.click('#toasts .toast:last-child button'); await wait(p);
      ok(await ev(p, id => taskOf(id).status, tid) === 'todo', 'board move not undone');
      ok(await p.$('.board-tabs'), 'board tabs missing');
    });
    await step('Project: archive → Archive tab → restore', async () => {
      await go(p, '#/app/projects/' + pid); await p.click('details.menu summary'); await p.click('details.menu [data-a=archiveProject]'); await wait(p);
      ok(await ev(p, pid => projectOf(pid).archived, pid), 'not archived');
      await go(p, '#/app/projects'); ok(!(await p.$(`a[href="#/app/projects/${pid}"]`)), 'archived project still in active list');
      await p.click('[data-a=projArchived][data-v="1"]'); await wait(p);
      ok(await p.$(`a[href="#/app/projects/${pid}"]`), 'not in archive tab');
      await go(p, '#/app/projects/' + pid); await p.click('.callout [data-a=restoreProject]'); await wait(p);
      ok(!(await ev(p, pid => projectOf(pid).archived, pid)), 'not restored');
    });
    await step('Project: delete + undo keeps task links; empty archive state', async () => {
      await go(p, '#/app/projects/' + pid); await p.click('details.menu summary'); await p.click('details.menu [data-a=delProject]'); await wait(p, 500);
      ok(!(await ev(p, pid => !!projectOf(pid), pid)), 'not deleted');
      await p.click('#toasts .toast:last-child button'); await wait(p);
      ok(await ev(p, pid => !!projectOf(pid) && S.tasks.filter(x => x.projectId === pid).length === 6, pid), 'undo lost task links');
      await go(p, '#/app/projects'); await p.click('[data-a=projArchived][data-v="1"]'); await wait(p);
      ok(/Arşivde proje yok/.test(await p.textContent('#main')), 'empty archive state missing');
    });
    await ctx.close();
  }

  /* ================= CALENDAR + CONFLICTS ================= */
  {
    const { ctx, p } = await fresh(browser);
    const day = workday(2), z = n => String(n).padStart(2, '0'), ds = `${day.getFullYear()}-${z(day.getMonth() + 1)}-${z(day.getDate())}`;
    await load(p, { events: [{ id: 'e1', title: 'Client presentation', type: 'meeting', start: L(day, 10), end: L(day, 11, 30) }] });
    const newEvent = async (title, st, en) => { await ev(p, () => openEvent()); await wait(p); await p.fill('#et', title); await p.fill('#edt', ds); await p.fill('#es', st); await p.fill('#ee', en); await p.click('#dlg .dlg-f .btn.primary'); await wait(p, 400) };
    await step('Conflict: detected with Move / Split / Cancel / Schedule anyway', async () => {
      await newEvent('Team meeting', '10:30', '11:30');
      ok(/Takvim çakışması tespit edildi/.test(await p.textContent('#dlg')), 'no conflict dialog');
      for (const v of ['move', 'split', 'keep', 'cancel']) ok(await p.$(`#dlg [data-a=cf][data-v=${v}]`), 'option missing: ' + v);
      await p.click('#dlg [data-a=cf][data-v=cancel]'); await wait(p);
      ok(!(await ev(p, () => S.events.some(e => e.title === 'Team meeting'))), 'cancel still saved');
    });
    await step('Conflict: Move places it in the first free slot', async () => {
      await newEvent('Team meeting', '10:30', '11:30'); await p.click('#dlg [data-a=cf][data-v=move]'); await wait(p);
      const e = await ev(p, () => S.events.find(e => e.title === 'Team meeting'));
      ok(e && e.start.endsWith('11:30') && e.end.endsWith('12:30'), 'moved wrong: ' + JSON.stringify(e));
    });
    await step('Conflict: Split keeps only the free part', async () => {
      await newEvent('Review', '09:00', '10:30'); await p.click('#dlg [data-a=cf][data-v=split]'); await wait(p);
      const e = await ev(p, () => S.events.find(e => e.title === 'Review'));
      ok(e && e.start.endsWith('09:00') && e.end.endsWith('10:00'), 'split wrong: ' + JSON.stringify(e));
    });
    await step('Conflict: Schedule anyway → banner with Resolve in calendar', async () => {
      await newEvent('Standup', '10:15', '10:45'); await p.click('#dlg [data-a=cf][data-v=keep]'); await wait(p);
      await go(p, '#/app/calendar/week?d=' + ds);
      ok(await p.isVisible('.conflict-bar'), 'conflict banner missing'); ok(await p.$('.ev.conflict'), 'conflicting items not highlighted');
      await p.click('.conflict-bar [data-a=resolve]'); await wait(p); ok(await p.isVisible('#dlg [data-a=cf]'), 'resolve dialog missing');
      await p.click('#dlg [data-a=cf][data-v=move]'); await wait(p);
    });
    await step('Calendar: drag an event onto another → conflict → cancel keeps position', async () => {
      await go(p, '#/app/calendar/week?d=' + ds);
      const before = await ev(p, () => S.events.find(e => e.title === 'Review').start);
      const el = await p.$(`.ev[data-id="${await ev(p, () => S.events.find(e => e.title === 'Review').id)}"]`); const bb = await el.boundingBox();
      await p.mouse.move(bb.x + bb.width / 2, bb.y + 6); await p.mouse.down(); await p.mouse.move(bb.x + bb.width / 2, bb.y + 40, { steps: 6 }); await p.mouse.move(bb.x + bb.width / 2, bb.y + 60, { steps: 6 }); await p.mouse.up(); await wait(p, 400);
      ok(await p.isVisible('#dlg [data-a=cf]'), 'no conflict dialog after drag');
      await p.click('#dlg [data-a=cf][data-v=cancel]'); await wait(p);
      ok(await ev(p, () => S.events.find(e => e.title === 'Review').start) === before, 'cancel did not keep position');
    });
    await step('Calendar: day / week / month views, current-time line, delete + undo', async () => {
      for (const m of ['day', 'week', 'month']) { await go(p, `#/app/calendar/${m}`); ok(await p.$(m === 'month' ? '.mgrid' : '.cal-day'), m + ' view missing') }
      await go(p, '#/app/calendar/day'); const h = new Date().getHours(); if (h >= 7 && h < 21) ok(await p.$('.now-line'), 'now line missing');
      const id = await ev(p, () => S.events.find(e => e.title === 'Client presentation').id);
      await ev(p, id => openEvent(id), id); await wait(p); await p.click('#dlg [data-a=delEvent]'); await wait(p, 400);
      ok(!(await ev(p, id => S.events.some(e => e.id === id), id)), 'not deleted'); await p.click('#toasts .toast:last-child button'); await wait(p);
      ok(await ev(p, id => S.events.some(e => e.id === id), id), 'delete not undone');
    });
    await step('Calendar: personal time blocks slots but not work capacity', async () => {
      const c = await ev(p, ds => { S.events.push({ id: 'pp', title: 'Doktor', type: 'personal', start: ds + 'T13:00', end: ds + 'T15:00', desc: '', location: '', participants: '', source: 'manual', uid: '', demo: false, projectId: null }); save(); const c = dayCapacity(parseDay(ds)); return { planned: c.planned, busy: busyItems().some(b => b.label === 'Doktor') } }, ds);
      ok(c.busy, 'personal not busy for planner'); ok(c.planned < 6, 'personal counted as work: ' + c.planned);
    });
    await ctx.close();
  }

  /* ================= PLANNING SCENARIOS (§14) ================= */
  {
    const { ctx, p } = await fresh(browser);
    const base = { settings: { workStart: 9, workEnd: 18, maxDaily: 6, workDays: [1, 2, 3, 4, 5] } };
    const plan = (st, ids, opts) => ev(p, ([st, ids, opts]) => { setState(sanitizeState({ onboarded: true, ...st }).state); const r = planMany(ids.map(taskOf), opts || {}); return { blocks: r.blocks.map(b => ({ t: b.taskId, s: b.start, e: b.end, why: whyList(b.why) })), un: r.unplaced.map(u => ({ t: u.taskId, h: u.h, r: u.reason, w: u.weekendHelps, txt: reasonText(u.reason) })) } }, [st, ids, opts]);
    const T = (id, est, due, extra = {}) => ({ id, title: id, estimate: est, due, status: 'todo', priority: 'medium', ...extra });
    await step('Scenario 1 — enough time: everything placed inside working hours before the deadline', async () => {
      const r = await plan({ ...base, tasks: [T('a', 4, L(workday(3), 17))] }, ['a']);
      ok(!r.un.length && r.blocks.reduce((s, b) => s + (new Date(b.e) - new Date(b.s)) / 36e5, 0) === 4, JSON.stringify(r));
      ok(r.blocks.every(b => new Date(b.s).getHours() >= 9 && new Date(b.e) <= new Date(L(workday(3), 17))), 'outside hours/deadline');
    });
    await step('Scenario 2 — not enough time: shortfall reported with reason and options', async () => {
      const r = await plan({ ...base, tasks: [T('a', 30, L(workday(2), 17))] }, ['a']);
      ok(r.un.length && r.un[0].r === 'cap' && /kapasite/.test(r.un[0].txt), JSON.stringify(r.un));
    });
    await step('Scenario 3 — deadline passed: nothing planned, clear reason', async () => {
      const r = await plan({ ...base, tasks: [T('a', 2, L(new Date(Date.now() - 864e5), 10))] }, ['a']);
      ok(!r.blocks.length && r.un[0].r === 'due' && /geçmiş/.test(r.un[0].txt), JSON.stringify(r));
    });
    await step('Scenario 4 — calendar full: every working day before the deadline is full', async () => {
      const evs = [1, 2].map(n => ({ id: 'f' + n, title: 'Workshop', type: 'meeting', start: L(workday(n), 9), end: L(workday(n), 18) }));
      const d0 = new Date(); if (d0.getDay() % 6) evs.push({ id: 'f0', title: 'Workshop', type: 'meeting', start: L(d0, 0), end: L(d0, 23, 30) });
      const r = await plan({ ...base, events: evs, tasks: [T('a', 3, L(workday(2), 17))] }, ['a']);
      ok(!r.blocks.length && r.un[0].r === 'full' && /dolu/.test(r.un[0].txt), JSON.stringify(r.un));
    });
    await step('Scenario 5 — dependency: waiting task is planned after its dependency (auto-included)', async () => {
      await load(p, { ...base, tasks: [T('dep', 3, L(workday(3), 17)), T('main', 2, L(workday(4), 17), { deps: ['dep'] })] });
      const r = await ev(p, async () => { const pl = await PlanningService.suggest([taskOf('main')], null); return { added: pl.addedDeps, blocks: pl.blocks.map(b => ({ t: b.taskId, s: b.start, e: b.end, why: whyList(b.why) })) } });
      ok(r.added.includes('dep'), 'dependency not added');
      const lastDep = Math.max(...r.blocks.filter(b => b.t === 'dep').map(b => +new Date(b.e))), firstMain = Math.min(...r.blocks.filter(b => b.t === 'main').map(b => +new Date(b.s)));
      ok(firstMain >= lastDep, 'dependant planned before dependency');
      ok(r.blocks.find(b => b.t === 'main').why.some(w => /bağlı/.test(w)), 'no dependency explanation');
    });
    await step('Scenario 6 — deadline outside working hours: explained, not forced', async () => {
      const d = workday(2);
      const r = await plan({ ...base, tasks: [T('a', 2, L(d, 8), { start: L(d, 0) })] }, ['a']);
      ok(!r.blocks.length && r.un[0].r === 'outside' && /çalışma saatlerinin dışında/.test(r.un[0].txt), JSON.stringify(r.un));
    });
    await step('Scenario 7 — weekend overflow: offered, and only used when allowed', async () => {
      const due = new Date(); due.setDate(due.getDate() + 9);
      const st = { ...base, settings: { ...base.settings, maxDaily: 1 }, tasks: [T('a', 12, L(due, 17))] };
      const r1 = await plan(st, ['a']); ok(r1.un.length && r1.un[0].w === true, 'weekend not offered ' + JSON.stringify(r1.un));
      ok(r1.blocks.every(b => new Date(b.s).getDay() % 6 !== 0), 'weekend used without permission');
      const r2 = await plan(st, ['a'], { weekend: true });
      ok(r2.blocks.some(b => new Date(b.s).getDay() % 6 === 0), 'weekend not used when allowed');
      ok(r2.blocks.filter(b => new Date(b.s).getDay() % 6 === 0).every(b => b.why.some(w => /Hafta sonu/.test(w))), 'weekend blocks not explained');
    });
    await step('Scenario 8 — competing projects: ordered by deadline, split shown per project; skipped full days explained', async () => {
      const full = { id: 'full', title: 'All-hands', type: 'meeting', start: L(workday(1), 9), end: L(workday(1), 15) };
      await load(p, { ...base, events: [full], projects: [{ id: 'p1', name: 'Alpha', color: '#6366f1' }, { id: 'p2', name: 'Beta', color: '#10b981' }], tasks: [T('late', 4, L(workday(4), 17), { projectId: 'p2' }), T('soon', 4, L(workday(2), 17), { projectId: 'p1' })] });
      const r = await ev(p, async () => { const pl = await PlanningService.suggest([taskOf('late'), taskOf('soon')], null); UI.draft = pl; return { split: planByProject(pl).map(x => x.p && x.p.name), order: pl.blocks.map(b => b.taskId), why: pl.blocks.map(b => whyList(b.why)).flat() } });
      ok(r.split.length === 2, 'project split missing'); ok(r.order[0] === 'soon', 'earliest deadline not first');
      ok(r.why.some(w => /atlandı/.test(w)), 'skipped full day not explained: ' + r.why.join(' | '));
      await go(p, '#/app/planning'); ok(await p.isVisible('.pp'), 'project split not rendered');
    });
    await step('Planning: propose → review → reject leaves calendar untouched; apply writes blocks', async () => {
      await ev(p, () => { UI.draft = null; render() }); await go(p, '#/app/planning');
      await p.click('.page-h [data-a=planAll]'); await wait(p, 600);
      await p.click('.plan-actions [data-a=cancelDraft]'); await wait(p);
      ok(await ev(p, () => S.blocks.length) === 0, 'reject wrote blocks');
      await p.click('.page-h [data-a=planAll]'); await wait(p, 600); await p.click('.plan-actions [data-a=applyDraft]'); await wait(p, 500);
      ok(await ev(p, () => S.blocks.length) > 0, 'apply wrote nothing');
    });
    await ctx.close();
  }

  /* ================= SETTINGS / NOTIFICATIONS / SEARCH / SHORTCUTS / TEAM ================= */
  {
    const { ctx, p } = await fresh(browser);
    await step('Settings: working hours drive the planner; theme; language; timezone shown', async () => {
      await go(p, '#/app/settings/work'); await p.selectOption('#ws', '13'); await p.selectOption('#we', '17'); await p.fill('#md', '4'); await p.click('form[data-f=settings] .btn.primary'); await wait(p);
      await load(p, { settings: await ev(p, () => S.settings), tasks: [{ id: 'a', title: 'a', estimate: 3, due: L(workday(3), 17) }] });
      const bl = await ev(p, () => planMany([taskOf('a')]).blocks);
      ok(bl.length && bl.every(b => +b.start.slice(11, 13) >= 13 && +b.end.slice(11, 13) <= 17), 'planner ignored working hours: ' + JSON.stringify(bl));
      await go(p, '#/app/settings/work'); ok(/Saat dilimi: Europe\/Istanbul/.test(await p.textContent('#main')), 'timezone not shown');
      await p.click('.side-foot [data-a=theme]'); ok(await ev(p, () => document.documentElement.dataset.theme) === 'dark', 'theme');
      await p.click('.side-foot [data-a=lang][data-v=en]'); await wait(p); ok(/Settings/.test(await p.textContent('#main h1')), 'language'); await p.click('.side-foot [data-a=lang][data-v=tr]'); await wait(p);
      await go(p, '#/app/settings/shortcuts'); ok(await p.$('#main .keys'), 'shortcuts not listed in settings');
    });
    await step('Notifications: categories, unread count, mark all read persists', async () => {
      await load(p, { tasks: [{ id: 'l', title: 'Geç kalan', estimate: 1, due: L(new Date(Date.now() - 864e5), 10) }] });
      ok(await p.isVisible('#belldot'), 'unread badge hidden');
      await p.click('#bellbtn'); await wait(p); ok(/Teslim tarihi/.test(await p.textContent('#notif')), 'category label missing');
      await p.click('#notif [data-a=notifAll]'); await wait(p);
      ok(await p.isHidden('#belldot'), 'badge still visible'); await p.reload(); await wait(p, 600);
      ok(await p.isHidden('#belldot'), 'read state not persisted');
    });
    await step('Team: add member, assign, workload, role change, remove + undo', async () => {
      await go(p, '#/app/team'); await p.click('.page-h [data-a=newMember]'); await wait(p);
      await p.fill('#mn', 'Ayşe <img src=x onerror=alert(1)>'); await p.selectOption('#mr', 'manager'); await p.fill('#mc', '20'); await submitDlg(p);
      const mid = await ev(p, () => S.members[0].id);
      ok(await p.$('.tt-row b:has-text("Ayşe <img")'), 'member name not rendered as text');
      await ev(p, mid => { taskOf('l').assignee = mid; save(); render() }, mid);
      ok(await ev(p, mid => memberLoad(mid).tasks.length, mid) === 1, 'workload not counted');
      await go(p, '#/app/team'); await p.selectOption(`#rl-${mid}`, 'viewer'); await wait(p);
      ok(await ev(p, () => S.members[0].role) === 'viewer', 'role not changed');
      await p.click(`[data-a=delMember][data-id="${mid}"]`); await wait(p); await p.click('#dlg .btn.danger-solid'); await wait(p, 400);
      ok(await ev(p, () => !S.members.length && taskOf('l').assignee === null), 'member removal did not unassign');
      await p.click('#toasts .toast:last-child button'); await wait(p);
      ok(await ev(p, mid => S.members.length === 1 && taskOf('l').assignee === mid, mid), 'undo failed');
    });
    await step('Search: grouped results incl. people; no-result offers “create task”', async () => {
      await p.keyboard.press('/'); await wait(p); await p.fill('#cmdq', 'ayşe'); await wait(p);
      ok(/Kişiler/.test(await p.textContent('#cmdl')), 'people group missing');
      await p.fill('#cmdq', 'zzqx yeni iş'); await wait(p); ok(/adlı görev oluştur/.test(await p.textContent('#cmdl')), 'no create action');
      await p.keyboard.press('Enter'); await wait(p, 400); ok(await ev(p, () => S.tasks.some(x => x.title === 'zzqx yeni iş')), 'create from search failed');
    });
    await step('Shortcuts: T, C, P, E, ?, [ ], Ctrl+K, Esc', async () => {
      await p.click('#main h1'); await p.keyboard.press('t'); await wait(p); ok(await ev(p, () => UI.view) === 'today', 'T');
      await p.keyboard.press('c'); await wait(p); ok(await ev(p, () => UI.view) === 'calendar', 'C');
      await p.keyboard.press(']'); await wait(p); await p.keyboard.press('['); await wait(p);
      await p.keyboard.press('p'); await wait(p); ok(await p.isVisible('#pn'), 'P'); await p.keyboard.press('Escape'); await wait(p);
      await p.keyboard.press('e'); await wait(p); ok(await p.isVisible('#et'), 'E'); await p.keyboard.press('Escape'); await wait(p);
      await p.keyboard.press('Control+k'); await wait(p); ok(await ev(p, () => cmdk.open), 'Ctrl+K'); await p.keyboard.press('Escape'); await wait(p);
      await p.keyboard.press('?'); await wait(p); ok(/Klavye/.test(await p.textContent('#dlg')), '?'); await p.keyboard.press('Escape');
    });
    await step('Save status: saved locally, offline state visible', async () => {
      ok(/Bu cihaza kaydedildi/.test(await p.textContent('#sync')), 'saved state');
      await ctx.setOffline(true); await wait(p, 300); ok(/Çevrimdışı/.test(await p.textContent('#sync')), 'offline state'); await ctx.setOffline(false);
    });
    await step('Export → import round-trip keeps new fields (subtasks, recurrence, members, activity)', async () => {
      const blob = await ev(p, () => { const x = taskOf('l'); x.subtasks = [{ id: 's1', title: 'Alt', done: true }]; x.recur = { freq: 'monthly', interval: 1, monthDay: 1 }; save(); return JSON.stringify(S) });
      const back = await ev(p, b => { const r = sanitizeState(JSON.parse(b)).state; const x = r.tasks.find(t => t.id === 'l'); return { s: x.subtasks.length, r: x.recur && x.recur.freq, m: r.members.length, a: r.activity.length > 0 } }, blob);
      ok(back.s === 1 && back.r === 'monthly' && back.m === 1 && back.a, 'lost fields: ' + JSON.stringify(back));
    });
    await ctx.close();
  }

  /* ================= MOBILE ================= */
  {
    const { ctx, p } = await fresh(browser, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await p.click('#mobnav [data-a=more]').catch(() => {});
    await ev(p, () => seed()); await wait(p, 500);
    await step('Mobile: bottom nav, FAB quick add, no horizontal overflow', async () => {
      for (const h of ['#/app/tasks', '#/app/calendar', '#/app/projects', '#/app/today']) { await p.click(`#mobnav a[href="${h}"]`); await wait(p); ok(await ev(p, () => document.documentElement.scrollWidth <= innerWidth + 1), 'overflow on ' + h) }
      await p.click('#fab'); await wait(p); ok(await p.isVisible('#tt'), 'FAB did not open quick add'); await p.keyboard.press('Escape'); await wait(p);
    });
    await step('Mobile: task detail follows the reading order', async () => {
      const id = await ev(p, () => S.tasks[1].id); await go(p, '#/app/tasks/' + id);
      const tops = await ev(p, () => ['#d-desc', '#d-info', '#d-bl', '#d-sub', '#d-dep', '#d-com', '#d-act'].map(s => document.querySelector(s).getBoundingClientRect().top));
      ok(tops.every((v, i) => !i || v > tops[i - 1]), 'order wrong: ' + tops.join(','));
    });
    await step('Mobile: calendar is a day strip + agenda; board shows one column with tabs', async () => {
      await go(p, '#/app/calendar'); ok(await p.isVisible('.day-strip'), 'day strip missing'); ok(!(await p.isVisible('.cal-day')), 'desktop grid shown');
      await p.click('.cal-legend [data-a=calList]'); await wait(p); ok(await p.isVisible('.cal-day'), 'grid toggle failed'); await p.click('.cal-legend [data-a=calList]'); await wait(p);
      const pid = await ev(p, () => S.projects[0].id); await go(p, `#/app/projects/${pid}/board`);
      ok(await p.isVisible('.board-tabs'), 'board tabs hidden');
      ok(await ev(p, () => [...document.querySelectorAll('.board .col')].filter(c => getComputedStyle(c).display !== 'none').length) === 1, 'more than one column visible');
      await p.click('.board-tabs [data-v=done]'); await wait(p); ok(await p.isVisible('.board .col[data-status=done]'), 'tab switch failed');
    });
    await ctx.close();
  }

  await browser.close();
  const fails = results.filter(r => r[0] === 'FAIL');
  for (const r of results) console.log(r[0] === 'PASS' ? '✓' : '✗', r[1], r[2] ? '\n    → ' + r[2] : '');
  console.log(`\n${results.length - fails.length}/${results.length} passed`);
  process.exit(fails.length ? 1 : 0);
})();
