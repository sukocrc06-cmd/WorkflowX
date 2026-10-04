/* Accessibility audit with axe-core (WCAG 2 A/AA) — light and dark theme, every screen and the main dialogs.
   Run:  npm i -D playwright axe-core && node qa/a11y.js */
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const URL = 'file://' + path.resolve(__dirname, '../index.html');
(async () => {
  const b = await chromium.launch(); const found = {};
  for (const theme of ['light', 'dark']) for (const vw of [1440, 390]) {
    const p = await b.newPage({ viewport: { width: vw, height: 900 } });
    await p.goto(URL + '#/'); await p.evaluate(th => prefs.set('theme', th), theme); await p.reload(); await p.waitForTimeout(400);
    const run = async name => { await p.addScriptTag({ content: AXE }); const r = await p.evaluate(async () => (await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa'] })).violations.map(v => ({ id: v.id, impact: v.impact, n: v.nodes.length, ex: v.nodes.slice(0, 2).map(n => n.target.join(' ')) }))); r.forEach(v => { const k = v.id; (found[k] ??= { impact: v.impact, pages: [], ex: v.ex }).pages.push(`${theme}/${vw}${name}`) }) };
    await run(' landing');
    await p.goto(URL + '#/app'); await p.waitForTimeout(400); await run(' dlg:onboarding-1'); await p.click('#dlg .btn.primary'); await p.waitForTimeout(300); await run(' dlg:onboarding-2'); await p.click('#dlg .btn.primary'); await p.waitForTimeout(300); await run(' dlg:onboarding-3'); await p.click('[data-a=obBack]'); await p.click('[data-a=obBack]'); await p.waitForTimeout(300); await p.click('[data-a=obDemo]'); await p.waitForTimeout(600);
    const ids = await p.evaluate(() => ({ t: S.tasks[1].id, p: S.projects[0].id }));
    for (const h of ['#/app', '#/app/today', '#/app/tasks', '#/app/tasks/' + ids.t, '#/app/projects', '#/app/projects/' + ids.p, '#/app/projects/' + ids.p + '/board', '#/app/projects/' + ids.p + '/timeline', '#/app/calendar', '#/app/calendar/month', '#/app/planning', '#/app/analytics', '#/app/team', '#/app/settings', '#/app/settings/appearance', '#/app/settings/work', '#/app/settings/data', '#/app/settings/privacy', '#/app/roadmap', '#/app/nope']) { await p.evaluate(h => location.hash = h, h); await p.waitForTimeout(1000); await run(' ' + h.replace(/[0-9a-f-]{36}/g, 'ID')) }
    await p.evaluate(() => quickAdd('task')); await p.waitForTimeout(300); await run(' dlg:task'); await p.keyboard.press('Escape'); await p.waitForTimeout(250);
    await p.evaluate(() => openMemberForm()); await p.waitForTimeout(300); await run(' dlg:member'); await p.keyboard.press('Escape'); await p.waitForTimeout(250);
    await p.evaluate(() => { const e = S.events.find(x => x.type === 'meeting' && conflictsWith(+new Date(x.start), +new Date(x.end), x.id).length); if (e) openConflictFor('ev', e.id) }); await p.waitForTimeout(300); await run(' dlg:conflict'); await p.keyboard.press('Escape'); await p.waitForTimeout(250);
    await p.evaluate(() => { const id = S.tasks.find(x => x.status !== 'done').id; A.timerStart({ id }); A.timerPause() }); await p.waitForTimeout(200); await run(' timer-paused');
    await p.evaluate(() => importJSON(JSON.stringify({ projects: [], tasks: [{ id: 'z', title: 'z' }] }))); await p.waitForTimeout(300); await run(' dlg:import'); await p.keyboard.press('Escape'); await p.waitForTimeout(250);
    if (vw > 900) { await p.click('#bellbtn'); await p.waitForTimeout(200); await run(' pop:notifications') }
    await p.close();
  }
  await b.close();
  const keys = Object.keys(found);
  for (const k of keys) console.log(k, found[k].impact, '|', found[k].pages.slice(0, 6).join(' '), '\n   ', found[k].ex.join('\n    '));
  console.log(keys.length ? `\n${keys.length} rule(s) violated` : 'axe: 0 violations');
  process.exit(keys.length ? 1 : 0);
})();
