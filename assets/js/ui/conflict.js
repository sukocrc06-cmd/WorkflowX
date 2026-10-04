/* ================= CONFLICT DIALOG =================
   Shown before a timed change is saved (new/edited event, dragged or edited block)
   and from the calendar's conflict banner. Every option shows its exact result
   first ("Move to Wed 14:00–15:30"), and nothing is written until one is chosen.
   p = {kind:'ev'|'bl', id, title, start, end, apply(segments), cancel(), existing} */
const KEEP_OPEN=Symbol('keep-open');
let CF=null;
function checkConflicts(p){
  const a=+new Date(p.start),b=+new Date(p.end),hits=conflictsWith(a,b,p.id);
  if(!hits.length){p.apply([[a,b]]);return false}
  openConflict(p,hits);return true;
}
function openConflict(p,hits){
  const a=+new Date(p.start),b=+new Date(p.end);
  const slot=nextFreeSlot(b-a,a,p.id),segs=splitAround(a,b,hits);
  CF={...p,a,b,slot,segs};
  const span=(x,y)=>`${dayName(new Date(x).getDay(),true)} ${fTime(x)}–${fTime(y)}`;
  const row=(x,y,label,kind,me)=>`<li class="${me?'me':''}"><span class="time-col">${span(x,y)}</span><span class="cf-l">${esc(label)}</span><small>${kind}</small></li>`;
  const kindL=k=>k==='ev'?t('Etkinlik'):t('Odak bloğu');
  openDlg(`<form>${dlgHead(t('Takvim çakışması tespit edildi'))}<div class="dlg-b">
    <p class="muted" style="margin-top:0">${t('Aynı saatlere denk gelen işler var. Nasıl devam edelim?')}</p>
    <ul class="cf-list">${row(a,b,p.title,kindL(p.kind),true)}${hits.map(h=>row(h.a,h.b,h.label,kindL(h.kind),false)).join('')}</ul>
    <div class="cf-opts">
      <button type="button" class="cf-opt" data-a="cf" data-v="move" ${slot?'':'disabled'}>${svg('arrow')}<span><b>${t('Taşı')}</b><small>${slot?t('İlk boş zamana: {x}',{x:span(slot.a,slot.b)}):t('Önümüzdeki 14 günde uygun boşluk yok')}</small></span></button>
      <button type="button" class="cf-opt" data-a="cf" data-v="split" ${segs.length?'':'disabled'}>${svg('target')}<span><b>${t('Böl')}</b><small>${segs.length?t('Çakışmayan kısım kalır: {x}',{x:segs.map(([x,y])=>`${fTime(x)}–${fTime(y)}`).join(', ')}):t('Çakışmayan en az 15 dakikalık bir kısım yok')}</small></span></button>
      <button type="button" class="cf-opt" data-a="cf" data-v="keep">${svg('check')}<span><b>${p.existing?t('Olduğu gibi bırak'):t('Yine de planla')}</b><small>${t('Çakışmayla birlikte kaydet; takvimde işaretli kalır')}</small></span></button>
      <button type="button" class="cf-opt ghost" data-a="cf" data-v="cancel">${svg('x')}<span><b>${t('İptal')}</b><small>${p.existing?t('Hiçbir şeyi değiştirme'):t('Bu değişikliği kaydetme')}</small></span></button>
    </div></div></form>`,()=>KEEP_OPEN);
  dlg.querySelector('.cf-opt:not([disabled])')?.focus();
}
A.cf=d=>{
  const c=CF;if(!c)return;CF=null;closeDlg();
  if(d.v==='cancel'){c.cancel&&c.cancel();render();return}
  if(d.v==='keep'){c.apply([[c.a,c.b]]);return}
  if(d.v==='move'&&c.slot){c.apply([[c.slot.a,c.slot.b]]);return}
  if(d.v==='split'&&c.segs.length){c.apply(c.segs);return}
};
/* Writes segments for an event or block: the first reuses the item, the rest are copies. */
function writeTimed(kind,obj,data,segs){
  const [f,...rest]=segs;
  if(kind==='ev'){
    let ev=obj;if(ev)Object.assign(ev,data,{start:toLocal(new Date(f[0])),end:toLocal(new Date(f[1]))});else{ev={id:uid(),desc:'',location:'',participants:'',source:'manual',uid:'',demo:false,projectId:null,...data,start:toLocal(new Date(f[0])),end:toLocal(new Date(f[1]))};S.events.push(ev)}
    rest.forEach(([x,y])=>S.events.push({...JSON.parse(JSON.stringify(ev)),id:uid(),start:toLocal(new Date(x)),end:toLocal(new Date(y))}));
    return ev;
  }
  obj.start=toLocal(new Date(f[0]));obj.end=toLocal(new Date(f[1]));
  rest.forEach(([x,y])=>S.blocks.push({id:uid(),taskId:obj.taskId,start:toLocal(new Date(x)),end:toLocal(new Date(y))}));
  const x=taskOf(obj.taskId);if(x)logAct('task',x.id,'moved',{label:x.title,note:`${dayName(new Date(f[0]).getDay(),true)} ${fTime(f[0])}–${fTime(f[1])}`});
  return obj;
}
/* "Resolve" from the calendar banner for an item that already conflicts. */
function openConflictFor(kind,id){
  const obj=kind==='ev'?S.events.find(x=>x.id===id):S.blocks.find(x=>x.id===id);if(!obj)return;
  const title=kind==='ev'?obj.title:(taskOf(obj.taskId)?.title||'');
  const hits=conflictsWith(+new Date(obj.start),+new Date(obj.end),obj.id);
  if(!hits.length){toast(t('Bu öğede artık çakışma yok'));render();return}
  openConflict({kind,id,title,start:obj.start,end:obj.end,existing:true,
    apply:segs=>{if(segs.length===1&&segs[0][0]===+new Date(obj.start)&&segs[0][1]===+new Date(obj.end)){toast(t('Çakışma olduğu gibi bırakıldı'));return}
      const cid=commit(t('Çakışma çözüldü'),()=>writeTimed(kind,obj,{},segs));render();undoToast(t('Çakışma çözüldü'),cid)}},hits);
}
