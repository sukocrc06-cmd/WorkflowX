/* ================= CALENDAR — interactions (v0.7) =================
   View options · side panel · hover action bar · detail popover · drag-to-create ·
   drag a task from the side panel onto the grid · accept / reject single suggestions ·
   sticky layout measurements and "scroll to now". Nothing here writes data except
   through commit() in the actions below, and every write goes through the conflict check. */

/* ---------- View options ---------- */
function setCalPref(k,v){
  const ok={density:['compact','comfortable','spacious'],weekend:['0','1'],compress:['0','1'],side:['0','1']}[k];
  if(!ok||!ok.includes(v))return;prefs.set('cal.'+k,v);render();
}
Object.assign(A,{
  calPref(d){setCalPref(d.k,d.v)},
  calOpts(){UI.calOpts=!UI.calOpts;render();if(UI.calOpts)$('#calopts button, #calopts input')?.focus()},
  calSide(){setCalPref('side',calSideOn()?'0':'1')},
  miniNav(d){const b=UI.miniMonth||new Date(UI.calDate.getFullYear(),UI.calDate.getMonth(),1);UI.miniMonth=new Date(b.getFullYear(),b.getMonth()+ +d.v,1);render()},
  evPop(d,el){openEvPop(el)},
  draftAccept(d){draftOne(d.id,true)},
  draftReject(d){draftOne(d.id,false)},
  blockDone(d){const b=S.blocks.find(x=>x.id===d.id),x=b&&taskOf(b.taskId);if(!x)return;closeEvPop();if(x.status!=='done'){completeTask(x);celebrate(document.querySelector(`.ev[data-id="${d.id}"]`))}}
});
document.addEventListener('click',e=>{
  if(UI.calOpts&&!e.target.closest('.cal-opts-w')){UI.calOpts=false;const p=$('#calopts');if(p)p.hidden=true;$('[data-a=calOpts]')?.setAttribute('aria-expanded','false')}
  if(EVPOP&&!e.target.closest('#evpop')&&!e.target.closest('.ev'))closeEvPop();
},true);

/* ---------- Accept / reject one suggested block ---------- */
function draftOne(id,accept){
  const dr=UI.draft;if(!dr)return;const b=dr.blocks.find(x=>x.id===id);if(!b)return;closeEvPop();
  if(accept&&(dr.replaces||[]).length){toast(t('Bu öneri mevcut blokları yeniden düzenliyor; lütfen toplu uygula.'));return}
  if(accept){
    const a=+new Date(b.start),e=+new Date(b.end);
    if(conflictsWith(a,e,null).length){toast(t('Bu saat artık dolu. Öneriyi reddedip yeniden planlayabilirsin.'));return}
    let nb;const cid=commit(t('Öneri onaylandı'),()=>{nb={id:uid(),taskId:b.taskId,start:b.start,end:b.end};S.blocks.push(nb);const x=taskOf(b.taskId);if(x){if(x.status==='inbox')x.status='todo';logAct('task',x.id,'scheduled',{label:x.title,note:hrs((e-a)/HOUR)})}});
    dr.blocks=dr.blocks.filter(x=>x!==b);dr._acc=(dr._acc||0)+1;UI.flash={id:nb.id,kind:'placed'};
    if(!dr.blocks.length){UI.draft=null;render();undoToast(t('Tüm öneriler işlendi · {n} blok eklendi',{n:dr._acc}),cid);return}
    render();undoToast(t('Onaylandı: {x}',{x:`${dayName(new Date(a).getDay(),true)} ${fTime(a)}–${fTime(e)}`}),cid);
  }else{
    dr.blocks=dr.blocks.filter(x=>x!==b);dr._rej=(dr._rej||0)+1;
    if(!dr.blocks.length){UI.draft=null;render();toast(t('Öneriler işlendi; takviminde yalnızca onayladıkların var.'));return}
    render();toast(t('Öneri reddedildi'));
  }
}

