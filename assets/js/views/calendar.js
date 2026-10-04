/* ================= CALENDAR  (#/app/calendar/:mode?d=YYYY-MM-DD) =================
   Layout: sticky toolbar · optional side panel (mini month + unplanned tasks to drag in) · view.
   Views: day / week (time grid) · month (load heat map) · agenda (list with free-time gaps).
   Visual language: soft cards tinted with the project / event colour and a left stripe;
   dashed = suggestion awaiting approval · red outline + ⚠ = conflict · red flag line = deadline. */
const CAL_LABEL={day:'Gün',week:'Hafta',month:'Ay',agenda:'Ajanda'};
const EV_IC={meeting:'users',focus:'target',personal:'heart',milestone:'flag'};
const calSideOn=()=>calPref('side',innerWidth>=1200?'1':'0')==='1';

V.calendar=()=>{
  const mode=UI.calMode,date=UI.calDate,r=calRange(mode,date),draft=UI.draft?UI.draft.blocks:null;
  if(mode==='day'||mode==='week')calGeom(r.days);
  const label=mode==='day'?`${dayName(date.getDay())}, ${date.toLocaleDateString(LOC(),{day:'numeric',month:'long',year:'numeric'})}`:mode==='month'?date.toLocaleDateString(LOC(),{month:'long',year:'numeric'}):`${fDate(r.from)} – ${fDate(addDays(r.to,-1))} ${addDays(r.to,-1).getFullYear()}`;
  const prevL={day:'Önceki gün',week:'Önceki hafta',month:'Önceki ay',agenda:'Önceki iki hafta'}[mode],nextL={day:'Sonraki gün',week:'Sonraki hafta',month:'Sonraki ay',agenda:'Sonraki iki hafta'}[mode],todayL={day:'Bugün',week:'Bu hafta',month:'Bu ay',agenda:'Bugün'}[mode];
  const empty=!rangeHasItems(r.from,r.to)&&!draft;
  const pairs=mode==='month'?[]:conflictPairs(r.from,r.to),conf=new Set(pairs.flat().map(x=>x.id));
  const mobileList=isMobile()&&(mode==='day'||mode==='week')&&UI.calList;
  const grid=mode==='day'||mode==='week',side=grid&&!isMobile()&&calSideOn();
  const pick=([a,b])=>b.kind==='bl'?b:a.kind==='bl'?a:b;
  const dr=UI.draft,drDone=dr?(dr._acc||0)+(dr._rej||0):0,drTotal=dr?dr.blocks.length+drDone:0;
  const opt=(k,v,l)=>`<button type="button" class="${calPref(k,k==='density'?'comfortable':'')===v?'on':''}" data-a="calPref" data-k="${k}" data-v="${v}" aria-pressed="${calPref(k,k==='density'?'comfortable':'')===v}">${t(l)}</button>`;
  const sw=(k,def,l)=>`<label class="switch sm"><input type="checkbox" data-c="calPref" data-k="${k}" ${calPref(k,def)==='1'?'checked':''}><span>${t(l)}</span></label>`;
  return`<div class="page-h cal-h cal-toolbar">
    <div class="cal-tb-l">
      ${grid&&!isMobile()?`<button type="button" class="btn icon ghost" data-a="calSide" aria-pressed="${side}" aria-label="${side?t('Kenar panelini gizle'):t('Kenar panelini göster')}" title="${side?t('Kenar panelini gizle'):t('Kenar panelini göster')}">${svg('panel')}</button>`:''}
      <button type="button" class="btn sm" data-a="calNav" data-v="0">${t(todayL)}</button>
      <span class="cal-arrows"><button type="button" class="btn icon ghost" data-a="calNav" data-v="-1" aria-label="${t(prevL)}">${svg('left')}</button><button type="button" class="btn icon ghost" data-a="calNav" data-v="1" aria-label="${t(nextL)}">${svg('right')}</button></span>
      <h1 class="cal-title"><span class="sr">${t('Takvim')}: </span>${esc(label)}</h1>
    </div>
    <div class="cal-tb-r">
      ${dr?`<button type="button" class="pill acc dr-pill" data-a="go" data-v="planning" title="${t('Onay bekleyen öneri')}">${svg('spark','i s')} ${t('{n} öneri',{n:dr.blocks.length})}</button>`:''}
      <nav class="segctl" aria-label="${t('Takvim görünümü')}">${CAL_MODES.map(m=>`<a class="${mode===m?'on':''}" href="${hrefFor('calendar',dayKey(date),m)}" ${mode===m?'aria-current="true"':''}>${t(CAL_LABEL[m])}</a>`).join('')}</nav>
      <div class="cal-opts-w"><button type="button" class="btn icon" data-a="calOpts" aria-expanded="${!!UI.calOpts}" aria-controls="calopts" aria-label="${t('Görünüm seçenekleri')}" title="${t('Görünüm seçenekleri')}">${svg('sliders')}</button>
        <div class="pop right cal-opts" id="calopts" ${UI.calOpts?'':'hidden'} role="group" aria-label="${t('Görünüm seçenekleri')}">
          <div class="pop-h">${t('Yoğunluk')}</div><div class="segbtns">${opt('density','compact','Kompakt')}${opt('density','comfortable','Rahat')}${opt('density','spacious','Geniş')}</div>
          ${sw('weekend','1','Hafta sonunu göster')}${sw('compress','0','Mesai dışını daralt')}${isMobile()?'':sw('side',innerWidth>=1200?'1':'0','Kenar paneli')}
          <div class="pop-sep"></div>
          <label class="pop-item" style="cursor:pointer">${svg('upload')}<span>${t('.ics içe aktar')}</span><input type="file" accept=".ics,text/calendar" data-c="ics" hidden></label>
        </div></div>
      <button type="button" class="btn primary" data-a="newEvent" aria-label="${t('Yeni etkinlik')}">${svg('plus')}<span class="hide-sm">${t('Etkinlik')}</span></button>
    </div></div>
  ${dr?`<div class="callout draft-bar">${svg('spark')}<span>${drDone?t('{a} / {b} öneri işlendi. Kalanları tek tek onayla ya da hepsini uygula.',{a:drDone,b:drTotal}):t('Kesikli çerçeveli bloklar onay bekleyen plan önerisidir. Üzerine gelip ✓ ile tek tek onaylayabilir ya da hepsini uygulayabilirsin. Henüz takvime eklenmedi.')}</span>${drTotal?`<span class="dr-prog" aria-hidden="true"><i style="width:${(drDone/Math.max(1,drTotal)*100).toFixed(0)}%"></i></span>`:''}<button type="button" class="btn sm primary" data-a="applyDraft">${drDone?t('Kalanları uygula'):t('Planı uygula')}</button><button type="button" class="btn sm" data-a="cancelDraft">${t('İptal')}</button></div>`:''}
  ${pairs.length?`<div class="callout warn conflict-bar" role="status">${svg('alert','i s')}<div><b>${t('Takvim çakışması tespit edildi')}</b> <span class="muted">(${pairs.length})</span><br><span>${t('Bu zaman diliminde iki plan çakışıyor. Birini taşı, böl ya da olduğu gibi bırak.')}</span><ul>${pairs.slice(0,3).map(pr=>{const [a,b]=pr,it=pick(pr);return`<li><span>${fTime(a.a)}–${fTime(a.b)} ${esc(a.label)}</span> <span class="muted">↔</span> <span>${fTime(b.a)}–${fTime(b.b)} ${esc(b.label)}</span> <span class="muted">· ${dayName(new Date(b.a).getDay(),true)}</span> <button type="button" class="btn sm" data-a="resolve" data-kind="${it.kind}" data-id="${it.id}">${t('Çöz')}</button></li>`}).join('')}</ul>${pairs.length>3?`<small>${t('+{n} çakışma daha',{n:pairs.length-3})}</small>`:''}</div></div>`:''}
  <div class="legend cal-legend">
    <span><i class="lg-meeting"></i>${t('Toplantı')}</span><span><i class="lg-focus"></i>${t('Odak bloğu (görev)')}</span><span><i class="lg-personal"></i>${t('Kişisel zaman')}</span><span><i class="lg-draft"></i>${t('Öneri')}</span><span><i class="lg-deadline"></i>${t('Teslim')}</span><span><i class="lg-milestone"></i>${t('Kilometre taşı')}</span><span><i class="lg-conflict"></i>${t('Çakışma')}</span>
    ${isMobile()&&grid?`<button type="button" class="btn sm ghost" data-a="calList" data-v="${UI.calList?'0':'1'}" aria-pressed="${!UI.calList}">${UI.calList?t('Saat ızgarası'):t('Liste görünümü')}</button>`:''}
  </div>
  <div class="cal-layout ${side?'with-side':''}">
    ${side?calSide(r,date,mode):''}
    <div class="cal-main">${mode==='month'?calMonth(r):mode==='agenda'?calAgendaView(r,conf):mobileList?calAgenda(r,mode,date,conf):calGrid(r.days,draft,conf,empty)}</div>
  </div>`;
};

