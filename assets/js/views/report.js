/* ================= WEEKLY REPORT  (#/app/analytics/report?w=YYYY-MM-DD) =================
   One week at a time (Monday–Sunday). Share as Markdown, copy, or print / save as PDF. */
const repDelta=(now,prev,kind)=>{if(now===prev)return`<span class="rep-d">= ${t('önceki hafta')}</span>`;const up=now>prev;const v=kind==='h'?hrs(Math.abs(Math.round((now-prev)*10)/10)):Math.abs(now-prev);return`<span class="rep-d ${up?'up':'down'}">${up?'▲':'▼'} ${v} <small>${t('geçen haftaya göre')}</small></span>`};
V.report=()=>{
  const base=UI.param?parseDay(UI.param):new Date(),r=weeklyReport(base),wk=dayKey(r.from);
  const prevK=dayKey(addDays(r.from,-7)),nextK=dayKey(addDays(r.from,7));
  const pmx=Math.max(1,...r.byProject.map(p=>p.h));
  const taskLink=x=>`<a href="${hrefFor('task',x.id)}">${esc(x.title||t('Adsız görev'))}</a>`;
  const empty=!r.completed.length&&!r.logged&&!r.planned&&!r.meetings&&!r.slipped.length&&!r.dueNext.length;
  return`<div class="page-h"><div><a class="linkbtn rep-back" href="#/app/analytics">${svg('left','i s')}${t('Analiz')}</a><h1>${t('Haftalık rapor')}</h1><p>${esc(fDate(r.from))} – ${esc(fDate(r.to))}${r.isCurrent?` · <span class="pill">${t('Bu hafta')}</span>`:''}</p></div>
    <div class="row rep-actions">
      <div class="seg-mini" role="group" aria-label="${t('Hafta')}"><a class="btn sm ghost" href="${hrefFor('report',prevK)}" aria-label="${t('Önceki hafta')}">${svg('left')}</a>${r.isCurrent?'':`<a class="btn sm ghost" href="${hrefFor('report')}">${t('Bu hafta')}</a>`}<a class="btn sm ghost" href="${hrefFor('report',nextK)}" aria-label="${t('Sonraki hafta')}">${svg('right')}</a></div>
      <button type="button" class="btn sm" data-a="reportCopy" data-w="${wk}">${t('Metni kopyala')}</button>
      <button type="button" class="btn sm" data-a="reportMd" data-w="${wk}">${svg('upload')}${t('Markdown indir')}</button>
      <button type="button" class="btn sm primary" data-a="reportPrint">${t('Yazdır / PDF')}</button>
    </div></div>
  ${r.isFuture?`<div class="callout" role="note">${svg('clock','i s')} ${t('Bu hafta henüz başlamadı; yalnızca planlananlar görünür.')}</div>`:''}
  <div class="kpis k4">
    <div class="kpi"><div class="l">${t('Tamamlanan görev')}</div><div class="v">${r.completed.length}</div>${repDelta(r.completed.length,r.prev.done,'n')}</div>
    <div class="kpi"><div class="l">${t('Kaydedilen süre')}</div><div class="v">${hrs(r.logged)}</div>${repDelta(r.logged,r.prev.logged,'h')}</div>
    <div class="kpi"><div class="l">${t('Planlanan odak süresi')}</div><div class="v">${hrs(r.planned)}</div></div>
    <div class="kpi"><div class="l">${t('Etkinlikler')}</div><div class="v">${r.meetings}<small> · ${hrs(r.meetingH)}</small></div></div>
  </div>
  ${empty?`<div class="panel">${emptyState('chart',t('Bu hafta için kayıt yok'),t('Görev tamamladıkça, süre kaydettikçe ve takvime odak bloğu ekledikçe rapor kendiliğinden dolar.'),'')}</div>`:`<div class="grid-dash">
    <section class="panel c7"><div class="panel-h"><h2>${t('Tamamlananlar')}</h2><span class="muted small">${r.completed.length}</span></div><div class="panel-b">
      ${r.completed.length?`<ul class="rep-list">${r.completed.map(x=>`<li>${svg('check','i s')}<span>${taskLink(x)}${x.projectId&&projectOf(x.projectId)?` <small class="muted">· ${esc(projectOf(x.projectId).name)}</small>`:''}</span><small class="muted">${esc(fDate(x.completedAt))}</small></li>`).join('')}</ul>`:`<p class="muted">${t('Bu hafta tamamlanan görev yok.')}</p>`}
    </div></section>
    <section class="panel c5"><div class="panel-h"><h2>${t('Projelere göre süre')}</h2></div><div class="panel-b">
      ${r.byProject.length?r.byProject.map(p=>`<div class="hbar"><span class="n">${esc(p.name)}</span><div class="bar"><i style="width:${p.h/pmx*100}%;background:${esc(p.color)}"></i></div><span class="v">${hrs(p.h)}</span></div>`).join(''):`<p class="muted">${t('Bu hafta süre kaydı yok. Görevdeki ▶ ile zamanlayıcıyı başlatabilirsin.')}</p>`}
      ${r.accuracy?`<p class="small" style="margin:12px 0 0">${t('Tahmin doğruluğu')}: <b>×${num(r.accuracy.factor)}</b> <span class="muted">(${r.accuracy.n} ${t('görev')})</span></p>`:''}
    </div></section>
    <section class="panel c6"><div class="panel-h"><h2>${t('Gecikenler')}</h2><span class="muted small">${r.slipped.length}</span></div><div class="panel-b">
      ${r.slipped.length?`<ul class="rep-list">${r.slipped.map(x=>`<li>${svg('alert','i s')}<span>${taskLink(x)}</span><small class="muted">${esc(fDT(x.due))}</small></li>`).join('')}</ul>`:`<p class="muted">${t('Bu hafta teslim tarihi kaçan görev yok.')}</p>`}
    </div></section>
    <section class="panel c6"><div class="panel-h"><h2>${t('Gelecek hafta teslim')}</h2><span class="muted small">${r.dueNext.length}</span></div><div class="panel-b">
      ${r.dueNext.length?`<ul class="rep-list">${r.dueNext.map(x=>`<li>${svg('cal','i s')}<span>${taskLink(x)}</span><small class="muted">${esc(fDT(x.due))}</small></li>`).join('')}</ul>`:`<p class="muted">${t('Gelecek hafta teslimi olan görev yok.')}</p>`}
    </div></section>
  </div>`}`;
};