/* ---------- Hover action bar (one element, moved next to the hovered/focused card) ---------- */
const evbar=document.createElement('div');evbar.className='evbar';evbar.setAttribute('role','toolbar');
let evbarFor=null,evbarT=0;
function evbarHTML(el){
  const k=el.dataset.kind,id=el.dataset.id,b=(l,a,ic,extra='',cls='')=>`<button type="button" class="${cls}" data-a="${a}" data-id="${id}" ${extra} aria-label="${l}" title="${l}">${svg(ic)}</button>`;
  if(k==='dr')return UI.draft&&(UI.draft.replaces||[]).length?'':b(t('Öneriyi onayla'),'draftAccept','check','','ok')+b(t('Öneriyi reddet'),'draftReject','x','','no');
  if(k==='ev')return b(t('Düzenle'),'editEvent','pen')+b(t('Sil'),'delEvent','trash','','no');
  const bl=S.blocks.find(x=>x.id===id),x=bl&&taskOf(bl.taskId);if(!x)return b(t('Kaldır'),'delBlock','trash','','no');
  const run=S.timer&&S.timer.taskId===x.id&&!S.timer.paused;
  return(x.status!=='done'?b(t('Görevi tamamla'),'blockDone','check','','ok'):'')+`<button type="button" data-a="${run?'timerPause':'timerStart'}" data-id="${x.id}" aria-label="${run?t('Duraklat'):t('Zamanlayıcıyı başlat')}" title="${run?t('Duraklat'):t('Zamanlayıcıyı başlat')}">${svg(run?'pause':'play')}</button>`+b(t('Bloğu kaldır'),'delBlock','trash','','no');
}
function showEvbar(el){
  if(DRAG||CREATE||RM()&&false)return;clearTimeout(evbarT);
  const html=evbarHTML(el);if(!html){hideEvbar();return}
  if(evbarFor!==el){evbar.innerHTML=html;evbar.setAttribute('aria-label',t('Hızlı eylemler'));evbarFor=el}
  el.after(evbar);const bh=36,above=el.offsetTop-bh-2;evbar.style.top=(above>=0?above:el.offsetTop+el.offsetHeight+2)+'px';
  const right=el.parentElement.clientWidth-(el.offsetLeft+el.offsetWidth);evbar.style.right=Math.max(2,right+4)+'px';evbar.classList.add('on');
}
function hideEvbar(now){clearTimeout(evbarT);const go=()=>{evbar.classList.remove('on');evbarFor=null;evbar.remove()};if(now)go();else evbarT=setTimeout(go,160)}
document.addEventListener('pointerover',e=>{
  if(e.pointerType==='touch')return;
  const el=e.target.closest&&e.target.closest('#main .ev');
  if(el){showEvbar(el);return}
  if(e.target.closest&&e.target.closest('.evbar')){clearTimeout(evbarT);return}
  if(evbarFor)hideEvbar();
});
document.addEventListener('focusin',e=>{const el=e.target.closest&&e.target.closest('#main .ev');if(el)showEvbar(el);else if(evbarFor&&!e.target.closest('.evbar'))hideEvbar(true)});