/* ---------- Side panel: mini month + unplanned work (drag onto the grid, or "Planla") ---------- */
function calSide(r,date,mode){
  const mm=UI.miniMonth||new Date(date.getFullYear(),date.getMonth(),1),start=startOfWeek(new Date(mm.getFullYear(),mm.getMonth(),1)),today=dayKey(new Date()),from=+r.from,to=+r.to;
  const cells=[...Array(42)].map((_,i)=>{const d=addDays(start,i),k=dayKey(d),c=dayCapacity(d),inR=+d>=from&&+d<to,lv=c.over?'over':c.planned>0?(c.available&&c.planned/c.available>.6?'hi':'lo'):'';
    return`<a class="${d.getMonth()!==mm.getMonth()?'out':''} ${k===today?'today':''} ${inR?'inr':''}" href="${hrefFor('calendar',k,mode)}" aria-label="${dayName(d.getDay())} ${fDate(d)}" ${k===dayKey(date)&&mode==='day'?'aria-current="date"':''}>${d.getDate()}${lv?`<i class="${lv}" aria-hidden="true"></i>`:''}</a>`}).join('');
  const todo=myOpen().filter(x=>remainingH(x)>0).sort((a,b)=>(a.due||'9999').localeCompare(b.due||'9999')).slice(0,12);
  return`<aside class="cal-side" aria-label="${t('Takvim kenar paneli')}">
    <section class="panel mini-cal"><div class="mini-h"><b>${mm.toLocaleDateString(LOC(),{month:'long',year:'numeric'})}</b><span><button type="button" class="btn icon ghost sm" data-a="miniNav" data-v="-1" aria-label="${t('Önceki ay')}">${svg('left')}</button><button type="button" class="btn icon ghost sm" data-a="miniNav" data-v="1" aria-label="${t('Sonraki ay')}">${svg('right')}</button></span></div>
      <div class="mini-dn" aria-hidden="true">${[1,2,3,4,5,6,0].map(i=>`<span>${dayName(i,true).slice(0,2)}</span>`).join('')}</div><div class="mini-grid">${cells}</div></section>
    <section class="panel side-tasks"><div class="panel-h"><h2>${t('Planlanmamış iş')}</h2>${todo.length?`<button type="button" class="btn sm icon ghost" data-a="planAll" aria-label="${t('Hepsini planla')}" title="${t('Hepsini planla')}">${svg('spark')}</button>`:''}</div>
      <div class="panel-b">${todo.length?`<p class="hint side-hint">${svg('arrow','i s')} ${t('Bir görevi takvimde boş bir saate sürükle.')}</p><ul class="drag-list">${todo.map(x=>{const p=projectOf(x.projectId);return`<li class="dtask" draggable="true" data-task="${x.id}" style="--c:${p?p.color:'var(--accent)'}"><span class="grip" aria-hidden="true">⋮⋮</span><div class="t"><a class="title" href="${hrefFor('task',x.id)}">${esc(x.title)}</a><div class="meta"><span>${hrs(remainingH(x))} ${t('kaldı')}</span>${x.due?`<span class="${isLate(x)?'late':''}">${relDue(x.due)}</span>`:''}</div></div><button type="button" class="btn sm icon ghost" data-a="planOne" data-id="${x.id}" aria-label="${t('Planla')}: ${esc(x.title)}" title="${t('Planla')}">${svg('spark')}</button></li>`}).join('')}</ul>`
      :`<div class="side-empty">${illo('party')}<p>${t('Süresi olan tüm işler takvimde.')}</p></div>`}</div></section>
  </aside>`;
}

