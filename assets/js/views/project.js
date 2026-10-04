/* ================= PROJECT DETAIL  (#/app/projects/:id/:tab) ================= */
const PROJ_TABS=[['overview','Genel bakış'],['tasks','Görevler'],['board','Pano'],['timeline','Zaman çizelgesi'],['calendar','Takvim']];
V.project=()=>{
  const p=projectOf(UI.param);if(!p)return errorState('missing-project');
  const g=projProgress(p),ts=S.tasks.filter(x=>x.projectId===p.id),tab=UI.projTab||'overview',h=projectHealth(p);
  const people=[...new Set(ts.map(x=>x.assignee||'me'))].filter(id=>memberOf(id));
  const dl=p.deadline?parseDay(p.deadline):null,daysLeft=dl?Math.round((+dl-+sod(new Date()))/864e5):null;
  const body={overview:projOverview,tasks:projTasks,board:projBoard,timeline:projTimeline,calendar:projCalendar}[tab]||projOverview;
  return`<a class="btn ghost sm back" href="#/app/projects">${svg('left')}${t('Projeler')}</a>
  <header class="proj-head" style="--pc:${p.color}">
    <div class="proj-head-main"><div class="row" style="gap:10px">${projIcon(p,'lg')}<h1>${esc(p.name)}</h1><span class="pill st-${p.status}">${projStatus(p.status)}</span>${p.archived?`<span class="pill">${t('Arşivde')}</span>`:healthPill(h)}</div>
      ${p.archived?`<div class="callout" style="margin:10px 0 0">${svg('folder','i s')} ${t('Bu proje arşivde. Görevleri korunur ama yeni iş önerilmez.')} <button type="button" class="linkbtn" data-a="restoreProject" data-id="${p.id}">${t('Arşivden çıkar')}</button></div>`:h.k!=='healthy'?`<p class="health-why">${esc(h.why)}</p>`:''}
      <p>${esc(p.desc||t('Açıklama yok'))}</p>
      <div class="proj-meta">
        <div><small>${t('İlerleme')}</small><div class="row" style="gap:10px"><div class="bar" style="width:140px"><i style="width:${g.pct}%;background:${p.color}"></i></div><b>${cu(g.pct,'pct')}</b></div></div>
        <div><small>${t('Teslim')}</small><b class="${daysLeft!==null&&daysLeft<0&&p.status!=='done'?'late':''}">${dl?fDate(dl):'—'}</b>${daysLeft!==null&&p.status!=='done'?`<span class="muted small"> · ${daysLeft<0?t('{n} gün gecikti',{n:-daysLeft}):daysLeft===0?t('Bugün'):t('{n} gün kaldı',{n:daysLeft})}</span>`:''}</div>
        <div><small>${t('Görevler')}</small><b>${g.done} / ${g.total}</b></div>
        <div><small>${t('Görevi olan kişiler')}</small><span class="avatars">${(people.length?people:['me']).map(id=>avatar(id)).join('')}<a class="muted small" href="#/app/team">${t('Ekip')}</a></span></div>
      </div></div>
    <div class="row"><button type="button" class="btn" data-a="editProject" data-id="${p.id}">${t('Düzenle')}</button>${p.archived?'':`<button type="button" class="btn" data-a="planProject" data-id="${p.id}">${svg('spark')}${t('Projeyi planla')}</button><button type="button" class="btn primary" data-a="newTask" data-p="${p.id}">${svg('plus')}${t('Görev')}</button>`}
      <details class="menu"><summary class="btn icon" aria-label="${t('Diğer proje işlemleri')}">⋯</summary><div class="pop right">
        <button type="button" class="pop-item" data-a="newMilestone" data-p="${p.id}">${svg('target')}${t('Kilometre taşı ekle')}</button>
        <button type="button" class="pop-item" data-a="saveProjTpl" data-id="${p.id}">${svg('tasks')}${t('Şablon olarak kaydet')}</button>
        <button type="button" class="pop-item" data-a="${p.archived?'restoreProject':'archiveProject'}" data-id="${p.id}">${svg('folder')}${p.archived?t('Arşivden çıkar'):t('Arşivle')}</button>
        <button type="button" class="pop-item danger" data-a="delProject" data-id="${p.id}">${svg('trash')}${t('Sil')}</button></div></details></div>
  </header>
  <nav class="tabs tabs-scroll" aria-label="${t('Proje bölümleri')}"><span class="tab-ind" data-flip="ind-proj"></span>${PROJ_TABS.map(([k,l])=>`<a class="${tab===k?'on':''}" href="${hrefFor('project',p.id,k)}" ${tab===k?'aria-current="page"':''}>${t(l)}</a>`).join('')}</nav>
  <div class="proj-body">${!ts.length&&tab!=='calendar'?`<div class="panel">${emptyState('check',t('Bu projede görev yok'),t('Projeyi adımlara böl: araştırma, tasarım, geliştirme, test…'),t('Görev ekle'),`data-a="newTask" data-p="${p.id}"`)}</div>`:body(p,ts)}</div>`;
};
function projOverview(p,ts){
  const open=ts.filter(x=>x.status!=='done'),rem=open.reduce((s,x)=>s+effEst(x),0),act=ts.reduce((s,x)=>s+actualH(x),0),un=open.reduce((s,x)=>s+remainingH(x),0);
  const upcoming=open.filter(x=>x.due).sort((a,b)=>new Date(a.due)-new Date(b.due)).slice(0,5);
  const now=Date.now(),blocks=S.blocks.filter(b=>ts.some(x=>x.id===b.taskId)&&+new Date(b.end)>now).sort((a,b)=>new Date(a.start)-new Date(b.start)).slice(0,5);
  return`<div class="kpis k5"><div class="kpi"><div class="l">${t('Kalan iş')}</div><div class="v">${cu(rem)}</div></div><div class="kpi"><div class="l">${t('Takvime yerleşmemiş')}</div><div class="v">${cu(un)}</div></div><div class="kpi"><div class="l">${t('Bu hafta takvimde')}</div><div class="v">${cu(S.blocks.filter(b=>ts.some(x=>x.id===b.taskId)).reduce((s,b)=>s+overlap(+new Date(b.start),+new Date(b.end),+sod(new Date()),+addDays(sod(new Date()),7)),0)/HOUR)}</div></div><div class="kpi"><div class="l">${t('Harcanan süre')}</div><div class="v">${cu(act)}</div></div><div class="kpi"><div class="l">${t('Geciken')}</div><div class="v" style="${open.some(isLate)?'color:var(--danger)':''}">${cu(open.filter(isLate).length,'n')}</div></div></div>
  <div class="grid-dash">
    <section class="panel c6"><div class="panel-h"><h2>${t('Sıradaki teslimler')}</h2></div><div class="panel-b">${upcoming.length?`<div class="list">${upcoming.map(x=>taskRow(x,{compact:true})).join('')}</div>`:`<p class="muted">${t('Teslim tarihi olan açık görev yok.')}</p>`}</div></section>
    <section class="panel c6"><div class="panel-h"><h2>${t('Yaklaşan odak blokları')}</h2></div><div class="panel-b">${blocks.length?`<div class="list">${blocks.map(b=>agendaRow({k:'bl',x:b})).join('')}</div>`:`<p class="muted">${t('Planlanmış blok yok.')} <button type="button" class="linkbtn" data-a="planProject" data-id="${p.id}">${t('Plan öner')}</button></p>`}</div></section>
    <section class="panel c6"><div class="panel-h"><h2>${t('Kilometre taşları')}</h2><button type="button" class="btn sm ghost" data-a="newMilestone" data-p="${p.id}">${svg('plus')}${t('Ekle')}</button></div><div class="panel-b">${(()=>{const ms=S.events.filter(e=>e.type==='milestone'&&e.projectId===p.id).sort((a,b)=>a.start.localeCompare(b.start));return ms.length?`<ul class="milestones">${ms.map(m=>`<li class="${+new Date(m.start)<now?'past':''}"><span class="ms-dot" aria-hidden="true">◆</span><button type="button" class="linkbtn plain" data-a="editEvent" data-id="${m.id}">${esc(m.title)}</button><small>${fDT(m.start)}</small></li>`).join('')}</ul>`:`<p class="muted">${t('Kilometre taşı yok. Önemli ara teslimleri ekleyerek takvimde görünür yap.')}</p>`})()}</div></section>
    <section class="panel c6"><div class="panel-h"><h2>${t('Son etkinlik')}</h2></div><div class="panel-b">${(()=>{const ids=new Set([p.id,...ts.map(x=>x.id)]);const acts=S.activity.filter(a=>ids.has(a.entityId)).slice(-8).reverse();return acts.length?`<ul class="acts">${acts.map(a=>activityRow(a)).join('')}</ul>`:`<p class="muted">${t('Henüz kayıtlı değişiklik yok.')}</p>`})()}</div></section>
    <section class="panel c12"><div class="panel-h"><h2>${t('Durum dağılımı')}</h2></div><div class="panel-b">${ENUM.status.map(k=>{const n=ts.filter(x=>x.status===k).length;return`<div class="hbar"><span class="n">${ST(k)}</span><div class="bar"><i style="width:${ts.length?n/ts.length*100:0}%;background:${k==='done'?'var(--ok)':k==='blocked'?'var(--danger)':'var(--ink)'}"></i></div><span class="v">${n}</span></div>`}).join('')}</div></section>
  </div>`;
}
function projTasks(p,ts){return`<div class="panel tasks-table"><div class="list">${sortTasks(ts).map(x=>taskRow(x)).join('')}</div></div>`}
function projBoard(p,ts){
  const cur=ENUM.status.includes(UI.boardCol)?UI.boardCol:'todo';
  return`<p class="muted small hide-sm" style="margin:0 0 10px">${t('Kartları sütunlar arasında sürükle ya da her kartın durum menüsünü kullan.')}</p>
  <div class="board-tabs" role="tablist" aria-label="${t('Pano sütunları')}">${ENUM.status.map(k=>`<button type="button" role="tab" aria-selected="${k===cur}" class="${k===cur?'on':''}" data-a="boardCol" data-v="${k}">${ST(k)} <span>${ts.filter(x=>x.status===k).length}</span></button>`).join('')}</div>
  <div class="board">${ENUM.status.map(k=>{const c=ts.filter(x=>x.status===k);return`<div class="col ${k===cur?'m-on':''}" data-status="${k}" aria-label="${ST(k)}"><h2 class="col-h">${ST(k)}<span>${c.length}</span></h2>${c.length?'':`<p class="col-empty">${t('Boş')}</p>`}${c.map(x=>`<div class="card" draggable="true" data-drag="${x.id}" data-flip="c-${x.id}">${taskLink(x)}<div class="card-meta">${prioPill(x.priority)}${x.estimate?`<span>${hrs(+x.estimate)}</span>`:''}${x.due?`<span class="${isLate(x)?'late':''}">${relDue(x.due)}</span>`:''}${x.assignee?avatar(x.assignee):''}</div><label class="sr" for="s-${x.id}">${t('Durum')}</label><select id="s-${x.id}" data-c="status" data-id="${x.id}">${ENUM.status.map(sk=>`<option value="${sk}" ${sk===x.status?'selected':''}>${ST(sk)}</option>`).join('')}</select></div>`).join('')}</div>`}).join('')}</div>`;
}
/* Timeline: each task is a bar from its first activity (first block or creation)
   to its deadline; blocks are ticks, the project deadline and today are lines. */