/* ---------- Detail popover ---------- */
const evpop=document.createElement('div');evpop.id='evpop';evpop.className='evpop';evpop.setAttribute('role','dialog');evpop.hidden=true;
let EVPOP=null;
function evPopHTML(el){
  const k=el.dataset.kind,id=el.dataset.id;
  const obj=k==='ev'?S.events.find(x=>x.id===id):k==='bl'?S.blocks.find(x=>x.id===id):UI.draft&&UI.draft.blocks.find(x=>x.id===id);if(!obj)return'';
  const a=+new Date(obj.start),b=+new Date(obj.end),when=`${dayName(new Date(a).getDay())}, ${fDate(a)} · <b>${fTime(a)}–${fTime(b)}</b> <span class="muted">(${dur((b-a)/HOUR)})</span>`;
  const hits=k==='dr'?[]:conflictsWith(a,b,id);
  const cf=hits.length?`<div class="callout warn">${svg('alert','i s')} <span>${t('Çakışıyor')}: ${esc(hits[0].label)}</span> <button type="button" class="linkbtn" data-a="resolve" data-kind="${k}" data-id="${id}">${t('Çöz')}</button></div>`:'';
  let c,ic,title,kind,body='',acts='';
  if(k==='ev'){c=EVT_C[obj.type]||'#888';ic=EV_IC[obj.type]||'cal';title=obj.title;kind=EV(obj.type);
    body=`${obj.location||obj.participants?`<dl class="kvs">${obj.location?`<div class="kv"><dt>${t('Konum')}</dt><dd>${esc(obj.location)}</dd></div>`:''}${obj.participants?`<div class="kv"><dt>${t('Katılımcılar')}</dt><dd>${esc(obj.participants)}</dd></div>`:''}</dl>`:''}${obj.desc?`<p class="ep-desc">${esc(obj.desc)}</p>`:''}${obj.source==='ics'?`<p class="muted small">${t('Takvim dosyasından içe aktarıldı')}</p>`:''}`;
    acts=`<button type="button" class="btn sm danger" data-a="delEvent" data-id="${id}">${svg('trash')}${t('Sil')}</button><button type="button" class="btn sm primary" data-a="editEvent" data-id="${id}">${svg('pen')}${t('Düzenle')}</button>`}
  else{const x=taskOf(obj.taskId),p=x&&projectOf(x.projectId);c=p?p.color:'#6366f1';ic=k==='dr'?'spark':(p&&p.icon)||'target';title=x?x.title:'—';kind=k==='dr'?t('Öneri · onay bekliyor'):t('Odak bloğu');
    if(x){const fit=deadlineFit(x);body=`<dl class="kvs"><div class="kv"><dt>${t('Proje')}</dt><dd>${p?projLink(p):t('Projesiz')}</dd></div><div class="kv"><dt>${t('Planlanan')}</dt><dd>${t('{a} / {b} planlı',{a:hrs(scheduledH(x)),b:hrs(effEst(x))})}</dd></div>${x.due?`<div class="kv"><dt>${t('Teslim')}</dt><dd>${relDue(x.due)} <span class="pill ${fit.cls==='ok'?'st-done':fit.cls==='late'?'pr-urgent':'pr-high'}">${fit.text}</span></dd></div>`:''}</dl>`}
    if(k==='dr'){const why=whyList(obj.why);body+=why.length?`<div class="ep-why"><b>${t('Neden bu saat?')}</b><ul>${why.map(r=>`<li>${esc(r)}</li>`).join('')}</ul></div>`:'';
      acts=UI.draft&&(UI.draft.replaces||[]).length?`<a class="btn sm primary" href="#/app/planning">${t('Planlamada incele')}</a>`:`<button type="button" class="btn sm" data-a="draftReject" data-id="${id}">${svg('x')}${t('Reddet')}</button><button type="button" class="btn sm primary" data-a="draftAccept" data-id="${id}">${svg('check')}${t('Onayla')}</button>`}
    else acts=`<button type="button" class="btn sm icon danger" data-a="delBlock" data-id="${id}" aria-label="${t('Bloğu kaldır')}" title="${t('Bloğu kaldır')}">${svg('trash')}</button><button type="button" class="btn sm" data-a="editBlock" data-id="${id}">${t('Zamanı değiştir')}</button>${x&&x.status!=='done'?`<button type="button" class="btn sm" data-a="timerStart" data-id="${x.id}">${svg('play')}${t('Başlat')}</button>`:''}${x?`<a class="btn sm primary" href="${hrefFor('task',x.id)}">${t('Görevi aç')}</a>`:''}`}
  return`<div class="ep-h" style="--c:${c}"><span class="ep-ic" aria-hidden="true">${svg(ic)}</span><div><small>${esc(kind)}</small><h2 id="evpop-h">${esc(title)}</h2></div><button type="button" class="btn icon ghost sm" data-a="evPopClose" aria-label="${t('Kapat')}">${svg('x')}</button></div>
    <div class="ep-b"><p class="ep-when">${svg('clock','i s')} ${when}</p>${cf}${body}</div><div class="ep-f">${acts}</div>`;
}
function openEvPop(el){
  if(EVPOP&&EVPOP.el===el){closeEvPop();return}
  const html=evPopHTML(el);if(!html)return;
  evpop.innerHTML=html;evpop.setAttribute('aria-labelledby','evpop-h');evpop.hidden=false;document.body.appendChild(evpop);
  EVPOP={el,id:el.dataset.id};hideEvbar(true);el.classList.add('pop-on');placeEvPop();
  if(!RM())evpop.animate([{opacity:0,transform:'translateY(4px) scale(.98)'},{opacity:1,transform:'none'}],{duration:180,easing:'cubic-bezier(.16,1,.3,1)'});
  evpop.querySelector('.ep-f .btn.primary, .ep-f .btn')?.focus({preventScroll:true});
}
function placeEvPop(){
  if(!EVPOP)return;const r=EVPOP.el.getBoundingClientRect(),w=evpop.offsetWidth,h=evpop.offsetHeight,m=10;
  if(innerWidth<600){evpop.classList.add('sheet');evpop.style.left='';evpop.style.top='';return}evpop.classList.remove('sheet');
  let x=r.right+m;if(x+w>innerWidth-m)x=r.left-w-m;if(x<m)x=Math.max(m,Math.min(innerWidth-w-m,r.left));
  let y=r.top;if(y+h>innerHeight-m)y=innerHeight-h-m;y=Math.max(m,y);
  evpop.style.left=x+'px';evpop.style.top=y+'px';
}
function closeEvPop(focusBack){if(!EVPOP)return;const el=EVPOP.el,id=EVPOP.id;EVPOP=null;evpop.hidden=true;evpop.remove();el.classList.remove('pop-on');
  if(focusBack){(el.isConnected?el:document.querySelector(`#main .ev[data-id="${id}"]`))?.focus()}}