/* ---------- Time grid (day / week) ---------- */
function calGrid(days,draft,conf=new Set(),empty=false){
  const st=S.settings,today=dayKey(new Date()),now=new Date(),H=CAL_E-CAL_S,nowH=now.getHours()+now.getMinutes()/60;
  const nowIn=days.some(d=>dayKey(d)===today)&&nowH>=CAL_S&&nowH<CAL_E;
  const col=d=>{
    const items=calItems(d,draft),marks=calMarkers(d),isT=dayKey(d)===today;
    const nl=isT&&nowIn?`<div class="now-line" style="top:${(nowH-CAL_S)*PX}px"></div>`:'';
    return`<div class="cal-day ${isWorkDay(d)?'':'off'} ${isT?'is-today':''}" role="group" data-a="calSlot" data-day="${dayKey(d)}" style="height:${H*PX}px;--px:${PX}px" aria-label="${dayName(d.getDay())} — ${t('boş alana tıklayarak ya da sürükleyerek etkinlik ekle')}">${isWorkDay(d)?`<div class="wh" style="top:${(st.workStart-CAL_S)*PX}px;height:${(st.workEnd-st.workStart)*PX}px"></div>`:''}${nl}
    ${items.map(it=>evCard(it,conf)).join('')}
    ${marks.map(m=>{const d2=new Date(m.at),top=Math.min(H*PX-2,Math.max(0,(d2.getHours()+d2.getMinutes()/60-CAL_S)*PX));
      const act=m.task?`href="${hrefFor('task',m.task.id)}"`:m.project?`href="${hrefFor('project',m.project.id)}"`:'';
      const tag=m.event?'button type="button"':'a';
      return`<${tag} class="mark mark-${m.kind}" style="top:${top}px" ${m.event?`data-a="editEvent" data-id="${m.event.id}"`:act} title="${esc((m.kind==='deadline'?t('Teslim')+': ':m.kind==='project'?t('Proje teslimi')+': ':t('Kilometre taşı')+': ')+m.label)}"><span>${m.kind==='milestone'?'◆':'⚑'} ${esc(m.label)}</span></${m.event?'button':'a'}>`}).join('')}
    </div>`;
  };
  const one=days.length===1;
  const head=d=>{const c=dayCapacity(d,draft||[]),l=c.planned,k=dayKey(d),ratio=c.available?l/c.available:0;
    return`<div class="${k===today?'today':''} ${isWorkDay(d)?'':'off'}"><a class="cal-dn" href="${hrefFor('calendar',k,'day')}" aria-label="${dayName(d.getDay())} ${fDate(d)}"><small>${dayName(d.getDay(),true)}</small><b>${d.getDate()}</b></a>
      <span class="load ${c.over?'over':''}" title="${t('Planlı / müsait')}">${c.work?`${ring(Math.min(1,ratio),t('Doluluk'),'mini '+(c.over?'over':ratio===0?'free':''))}<span>${num(l)} / ${hrs(c.available)}</span>`:`<span>${l?hrs(l):'—'}</span>`}</span></div>`};
  return`<div class="panel cal ${one?'cal-one':''}"><div class="cal-inner">
    <div class="cal-head" style="--cols:${days.length}"><div class="cal-gmt" aria-hidden="true"></div>${days.map(head).join('')}</div>
    <div class="cal-body" style="--cols:${days.length};--px:${PX}px"><div class="cal-times">${[...Array(H)].map((_,i)=>`<div style="height:${PX}px">${i?pad(CAL_S+i)+':00':''}</div>`).join('')}${nowIn?`<b class="now-tag" style="top:${(nowH-CAL_S)*PX}px">${fTime(now)}</b>`:''}</div>${days.map(col).join('')}
    ${empty?`<div class="cal-empty-ov" style="padding-top:${Math.max(16,(st.workStart-CAL_S)*PX+16)}px"><div class="card-e">${illo('cal')}<h3>${one?t('Bu gün boş'):t('Bu hafta boş')}</h3><p>${t('Görevlerini boş saatlere yerleştirmemizi iste ya da bir etkinlik ekle.')}</p><div class="row" style="justify-content:center"><button type="button" class="btn primary" data-a="planAll" ${myOpen().some(x=>remainingH(x)>0)?'':'disabled'}>${svg('spark')}${t('Haftayı planla')}</button><button type="button" class="btn" data-a="newEvent">${svg('plus')}${t('Etkinlik ekle')}</button></div></div></div>`:''}</div>
  </div></div>`;
}
/* One timed item as a soft card. The first <span> is the time line (the drag code updates it live). */
function evCard(it,conf){
  const x=it.x,sd=new Date(it.a),top=Math.max(0,(sd.getHours()+sd.getMinutes()/60-CAL_S)*PX),h=Math.max(18,(it.b-it.a)/HOUR*PX-2),w=100/it.lanes;
  let title,c,sub,ic,cls,proj='';
  if(it.k==='ev'){title=x.title;c=EVT_C[x.type]||'#888';sub=EV(x.type);ic=EV_IC[x.type]||'cal';cls='ev-'+x.type}
  else{const tk=taskOf(x.taskId),p=tk&&projectOf(tk.projectId);title=tk?tk.title:'—';c=p?p.color:'#6366f1';sub=it.k==='dr'?t('Öneri'):t('Odak bloğu');ic=it.k==='dr'?'spark':(p&&p.icon)||'target';cls='block';proj=p?p.name:''}
  const cf=conf.has(x.id),dl=dur((it.b-it.a)/HOUR),size=h<30?'short':h<58?'mid':'tall';
  const tip=it.k==='dr'?title+'\n'+whyList(x.why).map(r=>'• '+r).join('\n'):title;
  return`<button type="button" class="ev ${cls} ${it.k==='dr'?'draft':''} ${size} ${cf?'conflict':''}" data-kind="${it.k}" data-id="${x.id}" data-flip="e-${x.id}" data-a="evPop" title="${esc(tip)}" style="top:${top}px;height:${h}px;left:calc(${it.lane*w}% + 2px);width:calc(${w}% - 4px);--c:${c}" aria-label="${esc(title)}, ${fTime(x.start)}–${fTime(x.end)}, ${esc(sub)}${cf?', '+t('Çakışma'):''}">
    <i class="ev-ic" aria-hidden="true">${svg(ic,'i s')}</i><b>${esc(title)}</b><span class="ev-t">${fTime(x.start)}–${fTime(x.end)}</span>${size==='tall'?`<small class="ev-sub">${esc(proj||sub)} · ${dl}</small>`:''}${cf?`<em class="cf-badge" aria-hidden="true">⚠</em>`:''}${it.k!=='dr'?'<span class="rs" aria-hidden="true"></span>':''}</button>`;
}

