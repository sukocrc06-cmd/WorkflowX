/* ================= TODAY  (#/app/today) =================
   The morning screen: Now → Next → Later, today's capacity, and a short,
   explained list of what to work on. Everything is computed from real data. */
function flowItem(i,lbl,now){
  if(!i)return'';
  const x=i.x,tk=i.k==='bl'?taskOf(x.taskId):null,p=tk?projectOf(tk.projectId):(i.k==='ev'&&x.projectId?projectOf(x.projectId):null);
  const title=i.k==='ev'?x.title:(tk?tk.title:t('Silinmiş görev'));
  const mins=Math.max(0,Math.round(((lbl==='now'?new Date(x.end):new Date(x.start))-now)/60000));
  const rel=lbl==='now'?t('{m} dk kaldı',{m:mins}):mins<60?t('{m} dk sonra',{m:mins}):t('{t}’de',{t:fTime(x.start)});
  const col=i.k==='ev'?EVT_C[x.type]:(p?p.color:'var(--accent)');
  const conflict=conflictsWith(+new Date(x.start),+new Date(x.end),x.id).length;
  return`<li class="flow-i f-${lbl}" style="--c:${col}"><span class="flow-lbl">${lbl==='now'?t('Şimdi'):lbl==='next'?t('Sıradaki'):t('Sonra')}</span>
    <div class="flow-b"><div class="flow-t"><span class="time-col">${fTime(x.start)}–${fTime(x.end)}</span><small>${rel}</small></div>
      <b>${tk?taskLink(tk,'plain'):`<button type="button" class="linkbtn plain" data-a="editEvent" data-id="${x.id}">${esc(title)}</button>`}</b>
      <div class="meta"><span>${i.k==='ev'?EV(x.type):t('Odak bloğu')}</span>${p?`<span>${esc(p.name)}</span>`:''}${x.location?`<span>${esc(x.location)}</span>`:''}${conflict?`<span class="late">${svg('alert','i s')} ${t('Çakışma')}</span>`:''}</div></div>
    ${tk&&tk.status!=='done'?`<div class="flow-a">${S.timer&&S.timer.taskId===tk.id?(S.timer.paused?`<button type="button" class="btn sm" data-a="timerResume">${svg('play')}${t('Sürdür')}</button>`:`<button type="button" class="btn sm rec" data-a="timerPause">${svg('pause')}${t('Duraklat')}</button>`):`<button type="button" class="btn sm ${lbl==='now'?'primary':''}" data-a="timerStart" data-id="${tk.id}">${svg('play')}${t('Başlat')}</button>`}<button type="button" class="btn sm icon" data-a="toggle" data-id="${tk.id}" aria-label="${t('Tamamla')}: ${esc(tk.title)}">${svg('check')}</button></div>`:''}</li>`;
}
function capStrip(c,{big=false}={}){
  const pct=c.available?Math.min(100,c.planned/c.available*100):0;
  return`<div class="capstrip ${c.over?'over':''} ${big?'big':''}" aria-label="${t('Günün kapasitesi')}: ${capLabel(c)}">
    <div class="cs-top"><span class="cs-l">${t('Günün kapasitesi')}</span><span class="cs-v"><b>${num(c.planned)}</b> / ${c.work?hrs(c.available):t('İzin günü')}</span></div>
    <div class="bar ${c.over?'over':''}"><i style="width:${c.over?100:pct}%"></i></div>
    <div class="cs-foot">${c.work?(c.over?`<span class="late">${svg('alert','i s')} ${t('{h} aşırı yük',{h:hrs(c.overBy)})}</span> <button type="button" class="btn sm" data-a="optimize">${svg('wand')}${t('Planı optimize et')}</button>`:`<span>${t('Boş')}: <b>${hrs(c.free)}</b></span>`):`<span>${t('Bugün çalışma günün değil')}</span>`}${c.work&&dayKey(c.d)===dayKey(new Date())?`<span>${t('Bugün kalan çalışılabilir: {h}',{h:hrs(c.remaining)})}</span>`:''}</div></div>`;
}
V.today=()=>{
  const now=new Date(),c=dayCapacity(now);
  const ag=agendaFor(now).filter(i=>+new Date(i.x.end)>+now);
  const cur=ag.find(i=>+new Date(i.x.start)<=+now),rest=ag.filter(i=>i!==cur);
  const focus=todayFocus(5),late=myOpen().filter(isLate);
  let nextWork=null;if(!c.work){for(let d=addDays(sod(now),1),i=0;i<14;d=addDays(d,1),i++)if(isWorkDay(d)){nextWork=dayCapacity(d);break}}
  const nwItems=nextWork?agendaFor(nextWork.d):[];
  const unplanned=myOpen().some(x=>remainingH(x)>0);
  const idle=!cur?`<li class="flow-i f-now idle"><span class="flow-lbl">${t('Şimdi')}</span><div class="flow-b"><b>${c.work&&c.remaining>0?t('Takviminde şu an bir şey yok'):t('Şu an planlı iş yok')}</b><div class="meta"><span>${focus[0]&&c.work&&c.remaining>0?t('Önerilen: “{x}” — {w}',{x:focus[0].title,w:why4today(focus[0])}):unplanned?t('Planlanmamış işlerini takvime yerleştirebilirsin.'):t('Her şey planlı.')}</span></div></div>${focus[0]&&c.work&&c.remaining>0?`<div class="flow-a"><button type="button" class="btn sm primary" data-a="timerStart" data-id="${focus[0].id}">${svg('play')}${t('Başlat')}</button></div>`:''}</li>`:'';
  return`<div class="today-wrap"><div class="page-h"><div><h1>${t('Bugün')}${greetName()}</h1><p>${dayName(now.getDay())}, ${now.toLocaleDateString(LOC(),{day:'numeric',month:'long'})}</p></div><a class="btn ghost sm hide-sm" href="#/app">${svg('home')}${t('Genel bakış')}</a></div>
  ${!c.work?`<div class="callout today-off">${svg('sun','i s')}<div><b>${t('Bugün çalışma günün değil.')}</b> ${nextWork?t('Sıradaki iş günü {d}: {n} öğe, {h} planlı.',{d:dayName(nextWork.d.getDay()),n:nwItems.length,h:hrs(nextWork.planned)}):''} ${nextWork?`<a href="${hrefFor('calendar',dayKey(nextWork.d),'day')}">${t('Programı gör')}</a>`:''}</div></div>`:''}
  ${capStrip(c,{big:true})}
  ${(()=>{const soon=+addDays(sod(now),2),risk=myOpen().filter(x=>isLate(x)||(x.due&&+new Date(x.due)<soon&&remainingH(x)>0));return risk.length?`<div class="callout warn risk" role="status">${svg('alert','i s')}<div><b>${t('Gecikme riski')}</b> · ${risk.slice(0,3).map(x=>`<a href="${hrefFor('task',x.id)}">${esc(x.title)}</a> <small>(${isLate(x)?t('gecikti'):t('{h} planlanmadı',{h:hrs(remainingH(x))})})</small>`).join(', ')}${risk.length>3?` +${risk.length-3}`:''}${risk.some(x=>remainingH(x)>0&&!isLate(x))?` <button type="button" class="btn sm" data-a="planAll">${svg('spark')}${t('Planla')}</button>`:''}</div></div>`:''})()}
  <section class="flow-sec" aria-labelledby="fl-h"><h2 id="fl-h" class="sr">${t('Günün akışı')}</h2>
    <ol class="dayflow">${cur?flowItem(cur,'now',now):idle}${flowItem(rest[0],'next',now)}${flowItem(rest[1],'later',now)}</ol>
    ${!ag.length&&!cur&&c.work?`<p class="muted small" style="margin:6px 0 0">${t('Bugün için kalan takvim öğesi yok.')} ${unplanned?`<button type="button" class="linkbtn" data-a="go" data-v="planning">${t('Planlamaya git')}</button>`:''}</p>`:''}
  </section>
  <button type="button" class="btn primary big-add" data-a="quick">${svg('plus')}${t('Hızlı ekle')}</button>
  <section class="plain-sec" aria-labelledby="fo-h"><div class="sec-h"><h2 id="fo-h">${t('Bugün ne yapmalıyım?')}</h2>${late.length?`<span class="pill pr-urgent">${t('{n} geciken',{n:late.length})}</span>`:''}</div>
    ${focus.length?`<div class="list">${focus.map(x=>`<div class="li"><button type="button" class="chk" data-a="toggle" data-id="${x.id}" aria-label="${t('Tamamla')}: ${esc(x.title)}"></button><div class="t">${taskLink(x)}<div class="meta"><span class="why-chip">${why4today(x)}</span>${+x.estimate?`<span>${t('{h} kaldı',{h:hrs(Math.max(0,+x.estimate-actualH(x)))})}</span>`:''}${x.projectId&&projectOf(x.projectId)?`<span>${esc(projectOf(x.projectId).name)}</span>`:''}</div></div>${timerBtn(x)}</div>`).join('')}</div>`
      :`<div class="empty-inline">${svg('check')}<div><b>${t('Bugün için acil iş yok')}</b><p>${t('Geciken, bugün teslim veya yüksek öncelikli görev bulunmuyor.')}</p><button type="button" class="btn sm" data-a="go" data-v="tasks">${t('Tüm görevler')}</button></div></div>`}
  </section>
  <section class="plain-sec" aria-labelledby="pr-h"><div class="sec-h"><h2 id="pr-h">${t('Bugünün programı')}</h2><a class="btn sm ghost" href="${hrefFor('calendar',null,'day')}">${t('Takvim')}</a></div>
    ${agendaFor(now).length?`<div class="list">${agendaFor(now).map(agendaRow).join('')}</div>`:`<p class="muted" style="margin:4px 0 8px">${t('Takvimin bugün boş.')} <button type="button" class="linkbtn" data-a="newEvent">${t('Etkinlik ekle')}</button></p>`}
  </section></div>`;
};