A.evPopClose=()=>closeEvPop(true);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&EVPOP){e.preventDefault();e.stopPropagation();closeEvPop(true)}},true);
window.addEventListener('scroll',()=>{if(EVPOP)placeEvPop();if(evbarFor)hideEvbar(true)},{passive:true});
window.addEventListener('resize',()=>{if(EVPOP)placeEvPop();calMeasure()});

/* ---------- Drag on empty grid → new event with a live preview ---------- */
let CREATE=null;
const mkGhost=()=>{const g=document.createElement('div');g.className='slot-draft';g.setAttribute('aria-hidden','true');return g};
const snapH=(col,y)=>{const r=col.getBoundingClientRect();return Math.max(CAL_S,Math.min(CAL_E,CAL_S+Math.round((y-r.top)/PX*4)/4))};
const spanLbl=(day,a,b)=>{const d=parseDay(day),s=new Date(+d+a*HOUR),e=new Date(+d+b*HOUR);return`${dayName(d.getDay(),true)} ${fTime(s)}–${fTime(e)} · ${dur(b-a)}`};
document.addEventListener('pointerdown',e=>{
  if(e.button!==0||e.pointerType==='touch')return;
  const col=e.target.closest&&e.target.closest('#main .cal-day');
  if(!col||e.target.closest('.ev,.mark,.evbar,.cal-empty-ov'))return;
  CREATE={col,day:col.dataset.day,h0:snapH(col,e.clientY),y0:e.clientY,moved:false,g:null};
});
document.addEventListener('pointermove',e=>{
  const c=CREATE;if(!c)return;
  if(!c.moved){if(Math.abs(e.clientY-c.y0)<6)return;c.moved=true;c.g=mkGhost();c.col.appendChild(c.g);document.body.classList.add('is-creating');if(typeof ghost!=='undefined')ghost.remove()}
  const h=snapH(c.col,e.clientY),a=Math.min(c.h0,h),b=Math.max(c.h0,h,a+.25);c.a=a;c.b=b;
  c.g.style.top=((a-CAL_S)*PX)+'px';c.g.style.height=((b-a)*PX-2)+'px';
  const d=parseDay(c.day),hit=conflictsWith(+d+a*HOUR,+d+b*HOUR,null).length;
  c.g.classList.toggle('will-conflict',hit>0);c.g.textContent=spanLbl(c.day,a,b)+(hit?' · ⚠ '+t('Çakışma'):'');
});
document.addEventListener('pointerup',()=>{
  const c=CREATE;CREATE=null;if(!c||!c.moved)return;
  document.body.classList.remove('is-creating');suppressClick=true;setTimeout(()=>{suppressClick=false},300);
  const d=parseDay(c.day),s=new Date(+d+c.a*HOUR),en=new Date(+d+c.b*HOUR);
  openEvent(null,{start:toLocal(s),end:toLocal(en),type:'meeting'});
  setTimeout(()=>c.g&&c.g.remove(),200);
});

