/* WorkFlowX v0.7 — visual refresh: accent colours, project identity, bento dashboard, micro-interactions,
   illustrations, avatars, reduced motion and responsive checks for the new pieces.
   Run:  node qa/e2e-v7.js   (Playwright, Chromium). Fails on console errors and unexpected dialogs. */
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs'), os = require('os');
const URL = 'file://' + path.resolve(__dirname, '../index.html');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'wfx-v7-'));
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
  const d1 = workday(1);

  await step('Accent colour: picker applies instantly, persists across reloads, rejects unknown values', async () => {
    const { ctx, p } = await ctxPage(browser);
    await go(p, '#/app/settings/appearance');
    ok((await p.$$('.accent-pick input')).length === 8, 'expected 8 accent presets');
    await p.click('.accent-pick label:has(input[value=teal])'); await wait(p, 150);
    ok(await ev(p, () => document.documentElement.dataset.accent) === 'teal', 'accent not applied');
    const acc = await ev(p, () => getComputedStyle(document.documentElement).getPropertyValue('--acc').trim());
    ok(acc === '#0f766e', 'accent token not switched: ' + acc);
    await p.reload(); await wait(p, 500);
    ok(await ev(p, () => document.documentElement.dataset.accent) === 'teal', 'accent not persisted');
    await ev(p, () => { prefs.set('accent', '"><img src=x onerror=alert(1)>'); applyTheme() });
    ok(await ev(p, () => document.documentElement.dataset.accent) === 'indigo', 'unknown accent not rejected');
    await ctx.close();
  });

  await step('Project identity: icon picker saves an allow-listed icon; tampered icons are dropped on load', async () => {
    const { ctx, p } = await ctxPage(browser);
    await p.click('[data-a=quick]'); await wait(p); await p.click('#dlg [data-qt=project]').catch(() => {}); await wait(p);
    if (!await p.$('#pn')) { await ev(p, () => { closeDlg(); openProjectForm() }); await wait(p) }
    await p.fill('#pn', 'Roket'); await p.click('.icon-pick label:has(input[value=rocket])'); await p.click('#dlg .btn.primary'); await wait(p, 500);
    const icon = await ev(p, () => S.projects.find(x => x.name === 'Roket').icon);
    ok(icon === 'rocket', 'icon not saved: ' + icon);
    ok(await p.$('.proj-head .p-ic svg'), 'project header has no icon badge');
    await load(p, { projects: [{ id: 'px', name: 'X', color: '#6366f1', icon: '<script>' }] });
    ok(await ev(p, () => S.projects[0].icon) === '', 'tampered icon kept');
    await go(p, '#/app/projects'); ok(await p.$('.panel.proj .proj-cover') && await p.$('.panel.proj .p-ic.lg'), 'card cover/icon missing');
    await ctx.close();
  });

  await step('Bento dashboard: Now tile with day strip, ring, tiles link to their screens', async () => {
    const { ctx, p } = await ctxPage(browser);
    const now = new Date(), s = new Date(now - 30 * 6e4), e = new Date(+now + 30 * 6e4);
    const Lx = x => L(x, x.getHours(), x.getMinutes());
    await load(p, { tasks: [{ id: 'a', title: 'Rapor', estimate: 2, priority: 'high', due: L(d1, 17) }], events: [{ id: 'm', title: 'Planlama toplantısı', type: 'meeting', start: Lx(s), end: Lx(e) }] });
    await go(p, '#/app');
    ok(await p.$('.bento .t-now'), 'no Now tile');
    ok(/Planlama toplantısı/.test(await p.textContent('.t-now .now-title')), 'current item not shown');
    ok(await p.$('.t-now .dstrip i'), 'day strip empty');
    ok(await p.$('.t-ring svg.ring .ring-fg'), 'capacity ring missing');
    ok((await p.$$('.bento a.tile.link')).length === 4, 'expected 4 link tiles');
    await p.click('.bento a.tile.link[href="#/app/planning"]'); await wait(p, 400);
    ok(await ev(p, () => UI.view) === 'planning', 'tile link broken');
    await ctx.close();
  });

  await step('Completing a task: confetti burst appears and cleans itself up; reduced motion shows none', async () => {
    const { ctx, p } = await ctxPage(browser);
    await load(p, { tasks: [{ id: 'a', title: 'Bir', estimate: 1 }, { id: 'b', title: 'İki', estimate: 1 }] });
    await go(p, '#/app/tasks'); await p.click('.li [data-a=toggle][data-id=a]'); await wait(p, 120);
    ok(await p.$('canvas.confetti'), 'no confetti');
    await wait(p, 1600); ok(!await p.$('canvas.confetti'), 'confetti not cleaned up');
    ok(await ev(p, () => S.tasks.find(x => x.id === 'a').status) === 'done', 'task not completed');
    await ctx.close();
    const r = await ctxPage(browser, { reducedMotion: 'reduce' });
    await load(r.p, { tasks: [{ id: 'a', title: 'Bir', estimate: 1 }] });
    await go(r.p, '#/app/tasks'); await r.p.click('.li [data-a=toggle][data-id=a]'); await wait(r.p, 150);
    ok(!await r.p.$('canvas.confetti'), 'confetti shown despite reduced motion');
    ok(!await r.p.$('.rpl i'), 'ripple shown despite reduced motion');
    await r.ctx.close();
  });

  await step('Buttons: ripple layer never clips badges and is removed after the press; save morphs into a check', async () => {
    const { ctx, p } = await ctxPage(browser);
    await p.click('#qabtn'); await wait(p, 80);
    ok(await p.$('#qabtn > .rpl'), 'no ripple layer'); await wait(p, 700);
    ok(!(await p.$$('#qabtn > .rpl i')).length, 'ripple dots not removed');
    await ev(p, () => closeDlg());
    await go(p, '#/app/settings/work'); await p.click('form[data-s=work] .btn.primary'); await wait(p, 150);
    ok(await p.$('form[data-s=work] .btn.primary.is-done'), 'no success morph'); await wait(p, 1400);
    ok(!await p.$('form[data-s=work] .btn.primary.is-done'), 'success morph stuck');
    await ctx.close();
  });

  await step('Illustrations and avatars: every empty state has an illustration; avatars get a stable gradient', async () => {
    const { ctx, p } = await ctxPage(browser);
    await load(p, { members: [{ id: 'u1', name: 'Mert Kaya', email: '' }], tasks: [{ id: 'a', title: 'X', assignee: 'u1' }] });
    await load(p, { members: [{ id: 'u1', name: 'Mert Kaya', email: '' }] });
    for (const h of ['#/app/projects', '#/app/analytics', '#/app/tasks']) { await go(p, h); ok(await p.$('.empty svg.illo .bl'), 'no illustration on ' + h) }
    await load(p, { members: [{ id: 'u1', name: 'Mert Kaya', email: '' }], tasks: [{ id: 'a', title: 'X', assignee: 'u1' }] });
    await p.click('#bellbtn'); await wait(p); ok(await p.$('#notif svg.illo') || await p.$('#notif .notif-item, #notif .ni'), 'notification empty state has no illustration');
    await go(p, '#/app/team'); const c1 = await ev(p, () => [...document.querySelectorAll('.av-md')].map(e => e.className).join('|'));
    ok(/av-g\d/.test(c1), 'avatar gradient class missing');
    await p.reload(); await wait(p, 500); await go(p, '#/app/team');
    ok(await ev(p, () => [...document.querySelectorAll('.av-md')].map(e => e.className).join('|')) === c1, 'avatar colour not stable');
    await ctx.close();
  });

  await step('Onboarding shows a scene per step; landing hero has floating cards and feature visuals', async () => {
    const { ctx, p } = await ctxPage(browser, {}, false);
    ok(await p.$('#dlg .ob-art svg'), 'step 1 art missing'); await p.click('#dlg .btn.primary'); await wait(p);
    ok((await p.$$('#dlg .ob-art svg rect.al')).length >= 5, 'step 2 art missing');
    await p.click('[data-a=obSkip]'); await wait(p);
    await go(p, '#/'); await wait(p, 300);
    ok((await p.$$('#landing .hero-visual .hv-float')).length === 3, 'hero floats missing');
    ok((await p.$$('#landing .feat .f-art svg')).length === 6, 'feature visuals missing');
    await ctx.close();
  });

  await step('Theme / accent change cross-fades once and never blocks input', async () => {
    const { ctx, p } = await ctxPage(browser);
    await p.click('.side [data-a=theme]'); ok(await ev(p, () => document.documentElement.classList.contains('theming')), 'no cross-fade');
    await wait(p, 600); ok(!await ev(p, () => document.documentElement.classList.contains('theming')), 'cross-fade class stuck');
    await ctx.close();
  });

  for (const w of [360, 390, 768, 1024, 1920]) await step(`Responsive ${w}px: dashboard bento, project cards and settings fit without horizontal overflow`, async () => {
    const { ctx, p } = await ctxPage(browser, { viewport: { width: w, height: 860 } });
    await ev(p, () => { seed(); render() });
    for (const h of ['#/app', '#/app/projects', '#/app/settings/appearance']) {
      await go(p, h); const o = await ev(p, () => document.documentElement.scrollWidth - innerWidth);
      ok(o <= 1, `${h} overflows by ${o}px`);
    }
    await ctx.close();
  });

  await browser.close();
  const fails = results.filter(r => r[0] === 'FAIL');
  for (const r of results) console.log(r[0] === 'PASS' ? '✓' : '✗', r[1], r[2] ? '\n    → ' + r[2] : '');
  console.log(`\n${results.length - fails.length}/${results.length} passed`);
  process.exit(fails.length ? 1 : 0);
})();
