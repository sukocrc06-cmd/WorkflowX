/* ================= NOTIFICATIONS =================
   Derived from real state with stable ids, so read/unread survives reloads
   (S.notifRead). Categories that need other people (assignment, mention, team
   activity) appear only after the backend phase — they are never simulated. */
const NOTIF_CATS={deadline:['Teslim tarihi','clock'],project:['Proje teslimi','folder'],conflict:['Takvim çakışması','alert'],suggestion:['Planlama önerisi','spark'],assigned:['Görev ataması','users'],mention:['Bahsetme','users'],team:['Ekip etkinliği','users']};
const NOTIF_LIVE=['deadline','project','conflict','suggestion'];
function notifications(){
  return memo('notif',()=>{
    const n=[],now=Date.now(),on=k=>S.settings.notify?.[k]!==false;
    if(on('deadline'))for(const x of myOpen()){if(!x.due)continue;const h=(new Date(x.due)-now)/HOUR;
      if(h<0)n.push({id:`due:${x.id}:${x.due}`,cat:'deadline',t:t('Gecikti: {x}',{x:x.title}),s:relDue(x.due),href:hrefFor('task',x.id),at:+new Date(x.due),lvl:'late'});
      else if(h<48)n.push({id:`due:${x.id}:${x.due}`,cat:'deadline',t:t('Yaklaşan teslim: {x}',{x:x.title}),s:relDue(x.due),href:hrefFor('task',x.id),at:+new Date(x.due)})}
    if(on('project'))for(const p of S.projects){if(p.archived||!p.deadline||p.status==='done')continue;const h=(+parseDay(p.deadline)+864e5-now)/HOUR;if(h>0&&h<72)n.push({id:`proj:${p.id}:${p.deadline}`,cat:'project',t:t('Proje teslimi yaklaşıyor: {x}',{x:p.name}),s:fDate(parseDay(p.deadline)),href:hrefFor('project',p.id),at:+parseDay(p.deadline)})}
    if(on('conflict'))for(const[a,b]of conflictPairs(sod(new Date()),addDays(sod(new Date()),7)).slice(0,10))n.push({id:`conf:${a.id}:${b.id}:${a.a}:${b.a}`,cat:'conflict',t:t('Çakışma: “{a}” ve “{b}”',{a:a.label,b:b.label}),s:`${dayName(new Date(b.a).getDay(),true)} ${fTime(b.a)}`,href:hrefFor('calendar',dayKey(new Date(b.a)),'day'),at:b.a});
    if(on('suggestion')){const c=capacityOutlook(5);if(!c.ok)n.push({id:`sug:short:${dayKey(new Date())}`,cat:'suggestion',t:t('Önümüzdeki 5 iş gününde {h} kapasite eksik',{h:hrs(c.short)}),s:t('Planlama önerisi al'),href:'#/app/planning',at:now})}
    return n.sort((a,b)=>a.at-b.at);
  });
}
const isRead=n=>!!S.notifRead[n.id];
const unreadCount=()=>notifications().filter(n=>!isRead(n)).length;
/* Read markers are UI metadata, not an undoable user edit: saved directly. */
function markRead(ids){ids.forEach(id=>{S.notifRead[id]=true});const keys=Object.keys(S.notifRead);if(keys.length>500)keys.slice(0,keys.length-500).forEach(k=>delete S.notifRead[k]);save()}