/* ---------- Drag a task from the side panel onto the grid ---------- */
let TDRAG=null;const dropG=mkGhost();dropG.classList.add('drop-g');
document.addEventListener('dragstart',e=>{
  const li=e.target.closest&&e.target.closest('.dtask');if(!li)return;
  const x=taskOf(li.dataset.task);if(!x){e.preventDefault();return}
  TDRAG={x,dur:Math.max(.25,Math.min(remainingH(x),2))};li.classList.add('dragging');
  try{e.dataTransfer.setData('text/plain',x.title);e.dataTransfer.effectAllowed='copy'}catch{}
});
document.addEventListener('dragover',e=>{
  if(!TDRAG)return;const col=e.target.closest&&e.target.closest('#main .cal-day');if(!col){dropG.remove();return}
  e.preventDefault();try{e.dataTransfer.dropEffect='copy'}catch{}
  const a=Math.min(CAL_E-TDRAG.dur,Math.max(CAL_S,snapH(col,e.clientY)-TDRAG.dur/2)),aq=Math.round(a*4)/4,b=aq+TDRAG.dur;TDRAG.col=col;TDRAG.a=aq;TDRAG.b=b;
  if(dropG.parentElement!==col)col.appendChild(dropG);
  dropG.style.top=((aq-CAL_S)*PX)+'px';dropG.style.height=(TDRAG.dur*PX-2)+'px';
  const d=parseDay(col.dataset.day),hit=conflictsWith(+d+aq*HOUR,+d+b*HOUR,null).length;
  dropG.classList.toggle('will-conflict',hit>0);dropG.textContent=`${TDRAG.x.title} · ${spanLbl(col.dataset.day,aq,b)}${hit?' · ⚠ '+t('Çakışma'):''}`;
  document.querySelectorAll('.cal-day.drop').forEach(c=>{if(c!==col)c.classList.remove('drop')});col.classList.add('drop');
});
document.addEventListener('drop',e=>{
  if(!TDRAG||!TDRAG.col)return;e.preventDefault();const {x,col,a,b}=TDRAG;
  const d=parseDay(col.dataset.day);scheduleTaskAt(x,+d+a*HOUR,+d+b*HOUR);
});
document.addEventListener('dragend',()=>{TDRAG=null;dropG.remove();document.querySelectorAll('.dtask.dragging').forEach(l=>l.classList.remove('dragging'));document.querySelectorAll('.cal-day.drop').forEach(c=>c.classList.remove('drop'))});
/* Creates a focus block for a task (after the usual conflict check). Also used by tests / keyboard paths. */
function scheduleTaskAt(x,a,b){
  const obj={id:uid(),taskId:x.id,start:toLocal(new Date(a)),end:toLocal(new Date(b))};
  checkConflicts({kind:'bl',id:obj.id,title:x.title,start:obj.start,end:obj.end,
    apply:segs=>{let first;const cid=commit(t('Görev takvime eklendi'),()=>{S.blocks.push(obj);writeTimed('bl',obj,{},segs);first=obj;if(x.status==='inbox')x.status='todo';logAct('task',x.id,'scheduled',{label:x.title,note:hrs(segs.reduce((s,[p,q])=>s+(q-p)/HOUR,0))})});
      UI.flash={id:first.id,kind:'placed'};render();const [p,q]=segs[0];undoToast(t('“{x}” takvime eklendi: {t}',{x:x.title,t:`${dayName(new Date(p).getDay(),true)} ${fTime(p)}–${fTime(q)}`}),cid)},
    cancel:()=>{}});
}

/* ---------- Layout: sticky offsets + scroll to "now" on entering the calendar ---------- */
function calMeasure(){
  const top=$('.top'),bar=document.querySelector('#main .cal-toolbar');
  document.documentElement.style.setProperty('--toph',(top&&top.offsetParent!==null?top.offsetHeight:0)+'px');
  if(bar)document.documentElement.style.setProperty('--calbar',bar.offsetHeight+'px');
}
function calAfterRender(entering){
  if(UI.view!=='calendar'){closeEvPop();return}
  calMeasure();
  if(EVPOP){const el=document.querySelector(`#main .ev[data-id="${EVPOP.id}"]`);if(el){EVPOP.el=el;el.classList.add('pop-on');evpop.innerHTML=evPopHTML(el)||'';if(!evpop.innerHTML)closeEvPop();else placeEvPop()}else closeEvPop()}
  if(!entering)return;
  const body=document.querySelector('#main .cal-body');if(!body)return;
  const nl=body.querySelector('.now-line'),st=S.settings;
  const y=nl?nl.getBoundingClientRect().top+scrollY-innerHeight*.35:body.getBoundingClientRect().top+scrollY+Math.max(0,st.workStart-CAL_S-.5)*PX-(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--toph'))||0)-(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--calbar'))||0)-60;
  const target=Math.max(0,y);if(target>40)window.scrollTo({top:target,behavior:'instant'});
}