function projTimeline(p,ts){
  const today=+sod(new Date());
  const rows=ts.map(x=>{const bl=blocksOf(x.id).map(b=>[+new Date(b.start),+new Date(b.end)]);const first=bl.length?Math.min(...bl.map(b=>b[0])):+parseDay(x.createdAt);const end=x.due?+new Date(x.due):(bl.length?Math.max(...bl.map(b=>b[1])):null);return{x,bl,a:Math.min(first,end??first),b:end}});
  const dated=rows.filter(r=>r.b!=null),undated=rows.filter(r=>r.b==null);
  const pts=[today,...dated.flatMap(r=>[r.a,r.b]),p.deadline?+parseDay(p.deadline)+864e5:null,p.start?+parseDay(p.start):null].filter(v=>v!=null);
  const lo=+sod(Math.min(...pts))-864e5,hi=+sod(Math.max(...pts))+2*864e5,span=hi-lo,pos=v=>((v-lo)/span*100).toFixed(3)+'%';
  const days=Math.round(span/864e5),step=days>60?14:days>21?7:1,ticks=[];for(let d=lo;d<=hi;d+=step*864e5)ticks.push(d);
  return`<div class="panel timeline"><div class="tl-scroll"><div class="tl-inner" style="min-width:${Math.max(640,days*28)}px">
    <div class="tl-axis">${ticks.map(d=>`<span style="left:${pos(d)}">${fDate(d)}</span>`).join('')}</div>
    <div class="tl-rows">
      <span class="tl-today" style="left:${pos(Date.now())}" title="${t('Bugün')}"></span>
      ${p.deadline?`<span class="tl-deadline" style="left:${pos(dayEnd(parseDay(p.deadline)))}"><b>${t('Proje teslimi')}</b></span>`:''}
      ${dated.sort((a,b)=>a.b-b.b).map(r=>`<div class="tl-row"><div class="tl-label">${taskLink(r.x,'plain')}</div><div class="tl-track"><span class="tl-bar ${r.x.status==='done'?'done':''} ${isLate(r.x)?'late':''}" style="left:${pos(r.a)};width:calc(${pos(r.b)} - ${pos(r.a)});--pc:${p.color}"></span>${r.bl.map(([a,b])=>`<span class="tl-block" style="left:${pos(a)};width:max(3px,calc(${pos(b)} - ${pos(a)}))"></span>`).join('')}<span class="tl-due" style="left:${pos(r.b)}" title="${t('Teslim')}: ${fDT(r.b)}"></span></div></div>`).join('')}
    </div></div></div>
    <div class="legend tl-legend"><span><i style="background:${p.color}"></i>${t('Görev süresi')}</span><span><i style="background:var(--ink)"></i>${t('Odak bloğu')}</span><span><i style="background:var(--accent)"></i>${t('Bugün')}</span><span><i style="background:var(--danger)"></i>${t('Teslim')}</span></div>
    ${undated.length?`<p class="muted small" style="padding:0 18px 14px">${t('Teslim tarihi olmayan {n} görev çizelgede gösterilmiyor.',{n:undated.length})}</p>`:''}</div>`;
}
function projCalendar(p,ts){
  const ids=new Set(ts.map(x=>x.id)),start=sod(new Date());
  const days=[...Array(14)].map((_,i)=>addDays(start,i)).map(d=>{const s=+d,e=s+864e5;
    const items=[...S.blocks.filter(b=>ids.has(b.taskId)).map(b=>({k:'bl',x:b})),...S.events.filter(ev=>ev.projectId===p.id).map(ev=>({k:'ev',x:ev}))].filter(({x})=>overlap(+new Date(x.start),+new Date(x.end),s,e)>0).sort((a,b)=>new Date(a.x.start)-new Date(b.x.start));
    const dues=ts.filter(x=>x.due&&x.status!=='done'&&+new Date(x.due)>=s&&+new Date(x.due)<e);
    return{d,items,dues}}).filter(r=>r.items.length||r.dues.length||(p.deadline&&dayKey(r.d)===p.deadline));
  if(!days.length)return`<div class="panel">${emptyState('cal',t('Önümüzdeki 14 günde bu proje için bir şey yok'),t('Görevleri planlayarak odak blokları oluşturabilirsin.'),null,'',`<button type="button" class="btn primary" data-a="planProject" data-id="${p.id}">${svg('spark')}${t('Projeyi planla')}</button>`)}</div>`;
  return`<div class="panel"><div class="panel-b" style="padding-top:12px">${days.map(({d,items,dues})=>`<div class="agenda-day"><h3>${dayName(d.getDay())}, ${fDate(d)}${p.deadline&&dayKey(d)===p.deadline?` <span class="pill pr-urgent">${t('Proje teslimi')}</span>`:''}</h3><div class="list">${items.map(agendaRow).join('')}${dues.map(x=>`<div class="li"><span class="tl-kind" style="background:var(--danger)"></span><span class="time-col">${fTime(x.due)}</span><div class="t">${taskLink(x)}<div class="meta"><span class="late">${t('Teslim')}</span></div></div></div>`).join('')}</div></div>`).join('')}</div></div>`;
}
