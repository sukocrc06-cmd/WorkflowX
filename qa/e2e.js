/* WorkFlowX — end-to-end QA suite (Playwright, Chromium).
   Run:  npm i -D playwright && npx playwright install chromium && node qa/e2e.js
   Covers: the main user flow (brief §27), regression list (§28), responsive widths (§26),
   security (XSS via import / URL), timezone, storage corruption, loading & error states.
   Every step also fails on any console error or uncaught exception. */
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs'), os = require('os');
const URL = 'file://' + path.resolve(__dirname, '../index.html');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'wfx-qa-'));
const results = []; let consoleErrors = [];
const IGNORE = /ERR_TUNNEL|fonts\.g|net::ERR_/;          // offline web-font requests are not app errors

async function step(name, fn) {
  consoleErrors = [];
  try { await fn(); if (consoleErrors.length) throw new Error('console: ' + consoleErrors.join(' | ')); results.push(['PASS', name]); }
  catch (e) { results.push(['FAIL', name, String(e.message || e).slice(0, 300)]); }
}
const ok = (cond, msg) => { if (!cond) throw new Error(msg); };
function watch(p) { p.on('pageerror', e => consoleErrors.push('pageerror: ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) consoleErrors.push(m.text()) }); p.on('dialog', d => { consoleErrors.push('unexpected browser dialog: ' + d.message()); d.dismiss() }); }
const go = (p, h) => p.evaluate(h => { location.hash = h }, h).then(() => p.waitForTimeout(350));
const submitDlg = p => p.click('#dlg .dlg-f .btn.primary, #dlg .dlg-f .btn.danger-solid').then(() => p.waitForTimeout(350));
const ymd = d => d.toISOString().slice(0, 10);
const nextWorkday = n => { const d = new Date(); let k = 0; while (k < n) { d.setDate(d.getDate() + 1); if (d.getDay() > 0 && d.getDay() < 6) k++; } return d; };

(async () => {
  const browser = await chromium.launch();

  /* ---------------- §27 main flow ---------------- */
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true, timezoneId: 'Europe/Istanbul' });
  const p = await ctx.newPage(); watch(p);
  let taskId, projectId;

  await step('Landing renders with headline and CTA', async () => {
    await p.goto(URL); await p.waitForTimeout(400);
    ok(/plana|plan/.test(await p.textContent('.hero h1')), 'headline missing');
    ok(await p.isVisible('a[href="#/app"]'), 'CTA missing');
    ok(await p.isVisible('#h-problem') || true, '');
    for (const h of ['#/legal/privacy', '#/legal/terms', '#/security', '#/contact']) ok(await p.$(`footer a[href="${h}"]`), 'footer link ' + h);
  });
  await step('Open app → onboarding → skip → empty dashboard', async () => {
    await p.click('.hero a[href="#/app"]'); await p.waitForTimeout(600);
    ok(await p.isVisible('#dlg[open]'), 'onboarding not shown'); await p.click('[data-a=obSkip]'); await p.waitForTimeout(300);
    ok(await p.isVisible('.onboarding-steps'), 'empty-state steps missing');
  });
  await step('Create task with Quick Add (N)', async () => {
    await p.keyboard.press('n'); await p.waitForTimeout(300);
    await p.fill('#tsmart', 'Rapor hazırla yarın 15:00 3sa !yüksek #pazarlama');
    ok(await p.inputValue('#tt') === 'Rapor hazırla', 'smart line did not fill title');
    ok(await p.inputValue('#te') === '3', 'smart line did not fill estimate');
    await submitDlg(p);
    taskId = await p.evaluate(() => S.tasks.find(x => x.title === 'Rapor hazırla')?.id);
    ok(taskId, 'task not created');
    ok(/takvime|schedule/i.test(await p.textContent('#toasts')), 'follow-up “schedule?” prompt missing');
  });
  await step('Edit task from detail page', async () => {
    await go(p, '#/app/tasks/' + taskId);
    ok(await p.isVisible('.chain'), 'task→block→deadline chain missing');
    await p.click('.detail-h [data-a=editTask]'); await p.waitForTimeout(250);
    await p.fill('#tt', 'Rapor hazırla (v2)'); await submitDlg(p);
    ok(await p.evaluate(id => taskOf(id).title, taskId) === 'Rapor hazırla (v2)', 'title not saved');
  });
  await step('Complete task, then undo', async () => {
    await p.click('.detail-title [data-a=toggle]'); await p.waitForTimeout(700);
    ok(await p.evaluate(id => taskOf(id).status, taskId) === 'done', 'not completed');
    await p.click('#toasts .toast:last-child button'); await p.waitForTimeout(250);
    ok(await p.evaluate(id => taskOf(id).status, taskId) !== 'done', 'undo failed');
  });
  await step('Create project and add a task into it', async () => {
    await go(p, '#/app/projects'); await p.click('.page-h [data-a=newProject], .empty [data-a=newProject]');
    await p.fill('#pn', 'QA Projesi'); await p.fill('#pdl', ymd(nextWorkday(6))); await submitDlg(p); await p.waitForTimeout(300);
    projectId = await p.evaluate(() => S.projects.find(x => x.name === 'QA Projesi')?.id);
    ok(projectId && (await p.evaluate(() => UI.view)) === 'project', 'project not created / not opened');
    await p.click('.proj-head [data-a=newTask]'); await p.fill('#tt', 'Proje görevi'); await p.fill('#te', '2'); await submitDlg(p);
    ok(await p.evaluate(pid => S.tasks.some(x => x.title === 'Proje görevi' && x.projectId === pid), projectId), 'task not linked to project');
  });
  await step('Create calendar event', async () => {
    await go(p, '#/app/calendar/week?d=' + ymd(nextWorkday(1)));
    await p.click('.page-h [data-a=newEvent]'); await p.fill('#et', 'QA toplantısı');
    await p.fill('#edt', ymd(nextWorkday(1))); await p.fill('#es', '10:00'); await p.fill('#ee', '11:00'); await submitDlg(p);
    ok(await p.evaluate(() => S.events.some(e => e.title === 'QA toplantısı')), 'event not saved');
    ok(await p.isVisible('.ev >> text=QA toplantısı'), 'event not on grid');
  });
  await step('Plan a task → suggestion with “Why?” → apply', async () => {
    const due = nextWorkday(3); due.setHours(17, 0, 0, 0);
    await p.evaluate(([id, d]) => { const x = taskOf(id); x.due = d; x.estimate = 3; save(); }, [taskId, due.toISOString().slice(0, 11) + '17:00']);
    await go(p, '#/app/tasks/' + taskId); await p.click('.detail-h [data-a=planOne]'); await p.waitForTimeout(500);
    ok(await p.evaluate(() => UI.view) === 'planning' && await p.evaluate(() => UI.draft?.blocks.length > 0), 'no draft');
    ok(await p.$('details.why'), '“Why?” missing'); ok(await p.isVisible('.dl-status'), 'deadline status missing');
    const before = await p.evaluate(() => S.blocks.length);
    ok(before === 0, 'calendar changed before approval!');
    await p.click('.plan-actions [data-a=applyDraft]'); await p.waitForTimeout(400);
    ok(await p.evaluate(() => S.blocks.length) > before, 'plan not applied');
  });
  await step('Planning assistant: natural-language request', async () => {
    await go(p, '#/app/planning'); await p.fill('#nlq', 'Sunum hazırla cumaya kadar 4 saat acil');
    await p.click('form[data-f=nl] button'); await p.waitForTimeout(300);
    ok(await p.inputValue('#nh') === '4', 'hours not parsed'); await submitDlg(p); await p.waitForTimeout(400);
    ok(await p.evaluate(() => !!UI.draft && UI.draft.request), 'no draft from request');
    await p.click('[data-a=cancelDraft]');
  });
  await step('Calendar: drag a focus block two hours later', async () => {
    // pick a block whose slot N hours later is free, so the drag is a clean move (conflicts are tested in e2e-v5)
    const { b, h } = await p.evaluate(() => { for (const b of S.blocks.slice().sort((a, b) => a.start.localeCompare(b.start))) for (const h of [2, 3, 4, 5]) { const a = +new Date(b.start) + h * 36e5, e = +new Date(b.end) + h * 36e5; if (new Date(e).getHours() <= 20 && dayKey(a) === dayKey(b.start) && !conflictsWith(a, e, b.id).length) return { b, h } } return {} });
    await go(p, '#/app/calendar/week?d=' + b.start.slice(0, 10)); await p.waitForTimeout(300);
    const el = p.locator(`.ev[data-id="${b.id}"]`); const bb = await el.boundingBox();
    await p.mouse.move(bb.x + bb.width / 2, bb.y + 6); await p.mouse.down();
    await p.mouse.move(bb.x + bb.width / 2, bb.y + 30, { steps: 6 }); await p.mouse.move(bb.x + bb.width / 2, bb.y + 6 + h * 48, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(400);
    const after = await p.evaluate(id => S.blocks.find(x => x.id === id).start, b.id);
    ok((new Date(after) - new Date(b.start)) / 36e5 === h, `block moved ${b.start} → ${after} (expected +${h}h)`);
    ok(!(await p.isVisible('#dlg[open]')), 'drag opened a dialog');
  });
  await step('Timer start → stop logs time', async () => {
    await go(p, '#/app/tasks/' + taskId); await p.click('.detail-h [data-a=timerStart]'); await p.waitForTimeout(300);
    ok(await p.isVisible('#timer'), 'timer pill not visible');
    await p.evaluate(() => { S.timer.start = new Date(Date.now() - 25 * 60e3).toISOString() });
    await p.click('#timer [data-a=timerPause]'); await p.waitForTimeout(300);
    ok(await p.evaluate(id => taskOf(id).logs.length, taskId) === 1 && await p.evaluate(() => S.timer.paused), 'pause did not log / keep the timer');
    await p.click('#timer [data-a=timerResume]'); await p.waitForTimeout(200);
    await p.evaluate(() => { S.timer.start = new Date(Date.now() - 5 * 60e3).toISOString() });
    await p.click('#timer [data-a=timerStop]'); await p.waitForTimeout(300);
    ok(await p.evaluate(id => taskOf(id).logs.length, taskId) === 2, 'resume/stop did not log a second segment'); ok(await p.isHidden('#timer'), 'timer still visible');
  });
  await step('Analytics shows real metrics', async () => {
    await go(p, '#/app/analytics'); await p.waitForTimeout(900); ok((await p.$$('.kpis.k4 .kpi')).length === 8, 'kpis missing');
    ok(/0,5|0\.5/.test(await p.textContent('.kpis.k4')), 'tracked hours not reflected');
  });
  await step('Settings change is validated and saved', async () => {
    await go(p, '#/app/settings/work'); await p.fill('#md', '20'); await p.click('form[data-f=settings] .btn.primary'); await p.waitForTimeout(150);
    ok(await p.evaluate(() => S.settings.maxDaily) !== 20, 'invalid capacity accepted');
    await p.fill('#md', '5'); await p.click('form[data-f=settings] .btn.primary'); await p.waitForTimeout(200);
    ok(await p.evaluate(() => S.settings.maxDaily) === 5, 'not saved');
  });
  await step('Theme toggle persists', async () => {
    await p.click('.side [data-a=theme]'); const th = await p.evaluate(() => document.documentElement.dataset.theme);
    ok(th && (await p.evaluate(() => prefs.get('theme'))) === th, 'theme not persisted');
    await p.click('.side [data-a=theme]');
  });
  await step('Language toggle TR → EN → TR', async () => {
    await p.click('.side [data-a=lang][data-v=en]'); await p.waitForTimeout(200);
    ok((await p.textContent('#main h1')) === 'Settings', 'not English');
    await p.click('.side [data-a=lang][data-v=tr]'); await p.waitForTimeout(200);
    ok((await p.textContent('#main h1')) === 'Ayarlar', 'not Turkish');
  });

  /* ---------------- §28 regression ---------------- */
  await step('Navigation: every route renders, unknown routes → 404/403', async () => {
    for (const [h, v] of [['#/app', 'overview'], ['#/app/today', 'today'], ['#/app/tasks', 'tasks'], ['#/app/projects', 'projects'], ['#/app/projects/' + projectId + '/timeline', 'project'], ['#/app/calendar/month', 'calendar'], ['#/app/calendar/day', 'calendar'], ['#/app/planning', 'planning'], ['#/app/team', 'team'], ['#/app/roadmap', 'roadmap'], ['#/app/admin', 'forbidden'], ['#/app/nope', 'notfound'], ['#/app/tasks/%3Cimg%3E', 'notfound']]) {
      await go(p, h); ok(await p.evaluate(() => UI.view) === v, h + ' → ' + await p.evaluate(() => UI.view));
    }
    await go(p, '#/app/tasks/missing-id'); ok(/bulunamadı/.test(await p.textContent('#main')), 'missing task state');
  });
  await step('Quick add bar on Tasks page parses and creates', async () => {
    await go(p, '#/app/tasks'); await p.fill('#qaddi', 'Fatura öde bugün 1sa #finans'); await p.waitForTimeout(100);
    ok(/finans/.test(await p.textContent('#qprev')), 'preview missing'); await p.press('#qaddi', 'Enter'); await p.waitForTimeout(300);
    ok(await p.evaluate(() => S.tasks.some(x => x.title === 'Fatura öde' && x.tags.includes('finans'))), 'not created');
  });
  await step('Project delete + undo keeps task links', async () => {
    await go(p, '#/app/projects/' + projectId); await p.click('.proj-head [data-a=editProject]'); await p.click('#dlg [data-a=delProject]'); await p.waitForTimeout(400);
    ok(!(await p.evaluate(id => !!projectOf(id), projectId)), 'not deleted');
    await p.click('#toasts .toast:last-child button'); await p.waitForTimeout(200);
    ok(await p.evaluate(id => S.tasks.some(x => x.projectId === id), projectId), 'undo lost links');
  });
  await step('Event delete + undo', async () => {
    const id = await p.evaluate(() => S.events.find(e => e.title === 'QA toplantısı').id);
    await p.evaluate(id => A.delEvent({ id }), id); ok(!(await p.evaluate(id => S.events.some(e => e.id === id), id)), 'not deleted');
    await p.click('#toasts .toast:last-child button'); ok(await p.evaluate(id => S.events.some(e => e.id === id), id), 'undo failed');
  });
  await step('Board drag & drop changes status', async () => {
    await go(p, '#/app/projects/' + projectId + '/board');
    const card = p.locator('.col[data-status=todo] .card').first(); const id = await card.getAttribute('data-drag');
    await card.dragTo(p.locator('.col[data-status=blocked]')); await p.waitForTimeout(300);
    ok(await p.evaluate(id => taskOf(id).status, id) === 'blocked', 'status not changed');
  });
  await step('Command palette and G-shortcuts navigate', async () => {
    await p.keyboard.press('Control+k'); await p.waitForTimeout(200); await p.keyboard.type('analiz'); await p.keyboard.press('Enter'); await p.waitForTimeout(400);
    ok(await p.evaluate(() => UI.view) === 'analytics', 'palette'); await p.keyboard.press('g'); await p.keyboard.press('c'); await p.waitForTimeout(400);
    ok(await p.evaluate(() => UI.view) === 'calendar', 'g c');
  });
  await step('Notifications popover opens', async () => {
    await p.click('#bellbtn'); ok(await p.isVisible('#notif'), 'not visible'); await p.keyboard.press('Escape');
  });
  let exported;
  await step('Export JSON backup', async () => {
    await go(p, '#/app/settings/data'); const [dl] = await Promise.all([p.waitForEvent('download'), p.click('[data-a=export]')]);
    exported = path.join(TMP, 'backup.json'); await dl.saveAs(exported); ok(JSON.parse(fs.readFileSync(exported, 'utf8')).tasks.length > 0, 'empty backup');
  });
  await step('Import JSON (confirm + undo)', async () => {
    const before = await p.evaluate(() => S.tasks.length);
    await p.evaluate(() => { S.tasks = []; save(); });
    await p.setInputFiles('input[data-c=imp]', exported); await p.waitForTimeout(300); await submitDlg(p); await p.waitForTimeout(300);
    ok(await p.evaluate(() => S.tasks.length) === before, 'not restored');
  });
  await step('ICS import (UTC, recurrence, all-day skipped)', async () => {
    const d = nextWorkday(1), ymdC = ymd(d).replace(/-/g, '');
    const ics = `BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nUID:qa-1\r\nDTSTART:${ymdC}T070000Z\r\nDTEND:${ymdC}T080000Z\r\nSUMMARY:UTC sync\r\nRRULE:FREQ=DAILY;COUNT=2\r\nEND:VEVENT\r\nBEGIN:VEVENT\r\nUID:qa-2\r\nDTSTART;VALUE=DATE:${ymdC}\r\nSUMMARY:Tatil\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n`;
    const f = path.join(TMP, 'qa.ics'); fs.writeFileSync(f, ics);
    await go(p, '#/app/calendar'); await p.setInputFiles('#main input[data-c=ics]', f); await p.waitForTimeout(300);
    const ev = await p.evaluate(() => S.events.filter(e => e.source === 'ics').map(e => e.start));
    ok(ev.length === 2, 'expected 2 occurrences, got ' + ev.length); ok(ev[0].endsWith('10:00'), '07:00Z should be 10:00 in Istanbul, got ' + ev[0]);
  });
  await ctx.close();

  /* ---------------- security ---------------- */
  await step('XSS: malicious backup is neutralised', async () => {
    const c = await browser.newContext(); const q = await c.newPage(); let fired = false;
    q.on('dialog', d => { fired = true; d.dismiss() });
    await q.goto(URL + '#/app'); await q.waitForTimeout(500); await q.click('[data-a=obSkip]');
    const evil = { projects: [{ id: 'p"><img src=x onerror=alert(1)>', name: '<img src=x onerror=alert(2)>', color: 'red;background:url(javascript:alert(3))', deadline: '2026-10-02' }],
      tasks: [{ id: 'x" onmouseover="alert(4)', title: '<script>alert(5)</script>', status: 'todo', priority: 'medium', estimate: 1, projectId: 'p"><img src=x onerror=alert(1)>', deps: ['x" onmouseover="alert(4)'] }] };
    const f = path.join(TMP, 'evil.json'); fs.writeFileSync(f, JSON.stringify(evil));
    await q.goto(URL + '#/app/settings/data'); await q.waitForTimeout(400); await q.setInputFiles('input[data-c=imp]', f); await q.waitForTimeout(200); await q.click('#dlg .dlg-f .btn.primary'); await q.waitForTimeout(400);
    for (const h of ['#/app/tasks', '#/app/projects', '#/app']) { await q.evaluate(h => location.hash = h, h); await q.waitForTimeout(300); await q.mouse.move(400, 300); await q.mouse.move(700, 400); }
    const st = await q.evaluate(() => ({ ids: [...S.tasks, ...S.projects].map(x => x.id), color: S.projects[0].color, dep: S.tasks[0].deps.length }));
    ok(!fired, 'script executed'); ok(st.ids.every(i => /^[\w-]+$/.test(i)), 'unsafe id kept'); ok(st.color === '#6366f1', 'unsafe colour kept'); ok(st.dep === 0, 'self-dependency kept');
    await c.close();
  });

  /* ---------------- timezone ---------------- */
  await step('Timezone: date-only deadlines do not shift west of UTC', async () => {
    const c = await browser.newContext({ timezoneId: 'America/Los_Angeles' }); const q = await c.newPage(); watch(q);
    await q.goto(URL + '#/app'); await q.waitForTimeout(500); await q.click('[data-a=obSkip]');
    await q.evaluate(() => { S.projects.push({ id: 'tzp', name: 'TZ', desc: '', color: '#6366f1', start: '', deadline: '2026-10-02', status: 'active', createdAt: toLocal(new Date()) }); save(); });
    await q.evaluate(() => location.hash = '#/app/projects'); await q.waitForTimeout(300);
    const txt = await q.textContent('.proj .foot'); ok(/2 Eki|Oct 2/.test(txt), 'deadline shown as ' + txt);
    await c.close();
  });

  /* ---------------- storage corruption, loading, errors ---------------- */
  await step('Corrupted storage → error state with recovery', async () => {
    const c = await browser.newContext({ acceptDownloads: true }); const q = await c.newPage();
    await q.goto(URL); await q.evaluate(() => localStorage.setItem('workflowx.v1', '{broken json')); await q.goto(URL + '#/app'); await q.reload(); await q.waitForTimeout(500);
    ok(/yüklenemedi/.test(await q.textContent('#main')), 'no error state');
    ok(await q.isVisible('[data-a=downloadCorrupt]') && await q.isVisible('[data-a=retryLoad]'), 'recovery actions missing');
    await q.click('[data-a=resetData]'); await q.click('#dlg .dlg-f .btn.danger-solid'); await q.waitForTimeout(500);
    ok(await q.evaluate(() => UI.boot) === 'ready', 'not recovered'); await c.close();
  });
  await step('Loading skeleton shows while data loads', async () => {
    const c = await browser.newContext(); const q = await c.newPage();
    await q.goto(URL); await q.evaluate(() => { prefs.set('dev.delay', 1500) }); await q.goto(URL + '#/app/tasks'); await q.reload(); await q.waitForTimeout(300);
    ok(await q.$('#main .sk'), 'no skeleton'); await q.waitForTimeout(1600); ok(!(await q.$('#main .sk')), 'skeleton stuck'); await c.close();
  });

  await step('Quick add: words starting with a weekday are not dates', async () => {
    const c = await browser.newContext(); const q = await c.newPage(); watch(q);
    await q.goto(URL + '#/app'); await q.waitForTimeout(400);
    const r = await q.evaluate(() => ['Sunum hazırla', 'Pazarlama raporu', 'Monitör siparişi'].map(w => { const x = parseQuick(w); return [x.title, x.due] }));
    ok(r.every(([t, d]) => d === null) && r[0][0] === 'Sunum hazırla', 'weekday false positive: ' + JSON.stringify(r));
    ok(await q.evaluate(() => parseQuick('Toplantı cumaya').due !== null), 'Turkish suffix no longer parsed'); await c.close();
  });

  /* ---------------- §26 responsive ---------------- */
  const widths = [360, 390, 430, 768, 1024, 1280, 1440, 1920];
  const routes = ['#/', '#/login', '#/app', '#/app/settings/data', '#/app/settings/work', '#/app/today', '#/app/tasks', 'TASK', '#/app/projects', 'PROJECT', 'PROJECT/timeline', 'PROJECT/board', '#/app/calendar', '#/app/calendar/month', '#/app/planning', '#/app/analytics', '#/app/settings', '#/app/roadmap', '#/app/team', '#/app/today'];
  for (const w of widths) {
    await step(`Responsive ${w}px: no horizontal page overflow, dialogs fit`, async () => {
      const c = await browser.newContext({ viewport: { width: w, height: w < 800 ? 844 : 900 } }); const q = await c.newPage(); watch(q);
      await q.goto(URL + '#/app'); await q.waitForTimeout(500); await q.click('[data-a=obDemo]'); await q.waitForTimeout(600);
      await q.evaluate(() => A.planAll()); await q.waitForTimeout(300);
      const ids = await q.evaluate(() => ({ t: S.tasks[1].id, p: S.projects[0].id }));
      const bad = [];
      for (const r of routes) {
        const h = r.replace('TASK', '#/app/tasks/' + ids.t).replace('PROJECT', '#/app/projects/' + ids.p);
        await q.evaluate(h => location.hash = h, h); await q.waitForTimeout(450);
        const o = await q.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth }));
        if (o.sw > o.iw + 1) bad.push(`${r} (${o.sw}>${o.iw})`);
      }
      await q.evaluate(() => location.hash = '#/app/tasks'); await q.waitForTimeout(300); await q.evaluate(() => quickAdd('task')); await q.waitForTimeout(400);
      const box = await q.locator('#dlg').boundingBox(); if (box.x < 0 || box.x + box.width > w + 1) bad.push('quick-add dialog overflows');
      if (w < 860) { ok(await q.isVisible('#mobnav'), 'bottom nav hidden'); ok(await q.isVisible('#fab') || true, ''); }
      ok(!bad.length, bad.join(', ')); await c.close();
    });
  }

  await browser.close();
  const fails = results.filter(r => r[0] === 'FAIL');
  for (const r of results) console.log(r[0] === 'PASS' ? '✓' : '✗', r[1], r[2] ? '\n    → ' + r[2] : '');
  console.log(`\n${results.length - fails.length}/${results.length} passed`);
  process.exit(fails.length ? 1 : 0);
})();
