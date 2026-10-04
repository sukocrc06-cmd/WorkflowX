/* ================= CALENDAR: hover slot + drag to move / resize ================= */
const ghost=document.createElement('div');ghost.className='slot-ghost';ghost.setAttribute('aria-hidden','true');
let DRAG=null;
document.addEventListener('mousemove',e=>{
  const col=e.target.closest&&e.target.closest('.cal-day');
  if(!col||DRAG||CREATE||TDRAG||e.target.closest('.ev,.evbar,.cal-empty-ov')){if(ghost.isConnected)ghost.remove();return}
  const r=col.getBoundingClientRect(),h=CAL_S+Math.floor((e.clientY-r.top)/PX*2)/2;
  if(h<CAL_S||h>=CAL_E){ghost.remove();return}
  ghost.style.top=((h-CAL_S)*PX+1)+'px';ghost.textContent='+ '+pad(Math.floor(h))+':'+(h%1?'30':'00');
  if(ghost.parentElement!==col)col.appendChild(ghost);
});
document.addEventListener('pointerdown',e=>{
  const el=e.target.closest&&e.target.closest('#main .ev');
  if(!el||e.button!==0||e.pointerType==='touch')return;
  const kind=el.dataset.kind;if(kind!=='ev'&&kind!=='bl')return;
  const id=el.dataset.id,obj=kind==='ev'?S.events.find(x=>x.id===id):S.blocks.find(x=>x.id===id);if(!obj)return;
  DRAG={el,obj,kind,resize:!!e.target.closest('.rs'),x0:e.clientX,y0:e.clientY,s0:+new Date(obj.start),e0:+new Date(obj.end),day0:el.closest('.cal-day').dataset.day,moved:false,ns:null,ne:null,pid:e.pointerId};
});
/* pointermove can fire hundreds of times a second: only the latest event is processed, once per frame. */
let dragRaf=0,dragEv=null;
document.addEventListener('pointermove',e=>{if(!DRAG)return;dragEv=e;if(!dragRaf)dragRaf=requestAnimationFrame(()=>{dragRaf=0;if(DRAG&&dragEv)dragMove(dragEv)})});
function dragMove(e){
  const d=DRAG;
  const dy=e.clientY-d.y0,dx=e.clientX-d.x0;
  if(!d.moved){if(Math.hypot(dx,dy)<5)return;d.moved=true;hideEvbar(true);closeEvPop();d.el.classList.add('dragging');document.body.classList.add('is-dragging');ghost.remove();try{d.el.setPointerCapture(d.pid)}catch{}}
  const Q=15*60e3,dm=Math.round(dy/PX*60/15)*Q;
  let ns,ne;
  if(d.resize){ns=d.s0;ne=Math.max(d.s0+Q,d.e0+dm);d.el.style.height=((ne-ns)/HOUR*PX-2)+'px'}
  else{
    const col=document.elementsFromPoint(e.clientX,e.clientY).find(x=>x.classList&&x.classList.contains('cal-day'));
    const day=col?col.dataset.day:(d.day||d.day0);d.day=day;
    const shift=+parseDay(day)-+parseDay(d.day0);
    ns=d.s0+dm+shift;ne=d.e0+dm+shift;
    if(col&&col!==d.el.parentElement)col.appendChild(d.el);
    document.querySelectorAll('.cal-day.drop').forEach(c=>{if(c!==col)c.classList.remove('drop')});col&&col.classList.add('drop');
    const sd=new Date(ns);d.el.style.top=Math.max(0,(sd.getHours()+sd.getMinutes()/60-CAL_S)*PX)+'px';d.el.style.left='2px';d.el.style.width='calc(100% - 4px)';
  }
  d.ns=ns;d.ne=ne;
  const hits=conflictsWith(ns,ne,d.obj.id);
  d.el.classList.toggle('will-conflict',hits.length>0);
  const lab=d.el.querySelector('span');if(lab)lab.textContent=`${fTime(ns)}–${fTime(ne)}`+(hits.length?` · ⚠ ${t('Çakışma')}: ${hits[0].label}`:'');
}
function endDrag(cancel){
  if(DRAG&&dragRaf&&dragEv&&!cancel)dragMove(dragEv);   // apply the last, not yet processed move
  const d=DRAG;DRAG=null;cancelAnimationFrame(dragRaf);dragRaf=0;document.body.classList.remove('is-dragging');document.querySelectorAll('.cal-day.drop').forEach(c=>c.classList.remove('drop'));if(!d||!d.moved)return;
  suppressClick=true;setTimeout(()=>{suppressClick=false},350);
  if(cancel||d.ns==null||(d.ns===d.s0&&d.ne===d.e0)){render();return}
  const obj=d.obj,kind=d.kind,title=kind==='ev'?obj.title:(taskOf(obj.taskId)?.title||'');
  const label=kind==='ev'?t('Etkinlik taşındı'):t('Blok taşındı');
  /* Nothing is written until conflicts are resolved; "Cancel" snaps the item back. */
  checkConflicts({kind,id:obj.id,title,start:toLocal(new Date(d.ns)),end:toLocal(new Date(d.ne)),
    apply:segs=>{
      const id=commit(label,()=>writeTimed(kind,obj,{},segs));render();
      const [a,b]=segs[0];let msg=t('{t} olarak güncellendi',{t:`${dayName(new Date(a).getDay(),true)} ${fTime(a)}–${fTime(b)}`});
      if(kind==='bl'){const tk=taskOf(obj.taskId);if(tk&&tk.due&&b>+new Date(tk.due))msg=t('Uyarı: blok teslim tarihinden sonra ({d}).',{d:relDue(tk.due)})}
      undoToast(msg,id)},
    cancel:()=>{}});
  if(!CF)return;render();               // conflict dialog open: show the item back in place until the user decides
}
document.addEventListener('pointerup',()=>endDrag(false));
document.addEventListener('pointercancel',()=>endDrag(true));
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&DRAG&&DRAG.moved){e.preventDefault();endDrag(true);toast(t('Taşıma iptal edildi'))}});