/* ---------- Month: load heat map ---------- */
function calMonth(r){
  const today=dayKey(new Date());
  const evIdx=memo('evByDay',()=>{const m=new Map();S.events.forEach(x=>{for(let d=sod(x.start);+d<Math.max(+new Date(x.end),+new Date(x.start)+1);d=addDays(d,1)){const k=dayKey(d),a=m.get(k);if(a)a.push(x);else m.set(k,[x])}});m.forEach(a=>a.sort((p,q)=>p.start.localeCompare(q.start)));return m});
  const cell=d=>{
    const s=+d,e=dayEnd(d),key=dayKey(d),inMonth=d.getMonth()===r.month;
    const evs=evIdx.get(key)||[];
    const byTask=new Map();S.blocks.forEach(b=>{if(overlap(+new Date(b.start),+new Date(b.end),s,e)>0)byTask.set(b.taskId,(byTask.get(b.taskId)||0)+(new Date(b.end)-new Date(b.start))/HOUR)});
    const chips=[...calMarkers(d).map(m=>`<span class="mchip m-${m.kind}">${m.kind==='milestone'?'◆':'⚑'} ${esc(m.label)}</span>`),
      ...evs.filter(x=>x.type!=='milestone').map(x=>`<span class="mchip" style="--c:${EVT_C[x.type]}"><i></i>${fTime(x.start)} ${esc(x.title)}</span>`),
      ...[...byTask].map(([id,h])=>{const tk=taskOf(id),p=tk&&projectOf(tk.projectId);return`<span class="mchip focus" style="--c:${p?p.color:'var(--accent)'}"><i></i>${esc(tk?tk.title:'—')} · ${hrs(h)}</span>`})];
    const cc=dayCapacity(d),l=cc.planned,over=cc.over&&cc.work,heat=cc.work&&cc.available?Math.min(1,l/cc.available):l?.5:0;
    return`<a class="mcell ${inMonth?'':'out'} ${key===today?'today':''} ${isWorkDay(d)?'':'off'} ${over?'hot':''}" style="--heat:${heat.toFixed(2)}" href="${hrefFor('calendar',key,'day')}" aria-label="${dayName(d.getDay())} ${fDate(d)}${l?' — '+hrs(l)+' '+t('planlı'):''}${chips.length?' — '+t('{n} öğe',{n:chips.length}):''}">
      <span class="mtop"><span class="mnum">${d.getDate()}</span>${l?`<span class="mload ${over?'over':''}">${hrs(l)}</span>`:''}</span>
      <span class="mchips ${chips.length>3?'has-more':''}">${chips.join('')}${chips.length>3?`<span class="mmore">+${chips.length-3} ${t('daha')}</span>`:''}</span></a>`;
  };
  return`<div class="panel month"><div class="mhead">${[1,2,3,4,5,6,0].map(i=>`<span>${dayName(i,true)}</span>`).join('')}</div><div class="mgrid">${r.days.map(cell).join('')}</div>
    <div class="mlegend" aria-hidden="true"><span>${t('Doluluk')}</span><i style="--heat:.1"></i><i style="--heat:.4"></i><i style="--heat:.7"></i><i style="--heat:1"></i><i class="hot"></i><span>${t('Aşırı')}</span></div></div>`;
}

