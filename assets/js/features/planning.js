/* ================= PLANNING SERVICE =================
   The UI talks only to PlanningService. Today it is backed by the deterministic
   engine (domain/planning.js). In the AI phase an AIService will turn free text
   into a structured request and propose a plan; its output must pass the same
   validation (validatePlan) before it can be shown — and it is never applied
   without the user pressing "Apply". */
const PlanningService={
  provider:'rules',                         // 'rules' now · 'ai' later
  async suggest(tasks,request=null,opts={}){
    const sim=storage.simulate;if(sim.delay)await sleep(Math.min(sim.delay,3000));
    /* Open dependencies that still need time are planned too — a task cannot start before them. */
    const set=new Map(tasks.map(x=>[x.id,x])),added=[];
    const pull=x=>(x.deps||[]).map(taskOf).forEach(d=>{if(d&&d.status!=='done'&&mine(d)&&!set.has(d.id)&&remainingH(d)>0){set.set(d.id,d);added.push(d.id);pull(d)}});
    tasks.forEach(pull);
    const all=[...set.values()],r=planMany(all,opts);
    return validatePlan({id:uid(),source:this.provider,request,createdAt:new Date().toISOString(),taskIds:all.map(x=>x.id),addedDeps:added,opts,...r});
  }
};
/* Defensive check applied to every plan, whoever produced it. */
function validatePlan(plan){
  const ok=b=>taskOf(b.taskId)&&validLocal(b.start)&&validLocal(b.end)&&new Date(b.end)>new Date(b.start)&&(new Date(b.end)-new Date(b.start))<=12*HOUR;
  return{...plan,blocks:(plan.blocks||[]).filter(ok),unplaced:(plan.unplaced||[]).filter(u=>taskOf(u.taskId))};
}
/* Impact of a plan: load per day before/after, and whether each task meets its deadline. */
function planImpact(plan){
  const days=[...new Set(plan.blocks.map(b=>b.start.slice(0,10)))].sort().map(k=>{const d=parseDay(k),c=dayCapacity(d),added=plan.blocks.filter(b=>b.start.startsWith(k)).reduce((s,b)=>s+(new Date(b.end)-new Date(b.start))/HOUR,0);return{d,before:c.planned,after:c.planned+added,cap:c.available||S.settings.maxDaily,off:!c.work}});
  const tasks=(plan.taskIds||[]).map(taskOf).filter(Boolean).map(x=>{const un=plan.unplaced.find(u=>u.taskId===x.id),bl=plan.blocks.filter(b=>b.taskId===x.id),last=bl.length?Math.max(...bl.map(b=>+new Date(b.end))):0;
    const status=un?'risk':x.due&&last>+new Date(x.due)?'risk':bl.length||remainingH(x)===0?'ok':'none';return{x,status,unplaced:un?un.h:0,added:bl.reduce((s,b)=>s+(new Date(b.end)-new Date(b.start))/HOUR,0)}}).filter(r=>r.added||r.unplaced);
  return{days,tasks};
}
/* Hours per project inside a plan — shows how competing projects share the time. */
function planByProject(plan){const m=new Map();plan.blocks.forEach(b=>{const x=taskOf(b.taskId),k=x&&x.projectId||'';m.set(k,(m.get(k)||0)+(new Date(b.end)-new Date(b.start))/HOUR)});return[...m].map(([k,h])=>({p:projectOf(k)||null,h})).sort((a,b)=>b.h-a.h)}
async function suggestFor(tasks,request=null,opts={}){
  const r=await PlanningService.suggest(tasks,request,opts);
  if(r.blocks.length&&UI.view!=='planning')setTimeout(()=>toast(t('Plan önerisi hazır · onayını bekliyor')),0);
  if(!r.blocks.length&&!r.unplaced.length){toast(t('Planlanacak süre yok. Görevlere tahmini süre ekle.'));UI.draft=null;return}
  UI.draft=r;UI.draftEdit=false;
  if(UI.view==='planning')render();else go('planning');
}
/* Workload optimisation: focus blocks on overloaded days (next 7 days, not started yet) are
   re-planned as if they did not exist. The result is a normal draft that replaces them — nothing
   moves until the user applies it. Meetings are never moved. */
