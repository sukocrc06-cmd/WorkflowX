/* ================= OVERVIEW  (#/app) =================
   Answers five questions at a glance:
   1 What should I do today?  2 What is urgent?  3 What is on my calendar?
   4 Which projects are moving?  5 Is my time enough? */
/* Today's timeline inside the "Now" tile: working hours, planned items and a now marker. */
function dayStrip(now,ag){
  const st=S.settings,a=+sod(now)+Math.min(st.workStart,...ag.map(i=>new Date(i.x.start).getHours()))*36e5,b=+sod(now)+Math.max(st.workEnd,...ag.map(i=>new Date(i.x.end).getHours()+(new Date(i.x.end).getMinutes()?1:0)))*36e5,span=Math.max(1,b-a);
  const pc=v=>Math.max(0,Math.min(100,(v-a)/span*100)).toFixed(2);
  const items=ag.map(i=>{const s=+new Date(i.x.start),e=+new Date(i.x.end);return`<i class="${i.k==='ev'?'ev':'blk'} ${e<=+now?'past':''}" style="left:${pc(s)}%;width:${Math.max(.8,pc(e)-pc(s))}%" title="${fTime(i.x.start)}–${fTime(i.x.end)}"></i>`}).join('');
  const h0=new Date(a).getHours(),h1=new Date(b).getHours()||24,mid=Math.round((h0+h1)/2);
  return`<div class="dstrip-w" aria-hidden="true"><div class="dstrip">${items}${+now>=a&&+now<=b?`<b class="nowline" style="left:${pc(+now)}%"></b>`:''}</div><div class="dstrip-l"><span>${pad(h0)}:00</span><span>${pad(mid)}:00</span><span>${pad(h1%24)}:00</span></div></div>`;
}
V.overview=()=>{
  if(!S.tasks.length&&!S.projects.length&&!S.events.length){
    const step=(n,h,m,btn,a)=>`<div class="li"><span class="step-n">${n}</span><div class="t"><b>${t(h)}</b><div class="meta">${t(m)}</div></div><button type="button" class="btn sm" data-a="${a}">${t(btn)}</button></div>`;
    return`<div class="page-h"><div><h1>${t('Hoş geldin')}${greetName()}</h1><p>${t('Çalışma alanın boş. Başlamak için üç adım yeterli.')}</p></div></div>
    <section class="panel onboarding-steps"><div class="list">
      ${step(1,'İlk projeni oluştur','İlgili işleri bir araya topla.','Proje oluştur','newProject')}
      ${step(2,'Süre ve teslim tarihi olan bir görev ekle','Akıllı planlama bu iki bilgiyle çalışır.','Görev ekle','newTask')}
      ${step(3,'Toplantılarını takvime ekle','Elle ekle ya da Google/Outlook’tan .ics dosyası içe aktar.','Etkinlik ekle','newEvent')}
      ${step('—','Ya da örnek verilerle keşfet','Demo veriler işaretlenir ve Ayarlar’dan tek tıkla silinebilir.','Demo verisi yükle','seed')}
    </div></section>`;
  }
  const now=new Date(),ag=agendaFor(now),open=myOpen(),today=dayCapacity(now);
  const focusAll=todayFocus(99),urgent=focusAll.slice(0,6);
  const curItem=ag.find(i=>+new Date(i.x.start)<=+now&&+new Date(i.x.end)>+now),nextItem=ag.find(i=>+new Date(i.x.start)>+now);
  const lbl=i=>i?(i.k==='ev'?i.x.title:taskOf(i.x.taskId)?.title||''):'';
  const running=S.timer&&taskOf(S.timer.taskId);
  const cap=capacityOutlook(5),ins=insights(),warn=ins.some(i=>i.lvl==='warn');
  const active=S.projects.filter(p=>!p.archived&&p.status!=='done').map(p=>({p,g:projProgress(p),h:projectHealth(p)})).sort((a,b)=>(a.p.deadline||'9')<(b.p.deadline||'9')?-1:1);
  const upcoming=open.filter(x=>x.due&&+new Date(x.due)>=+addDays(sod(now),1)&&+new Date(x.due)<+addDays(now,14)).sort((a,b)=>new Date(a.due)-new Date(b.due)).slice(0,5);
  const h=now.getHours(),greet=h<12?t('Günaydın'):h<18?t('İyi günler'):t('İyi akşamlar');
  const lateN=open.filter(isLate).length,wk=+addDays(now,-7),doneWeek=S.tasks.filter(x=>x.status==='done'&&x.completedAt&&+new Date(x.completedAt)>=wk).length;
  return`<div class="page-h"><div><h1>${greet}${greetName()}</h1><p>${dayName(now.getDay())}, ${now.toLocaleDateString(LOC(),{day:'numeric',month:'long'})} · ${t('İşin ve zamanın tek bakışta')}</p></div>
    <div class="row"><a class="btn" href="#/app/today">${svg('sun')}${t('Bugün görünümü')}</a><button type="button" class="btn primary" data-a="planAll" ${open.some(x=>remainingH(x)>0)?'':'disabled'}>${svg('spark')}${t('Haftayı planla')}</button></div></div>
  <div class="bento">
    <section class="tile t-now kpi-now" aria-labelledby="now-h">
      <div class="tile-h"><span class="live ${running&&!S.timer.paused||curItem?'on':''}" aria-hidden="true"></span><h2 id="now-h">${t('Şu an')}</h2>${running?`<span class="pill">${S.timer.paused?t('Duraklatıldı'):t('Zamanlayıcı çalışıyor')}</span>`:''}</div>
      ${running?`<a class="now-title" href="${hrefFor('task',running.id)}">${esc(running.title)}</a><div class="now-meta">${svg('clock','i s')} ${t('Bu oturum')}: <b class="tm-live">${dur(timerTotalMs()/36e5)}</b></div>
        <div class="row">${S.timer.paused?`<button type="button" class="btn sm primary" data-a="timerResume">${svg('play')}${t('Sürdür')}</button>`:`<button type="button" class="btn sm" data-a="timerPause">${svg('pause')}${t('Duraklat')}</button>`}<button type="button" class="btn sm" data-a="timerStop">${svg('stop')}${t('Durdur')}</button></div>`
      :curItem?`<div class="now-title">${esc(lbl(curItem))}</div><div class="now-meta">${fTime(curItem.x.start)}–${fTime(curItem.x.end)} · ${t('{m} dk kaldı',{m:Math.max(1,Math.round((+new Date(curItem.x.end)-+now)/6e4))})}</div>
        <div class="now-bar" aria-hidden="true"><i style="width:${Math.min(100,Math.max(0,(+now-+new Date(curItem.x.start))/Math.max(1,+new Date(curItem.x.end)-+new Date(curItem.x.start))*100)).toFixed(1)}%"></i></div>
        ${curItem.k!=='ev'&&taskOf(curItem.x.taskId)?`<div class="row"><button type="button" class="btn sm primary" data-a="timerStart" data-id="${curItem.x.taskId}">${svg('play')}${t('Zamanlayıcıyı başlat')}</button></div>`:''}`
      :`<div class="now-title muted-t">${t('Planlı bir şey yok')}</div><div class="now-meta">${urgent[0]?t('Önerilen: {x}',{x:esc(urgent[0].title)}):t('Serbest zaman — bir görev seç ya da ekle.')}</div>
        <div class="row">${urgent[0]?`<button type="button" class="btn sm primary" data-a="timerStart" data-id="${urgent[0].id}">${svg('play')}${t('Şimdi başla')}</button>`:`<button type="button" class="btn sm primary" data-a="newTask">${svg('plus')}${t('Görev ekle')}</button>`}</div>`}
      ${dayStrip(now,ag)}
      <div class="now-next"><h3>${t('Sırada')}</h3>${ag.filter(i=>+new Date(i.x.start)>+now).slice(0,2).map(i=>`<div class="nx"><b>${fTime(i.x.start)}</b><span>${esc(lbl(i))}</span></div>`).join('')||`<span class="muted small">${t('Bugün için kalan plan yok')}</span>`}</div>
    </section>
    <a class="tile t-ring link" href="#/app/today" aria-label="${t('Bugün planlı')}: ${hrs(today.planned)} / ${today.work?hrs(today.available):t('İzin günü')}">
      ${ring(today.available?today.planned/today.available:0,t('Günlük kapasite doluluğu'),today.over?'over':'')}
      <div><div class="l">${t('Bugün planlı')}</div><div class="v ${today.over?'late':''}">${cu(today.planned)}</div><small class="muted">/ ${today.work?hrs(today.available):t('İzin günü')}${today.over?' · '+t('kapasite aşıldı'):''}</small></div></a>
    <a class="tile link" href="#/app/tasks"><div class="tile-ic">${svg('target')}</div><div class="l">${t('Öncelikli iş')}</div><div class="v">${cu(focusAll.length,'n')}</div><small class="${lateN?'late':'muted'}">${lateN?t('{n} geciken',{n:lateN}):t('Geciken yok')}</small></a>
    <a class="tile link" href="#/app/planning"><div class="tile-ic">${svg('spark')}</div><div class="l">${t('Takvime yerleşmemiş')}</div><div class="v">${cu(open.reduce((s,x)=>s+remainingH(x),0))}</div><small class="muted">${t('Planlama önerisi al')} →</small></a>
    <a class="tile link" href="#/app/analytics"><div class="tile-ic">${svg('check')}</div><div class="l">${t('Son 7 günde tamamlanan')}</div><div class="v">${cu(doneWeek,'n')}</div><small class="muted">${doneWeek?t('Harika gidiyorsun'):t('Henüz yeterli veri yok')}</small></a>
  </div>
  <section class="panel capacity ${cap.ok?'':'short'}" aria-labelledby="cap-h"><div class="panel-h"><h2 id="cap-h">${t('Zamanın yetiyor mu?')}</h2><span class="muted small">${t('Önümüzdeki 5 iş günü')}</span></div>
    <div class="panel-b cap-body"><div class="cap-verdict">${svg(cap.ok?'check':'alert')}<div><b>${cap.ok?t('Evet, yetiyor.'):t('Hayır, {h} eksik.',{h:hrs(cap.short)})}</b><p>${t('Bu süre içinde teslim edilecek {a} planlanmamış iş var; takviminde {b} boş kapasite kaldı.',{a:hrs(cap.need),b:hrs(cap.free)})}</p>
      <div class="row">${cap.tasks.length?`<button type="button" class="btn sm ${cap.ok?'':'primary'}" data-a="planAll">${svg('spark')}${t('Eksik saatleri planla')}</button>`:''}${cap.days.some(r=>r.over)?`<button type="button" class="btn sm" data-a="optimize">${svg('wand')}${t('Planı optimize et')}</button>`:''}</div></div></div>
    <div class="cap-days">${cap.days.map(r=>`<a class="cap-day" href="${hrefFor('calendar',dayKey(r.d),'day')}" aria-label="${dayName(r.d.getDay())}: ${hrs(r.load)} / ${hrs(r.cap)}"><span class="cap-bar"><i class="${r.over?'over':''}" style="height:${Math.min(100,r.load/Math.max(r.cap,0.1)*100)}%"></i></span><b>${dayName(r.d.getDay(),true)}</b><small>${hrs(r.free)} ${t('boş')}</small></a>`).join('')}</div></div></section>
  ${ins.length?`<div class="insight ${warn?'warn':''}"><span class="ic">${svg(warn?'alert':'spark')}</span><div><strong>${t('Dikkat etmen gerekenler')}</strong><ul>${ins.slice(0,4).map(i=>`<li>${esc(i.text)}</li>`).join('')}</ul></div></div>`:''}
  <div class="grid-dash">
    <section class="panel c5" aria-labelledby="ov-today"><div class="panel-h"><h2 id="ov-today">${t('Bugün takviminde')}</h2><a class="btn sm ghost" href="${hrefFor('calendar',null,'day')}">${t('Takvim')}</a></div><div class="panel-b">
      ${ag.length?`<div class="list">${ag.map(agendaRow).join('')}</div>`:emptyState('cal',t('Takvimin bugün boş'),t('Odaklanmak için harika bir gün.'),t('Etkinlik ekle'),'data-a="newEvent"')}
    </div></section>
    <section class="panel c7" aria-labelledby="ov-urgent"><div class="panel-h"><h2 id="ov-urgent">${t('Bugün ne yapmalıyım?')}</h2><a class="btn sm ghost" href="#/app/today">${t('Bugün')}</a></div><div class="panel-b">
      ${urgent.length?`<div class="list">${urgent.map(x=>taskRow(x,{compact:true,why:true})).join('')}</div>`:emptyState('party',t('Acil iş yok'),t('Geciken, bugün teslim veya yüksek öncelikli görev bulunmuyor.'),t('Görev ekle'),'data-a="newTask"')}
    </div></section>
    <section class="panel c7" aria-labelledby="ov-proj"><div class="panel-h"><h2 id="ov-proj">${t('Projeler')}</h2><a class="btn sm ghost" href="#/app/projects">${t('Tümü')}</a></div><div class="panel-b">
      ${active.length?`<div class="list">${active.slice(0,5).map(({p,g,h})=>`<div class="li">${projIcon(p)}<div class="t"><a class="title" href="${hrefFor('project',p.id)}">${esc(p.name)}</a><div class="meta">${t('{a}/{b} görev',{a:g.done,b:g.total})}${p.deadline?' · '+t('Teslim')+' '+fDate(parseDay(p.deadline)):''}</div></div>${healthPill(h)}<div class="proj-mini"><div class="bar"><i style="width:${g.pct}%;background:${p.color}"></i></div></div><span class="pct">%${g.pct}</span></div>`).join('')}</div>`
      :emptyState('folder',t('Henüz proje yok'),t('İlk projeni oluştur ve işlerini düzenlemeye başla.'),t('Proje oluştur'),'data-a="newProject"')}
    </div></section>
    <section class="panel c5" aria-labelledby="ov-due"><div class="panel-h"><h2 id="ov-due">${t('Yaklaşan teslimler')}</h2></div><div class="panel-b">
      ${upcoming.length?`<div class="list">${upcoming.map(x=>`<div class="li"><span class="time-col">${relDue(x.due)}</span><div class="t">${taskLink(x)}<div class="meta">${remainingH(x)>0?t('{h} planlanmadı',{h:hrs(remainingH(x))}):t('Tamamen planlı')}</div></div>${prioPill(x.priority)}</div>`).join('')}</div>`:`<p class="muted" style="margin:6px 0 10px">${t('Önümüzdeki 2 haftada teslim yok.')}</p>`}
    </div></section>
  </div>`;
};