/* ---------- Agenda: grouped by day, free working time shown as "plan here" cards ---------- */
function freeGaps(d){
  const st=S.settings;if(!isWorkDay(d))return[];
  let a=+sod(d)+st.workStart*HOUR;const e=+sod(d)+st.workEnd*HOUR,now=Date.now();if(e<=now)return[];a=Math.max(a,Math.ceil(now/(15*60e3))*15*60e3);
  const busy=[...S.events.filter(x=>x.type!=='milestone'&&x.type!=='personal'),...S.blocks].map(x=>[+new Date(x.start),+new Date(x.end)]).filter(([x,y])=>y>a&&x<e).sort((p,q)=>p[0]-q[0]);
  const out=[];let cur=a;busy.forEach(([x,y])=>{if(x-cur>=HOUR)out.push([cur,x]);cur=Math.max(cur,y)});if(e-cur>=HOUR)out.push([cur,e]);return out;
}
function calAgendaView(r,conf){
  const today=dayKey(new Date()),canPlan=myOpen().some(x=>remainingH(x)>0);
  const day=d=>{
    const c=dayCapacity(d),items=agendaFor(d),marks=calMarkers(d).filter(m=>m.kind!=='milestone'),gaps=freeGaps(d),k=dayKey(d);
    const rows=[...items.map(i=>({at:+new Date(i.x.start),html:agendaRow(i).replace(/class="li/,`class="li ${conf.has(i.x.id)?'conflict':''}`)})),
      ...marks.map(m=>({at:m.at,html:`<div class="li"><span class="tl-kind" style="background:var(--danger)"></span><span class="time-col">${fTime(m.at)}</span><div class="t">${m.task?taskLink(m.task):`<a class="title" href="${hrefFor('project',m.project.id)}">${esc(m.label)}</a>`}<div class="meta"><span class="late">⚑ ${m.kind==='project'?t('Proje teslimi'):t('Teslim')}</span></div></div></div>`})),
      ...gaps.map(([a,b])=>({at:a,html:`<div class="li gap"><span class="time-col">${fTime(a)} – ${fTime(b)}</span><div class="t"><b>${t('Boş {h}',{h:hrs((b-a)/HOUR)})}</b><div class="meta"><span>${t('Odaklanmak için uygun zaman')}</span></div></div>${canPlan?`<button type="button" class="btn sm" data-a="planAll">${svg('spark')}${t('Planla')}</button>`:''}</div>`}))].sort((a,b)=>a.at-b.at);
    return`<section class="agenda-day ${k===today?'is-today':''}" aria-labelledby="ad-${k}"><header class="ad-h"><div class="ad-date"><b>${d.getDate()}</b><span><span id="ad-${k}">${dayName(d.getDay())}</span><small>${d.toLocaleDateString(LOC(),{month:'long'})}${k===today?` · <em>${t('Bugün')}</em>`:''}</small></span></div>
      <span class="ad-cap ${c.over?'late':''}">${c.work?ring(c.available?Math.min(1,c.planned/c.available):0,t('Doluluk'),'mini '+(c.over?'over':'')):''}${capLabel(c)}</span></header>
      ${rows.length?`<div class="list">${rows.map(x=>x.html).join('')}</div>`:`<p class="muted small ad-none">${c.work?t('Plan yok'):t('İzin günü')}</p>`}</section>`;
  };
  return`<div class="agenda-wrap">${r.days.map(day).join('')}</div>`;
}

/* Clicking a focus block explains the whole chain: task → block → deadline. (Also used outside the calendar.) */
function openBlockInfo(id){
  const b=S.blocks.find(x=>x.id===id);if(!b)return;const x=taskOf(b.taskId),p=x&&projectOf(x.projectId);
  const dur=(new Date(b.end)-new Date(b.start))/HOUR,fit=x?deadlineFit(x):null;
  openDlg(`<form>${dlgHead(t('Odak bloğu'))}<div class="dlg-b">
    <p class="block-when">${dayName(new Date(b.start).getDay())}, ${fDate(b.start)} · <b>${fTime(b.start)}–${fTime(b.end)}</b> <span class="muted">(${hrs(dur)})</span></p>
    ${x?`<dl class="kvs">
      <div class="kv"><dt>${t('Görev')}</dt><dd>${taskLink(x,'plain')}</dd></div>
      <div class="kv"><dt>${t('Proje')}</dt><dd>${p?projLink(p):t('Projesiz')}</dd></div>
      <div class="kv"><dt>${t('Planlanan')}</dt><dd>${t('{a} / {b} planlı',{a:hrs(scheduledH(x)),b:hrs(effEst(x))})} · ${t('{n} blok toplam',{n:blocksOf(x.id).length})}</dd></div>
      <div class="kv"><dt>${t('Teslim')}</dt><dd>${x.due?`${relDue(x.due)} <span class="pill ${fit.cls==='ok'?'st-done':fit.cls==='late'?'pr-urgent':'pr-high'}">${fit.text}</span>`:'—'}</dd></div>
      <div class="kv"><dt>${t('Gerçekleşen')}</dt><dd>${dur(actualH(x))}</dd></div></dl>${conflictsWith(+new Date(b.start),+new Date(b.end),b.id).length?`<p class="callout warn">${svg('alert','i s')} ${t('Bu blok başka bir öğeyle çakışıyor.')} <button type="button" class="linkbtn" data-a="resolve" data-kind="bl" data-id="${b.id}">${t('Çöz')}</button></p>`:''}`:`<p class="muted">${t('Bu bloğun görevi silinmiş.')}</p>`}
    </div><div class="dlg-f"><button type="button" class="btn danger left" data-a="delBlock" data-id="${b.id}">${t('Bloğu kaldır')}</button><button type="button" class="btn" data-a="editBlock" data-id="${b.id}">${t('Zamanı değiştir')}</button>${x&&x.status!=='done'?`<button type="button" class="btn" data-a="timerStart" data-id="${x.id}">${svg('play')}${t('Başlat')}</button>`:''}${x?`<a class="btn primary" href="${hrefFor('task',x.id)}">${t('Görevi aç')}</a>`:''}</div></form>`,()=>{});
}

/* Mobile: a day strip + an agenda list instead of a shrunken time grid. The week
   mode lists all seven days; the grid is one tap away ("Saat ızgarası"). */
function calAgenda(r,mode,date,conf){
  const today=dayKey(new Date()),sel=dayKey(date),ws=startOfWeek(date);
  const strip=`<nav class="day-strip" aria-label="${t('Günler')}">${[...Array(7)].map((_,i)=>addDays(ws,i)).map(d=>{const c=dayCapacity(d),k=dayKey(d);return`<a class="${k===sel&&mode==='day'?'on':''} ${k===today?'today':''} ${c.work?'':'off'}" href="${hrefFor('calendar',k,'day')}" ${k===sel&&mode==='day'?'aria-current="date"':''}><small>${dayName(d.getDay(),true)}</small><b>${d.getDate()}</b><i class="${c.over?'over':c.planned?'has':''}" aria-hidden="true"></i></a>`}).join('')}</nav>`;
  const dayBlock=d=>{
    const c=dayCapacity(d),items=agendaFor(d),marks=calMarkers(d).filter(m=>m.kind!=='milestone');
    const rows=[...items.map(i=>({at:+new Date(i.x.start),html:agendaRow(i).replace(/class="li/,`class="li ${conf.has(i.x.id)?'conflict':''}`)})),...marks.map(m=>({at:m.at,html:`<div class="li"><span class="tl-kind" style="background:var(--danger)"></span><span class="time-col">${fTime(m.at)}</span><div class="t">${m.task?taskLink(m.task):`<a class="title" href="${hrefFor('project',m.project.id)}">${esc(m.label)}</a>`}<div class="meta"><span class="late">⚑ ${m.kind==='project'?t('Proje teslimi'):t('Teslim')}</span></div></div></div>`}))].sort((a,b)=>a.at-b.at);
    return`<section class="agenda-day m"><div class="sec-h"><h2>${dayName(d.getDay())}, ${fDate(d)}${dayKey(d)===today?` <span class="pill acc">${t('Bugün')}</span>`:''}</h2><span class="load ${c.over?'late':''}">${capLabel(c)}</span></div>
      ${rows.length?`<div class="list">${rows.map(x=>x.html).join('')}</div>`:`<p class="muted small" style="margin:4px 0 12px">${c.work?t('Plan yok · {h} boş',{h:hrs(c.free)}):t('İzin günü')} <button type="button" class="linkbtn" data-a="newEvent">${t('Etkinlik ekle')}</button></p>`}</section>`;
  };
  return strip+(mode==='day'?dayBlock(r.days[0]):r.days.map(dayBlock).join(''));
}
