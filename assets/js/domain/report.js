/* ================= WEEKLY REPORT (Faz 10 · p10d) =================
   A Monday–Sunday summary computed only from real state: completed work, logged time,
   planned focus time, meetings, what slipped and what is due next. Pure functions:
   weeklyReport() returns data, reportMarkdown() turns it into shareable text. */
const repH=ms=>Math.round(ms/HOUR*10)/10;
function weekBounds(ws){const a=startOfWeek(ws);return{a,b:addDays(a,7)}}
function weeklyReport(anyDay){
  const {a,b}=weekBounds(anyDay),A=+a,B=+b,inW=v=>{if(!v)return false;const x=+new Date(v);return x>=A&&x<B};
  const span=(s,e)=>overlap(+new Date(s),+new Date(e),A,B);
  const completed=S.tasks.filter(x=>x.status==='done'&&inW(x.completedAt)).sort((p,q)=>new Date(p.completedAt)-new Date(q.completedAt));
  const created=S.tasks.filter(x=>inW(x.createdAt));
  /* time actually logged this week, per task and per project */
  const byTask=new Map();
  S.tasks.forEach(x=>(x.logs||[]).forEach(l=>{const ms=span(l.start,l.end);if(ms>0)byTask.set(x.id,(byTask.get(x.id)||0)+ms)}));
  const loggedMs=[...byTask.values()].reduce((s,v)=>s+v,0);
  const projMap=new Map();
  byTask.forEach((ms,id)=>{const pid=taskOf(id)?.projectId||null;projMap.set(pid,(projMap.get(pid)||0)+ms)});
  const byProject=[...projMap].map(([pid,ms])=>{const p=pid&&projectOf(pid);return{id:pid,name:p?p.name:t('Projesiz'),color:p?p.color:'#9ca3af',h:repH(ms)}}).sort((p,q)=>q.h-p.h);
  const plannedMs=S.blocks.reduce((s,bl)=>s+span(bl.start,bl.end),0);
  const meetings=S.events.filter(e=>e.type!=='milestone'&&span(e.start,e.end)>0);
  const meetingMs=meetings.reduce((s,e)=>s+span(e.start,e.end),0);
  const cut=Math.min(B,Date.now());
  const slipped=S.tasks.filter(x=>x.status!=='done'&&x.due&&+new Date(x.due)<cut&&+new Date(x.due)>=A);
  const dueNext=S.tasks.filter(x=>x.status!=='done'&&x.due&&+new Date(x.due)>=B&&+new Date(x.due)<+addDays(b,7)).sort((p,q)=>new Date(p.due)-new Date(q.due));
  const withLogs=completed.filter(x=>+x.estimate>0&&actualH(x)>=0.1);
  const est=withLogs.reduce((s,x)=>s+ +x.estimate,0),act=withLogs.reduce((s,x)=>s+actualH(x),0);
  /* previous week, for the change arrows */
  const pa=+addDays(a,-7),inP=v=>{if(!v)return false;const x=+new Date(v);return x>=pa&&x<A};
  const prevDone=S.tasks.filter(x=>x.status==='done'&&inP(x.completedAt)).length;
  let prevMs=0;S.tasks.forEach(x=>(x.logs||[]).forEach(l=>{prevMs+=overlap(+new Date(l.start),+new Date(l.end),pa,A)}));
  return{from:a,to:addDays(b,-1),next:b,isCurrent:Date.now()>=A&&Date.now()<B,isFuture:Date.now()<A,
    completed,created,logged:repH(loggedMs),planned:repH(plannedMs),meetings:meetings.length,meetingH:repH(meetingMs),
    byProject,slipped,dueNext,accuracy:withLogs.length?{n:withLogs.length,factor:Math.round(act/est*100)/100}:null,
    prev:{done:prevDone,logged:repH(prevMs)}};
}
/* Plain Markdown for sharing (download / copy). Titles are user text: kept on one line, no markup injection risk
   in a .md file, but control characters are stripped. */
function reportMarkdown(r){
  const clean=s=>String(s||'').replace(/[\u0000-\u001f]/g,' ').trim();
  const L=[];
  L.push(`# ${t('Haftalık rapor')}: ${fDate(r.from)} – ${fDate(r.to)}`,'');
  L.push(`- ${t('Tamamlanan görev')}: **${r.completed.length}** (${t('önceki hafta')}: ${r.prev.done})`);
  L.push(`- ${t('Kaydedilen süre')}: **${hrs(r.logged)}** (${t('önceki hafta')}: ${hrs(r.prev.logged)})`);
  L.push(`- ${t('Planlanan odak süresi')}: ${hrs(r.planned)}`);
  L.push(`- ${t('Etkinlikler')}: ${r.meetings} (${hrs(r.meetingH)})`);
  if(r.accuracy)L.push(`- ${t('Tahmin doğruluğu')}: ×${num(r.accuracy.factor)} (${r.accuracy.n} ${t('görev')})`);
  L.push('');
  if(r.completed.length){L.push(`## ${t('Tamamlananlar')}`);r.completed.forEach(x=>L.push(`- ${clean(x.title)}${x.projectId&&projectOf(x.projectId)?` · ${clean(projectOf(x.projectId).name)}`:''}`));L.push('')}
  if(r.byProject.length){L.push(`## ${t('Projelere göre süre')}`);r.byProject.forEach(p=>L.push(`- ${clean(p.name)}: ${hrs(p.h)}`));L.push('')}
  if(r.slipped.length){L.push(`## ${t('Gecikenler')}`);r.slipped.forEach(x=>L.push(`- ${clean(x.title)} (${t('teslim')} ${fDT(x.due)})`));L.push('')}
  if(r.dueNext.length){L.push(`## ${t('Gelecek hafta teslim')}`);r.dueNext.forEach(x=>L.push(`- ${clean(x.title)} (${fDT(x.due)})`));L.push('')}
  L.push(`_${t('WorkFlowX ile oluşturuldu')} · ${fDT(new Date())}_`);
  return L.join('\n');
}