function optimizeOverload(){
  const over=[];for(let i=0;i<7;i++){const c=dayCapacity(addDays(sod(new Date()),i));if(c.work&&c.over)over.push(dayKey(c.d))}
  if(!over.length){toast(t('Önümüzdeki 7 günde aşırı yüklü gün yok.'));return}
  const mv=S.blocks.filter(b=>+new Date(b.start)>Date.now()&&over.includes(dayKey(b.start)));
  if(!mv.length){toast(t('Aşırı yük toplantılardan geliyor; taşınabilecek odak bloğu yok. Toplantıları gözden geçirmeyi düşün.'));return}
  const saved=S.blocks,tasks=[...new Set(mv.map(b=>b.taskId))].map(taskOf).filter(Boolean);
  let r;S.blocks=S.blocks.filter(b=>!mv.includes(b));bump();
  try{r=planMany(tasks)}finally{S.blocks=saved;bump()}
  UI.draft=validatePlan({id:uid(),source:'rules',request:null,createdAt:new Date().toISOString(),taskIds:tasks.map(x=>x.id),addedDeps:[],opts:{},...r,replaces:mv.map(b=>b.id),overDays:over});
  UI.draftEdit=false;if(UI.view==='planning')render();else go('planning');
  toast(t('Öneri hazır: {n} blok yeniden yerleştirilecek. Onaylayana kadar takvimin değişmez.',{n:mv.length}));
}
function applyDraft(){
  if(!UI.draft)return;
  const rep=new Set(UI.draft.replaces||[]);
  const busy=[...S.events.filter(e=>e.type!=='milestone'),...S.blocks.filter(b=>!rep.has(b.id))].map(x=>({a:+new Date(x.start),b:+new Date(x.end)}));
  const cand=UI.draft.blocks.filter(b=>taskOf(b.taskId)),n=cand.length;
  const ok=cand.filter(b=>!busy.some(x=>overlap(x.a,x.b,+new Date(b.start),+new Date(b.end))>0));
  const id=commit(t('Plan uygulandı'),()=>{
    if(rep.size)S.blocks=S.blocks.filter(b=>!rep.has(b.id));
    ok.forEach(b=>{S.blocks.push({id:uid(),taskId:b.taskId,start:b.start,end:b.end});const x=taskOf(b.taskId);if(x&&x.status==='inbox')x.status='todo'});
    [...new Set(ok.map(b=>b.taskId))].forEach(tid=>{const x=taskOf(tid);const h=ok.filter(b=>b.taskId===tid).reduce((s,b)=>s+(new Date(b.end)-new Date(b.start))/HOUR,0);logAct('task',tid,'scheduled',{label:x?.title||'',note:hrs(h)})});
  });
  UI.draft=null;render();
  const first=ok.map(b=>b.start).sort()[0];
  const msg=ok.length===n?t('{n} odak bloğu takvime eklendi',{n}):t('{a}/{n} blok eklendi (diğerleri artık çakışıyor)',{a:ok.length,n});
  if(first)toast(msg,{label:t('Takvimde gör'),fn:()=>go('calendar',first.slice(0,10),isMobile()?'day':'week')});else toast(msg);
  return id;
}
/* Rule-based parser for planning requests (TR + EN). Placeholder for the future AIService. */
function parseRequest(q){
  const txt=q.trim(),low=txt.toLocaleLowerCase('tr-TR');
  const hm=low.match(/(\d+(?:[.,]\d+)?)\s*(saat|sa\b|hours?|hrs?\b|h\b)/);const hours=hm?parseFloat(hm[1].replace(',','.')):null;
  const map={pazartesi:1,salı:2,sali:2,çarşamba:3,carsamba:3,perşembe:4,persembe:4,cumartesi:6,cuma:5,pazar:0,monday:1,tuesday:2,wednesday:3,thursday:4,friday:5,saturday:6,sunday:0};
  const keys=Object.keys(map).sort((a,b)=>b.length-a.length);
  let due=null;
  if(/yarın|yarin|tomorrow/.test(low))due=addDays(sod(new Date()),1);
  else if(/bugün|bugun|today/.test(low))due=sod(new Date());
  else if(/haftaya|gelecek hafta|next week/.test(low))due=addDays(sod(new Date()),7);
  else{for(const w of low.replace(/[’'`]/g,' ').split(/[^a-zçğıöşü]+/)){const k=keys.find(k=>w.startsWith(k));if(k){due=addDays(sod(new Date()),(map[k]-new Date().getDay()+7)%7);break}}}
  if(due){due.setHours(S.settings.workEnd,0,0,0);if(due<new Date())due=addDays(due,7)}
  const prio=/acil|urgent/.test(low)?'urgent':/önemli|onemli|important/.test(low)?'high':'medium';
  let title=txt.split(/\s(?:\d|by\b|until\b|cuma|pazartesi|salı|sali|çarşamba|carsamba|perşembe|persembe|cumartesi|pazar|yarın|yarin|bugün|bugun|haftaya|gelecek|monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|today|next)/i)[0].replace(/[,.;]+$/,'').replace(/^(i need to|i have to|need to)\s+/i,'').trim();
  title=title.charAt(0).toLocaleUpperCase(LOC())+title.slice(1);
  const proj=S.projects.find(p=>low.includes(p.name.toLocaleLowerCase('tr-TR')));
  return{title:title||t('Yeni görev'),hours,due,prio,proj};
}
function handleNL(q){
  const r=parseRequest(q);
  if(!r.hours){toast(t('Kaç saat iş olduğunu yazar mısın? Örn. “10 saat”.'));return}
  if(r.proj){const ts=S.tasks.filter(x=>x.projectId===r.proj.id&&x.status!=='done'&&remainingH(x)>0);if(ts.length){suggestFor(ts,q);toast(t('“{x}” projesinin mevcut görevleri planlandı.',{x:r.proj.name}));return}}
  openDlg(`<form>${dlgHead(t('İsteğin görev olarak şöyle anlaşıldı'))}<div class="dlg-b"><p class="callout" style="margin-top:0">${t('Kontrol et, gerekirse düzelt. Kaydettiğinde önce plan önerisi gösterilir, takvimin değişmez.')}</p>
   <div class="f"><label for="nt">${t('Görev')}</label><input id="nt" name="title" value="${esc(r.proj?r.proj.name:r.title)}" required></div>
   <div class="f3"><div class="f"><label for="nd">${t('Teslim')}</label><input id="nd" type="datetime-local" name="due" value="${r.due?toLocal(r.due):''}"></div><div class="f"><label for="nh">${t('Süre (sa)')}</label><input id="nh" type="number" step="0.5" min="0.5" max="200" name="estimate" value="${r.hours}"></div><div class="f"><label for="np">${t('Öncelik')}</label><select id="np" name="priority">${Object.keys(PRIO_K).map(k=>`<option value="${k}" ${k===r.prio?'selected':''}>${PR(k)}</option>`).join('')}</select></div></div>
   <div class="f"><label for="npr">${t('Proje')}</label><select id="npr" name="projectId">${projOpts(r.proj?.id)}</select></div><div class="err" role="alert"></div></div>
   <div class="dlg-f"><button type="button" class="btn" data-a="closeDlg">${t('Vazgeç')}</button><button class="btn primary">${svg('spark')}${t('Oluştur ve plan öner')}</button></div></form>`,
  fd=>{const title=(fd.get('title')||'').trim(),est=+fd.get('estimate');if(!title)return t('Görev adı gerekli.');if(!(est>0&&est<=200))return t('Süre 0,5–200 saat olmalı.');
    const due=String(fd.get('due')||'');if(due&&!validLocal(due))return t('Geçerli bir teslim tarihi gir.');
    const x=newTask({title:title.slice(0,200),desc:t('Planlama isteğinden: {q}',{q}),priority:ENUM.priority.includes(fd.get('priority'))?fd.get('priority'):'medium',due,estimate:Math.round(est*4)/4,projectId:projectOf(fd.get('projectId'))?fd.get('projectId'):null});
    commit(t('Görev eklendi'),()=>{S.tasks.push(x);logAct('task',x.id,'created',{label:x.title})});setTimeout(()=>suggestFor([x],q))});
}

