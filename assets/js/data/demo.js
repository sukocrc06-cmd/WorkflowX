/* ================= DEMO DATA (flagged, removable) ================= */
function seed(){
  const today=sod(new Date()),mon=startOfWeek(today);
  const at=(d,h,m=0)=>{const x=new Date(d);x.setHours(h,m,0,0);return toLocal(x)};
  const wd=n=>{let d=new Date(today);while(!isWorkDay(d))d=addDays(d,1);while(n>0){d=addDays(d,1);if(isWorkDay(d))n--}return d};
  const p1={archived:false,archivedAt:null,createdAt:toLocal(new Date()),id:uid(),name:t('Müşteri Web Sitesi'),desc:t('Kurumsal site yenileme — tasarımdan yayına.'),color:'#6366f1',icon:'globe',start:dayKey(addDays(today,-7)),deadline:dayKey(wd(4)),status:'active',demo:true};
  const p2={archived:false,archivedAt:null,createdAt:toLocal(new Date()),id:uid(),name:t('Q4 Pazarlama Raporu'),desc:t('Çeyrek sonu performans raporu ve sunum.'),color:'#f59e0b',icon:'chart',start:dayKey(today),deadline:dayKey(wd(9)),status:'active',demo:true};
  const T=(title,p,status,prio,est,due,tags=[],logs=[])=>newTask({title:t(title),projectId:p?.id||null,status,priority:prio,estimate:est,due,tags:tags.map(x=>t(x)),logs,completedAt:status==='done'?due:null,demo:true});
  const log=(daysAgo,h)=>{const e=addDays(new Date(),-daysAgo);e.setHours(17,0,0,0);return[{start:new Date(+e-h*HOUR).toISOString(),end:e.toISOString()}]};
  const tasks=[T('Araştırma ve rakip analizi',p1,'done','medium',3,at(addDays(today,-3),17),[],log(3,4)),T('Arayüz tasarımı',p1,'progress','high',4,at(wd(1),17),['tasarım'],log(1,1.5)),T('Frontend geliştirme',p1,'todo','high',6,at(wd(3),17)),T('Backend ve form entegrasyonu',p1,'todo','medium',4,at(wd(3),17)),T('Test ve düzeltmeler',p1,'todo','high',2,at(wd(4),15)),T('Yayına alma',p1,'todo','urgent',1,at(wd(4),17)),
    T('Verileri topla',p2,'todo','medium',3,at(wd(5),17)),T('Rapor taslağı',p2,'inbox','medium',5,at(wd(8),17)),T('Müşteri sunumunu hazırla',null,'todo','high',3,at(wd(2),17),['sunum']),T('Faturaları kontrol et',null,'todo','low',0.5,at(wd(0),16)),
    T('Haftalık e-posta bülteni',null,'done','low',1,at(addDays(today,-5),12),[],log(5,1.5)),T('Sprint planlama notları',null,'done','medium',2,at(addDays(today,-4),12),[],log(4,2.5))];
  tasks[3].deps=[tasks[2].id];tasks[4].deps=[tasks[3].id];
  tasks[1].subtasks=[{id:uid(),title:t('Ana sayfa taslağı'),done:true},{id:uid(),title:t('Mobil görünüm'),done:false},{id:uid(),title:t('Tasarım sistemi renkleri'),done:false}];
  tasks[9].recur={freq:'weekly',interval:1,days:[5]};
  const E=f=>({id:uid(),desc:'',location:'',participants:'',source:'manual',uid:'',projectId:null,demo:true,...f});
  const events=[];for(let i=0;i<21;i++){const d=addDays(mon,i);if(isWorkDay(d))events.push(E({title:t('Günlük stand-up'),type:'meeting',start:at(d,9,30),end:at(d,9,45),location:'Zoom'}))}
  events.push(E({title:t('Müşteri sunumu'),type:'meeting',start:at(wd(1),10),end:at(wd(1),11,30),projectId:p1.id,location:t('Ofis')}),
    E({title:t('Ekip toplantısı'),type:'meeting',start:at(wd(1),10,30),end:at(wd(1),11,30)}),
    E({title:t('Öğle yemeği'),type:'personal',start:at(wd(0),12,30),end:at(wd(0),13,30)}),
    E({title:t('Ekip retrospektifi'),type:'meeting',start:at(wd(2),11),end:at(wd(2),12)}),
    E({title:t('Tasarım onayı'),type:'milestone',start:at(wd(2),17),end:at(wd(2),17,30),projectId:p1.id}));
  const members=[{id:uid(),name:'Deniz Aksoy',email:'',role:'manager',capacity:30,demo:true},{id:uid(),name:'Mert Kaya',email:'',role:'member',capacity:35,demo:true}];
  tasks[3].assignee=members[1].id;tasks[7].assignee=members[0].id;
  commit(t('Demo verisi yüklendi'),()=>{S.projects.push(p1,p2);S.tasks.push(...tasks);S.events.push(...events);S.members.push(...members);tasks.forEach(x=>logAct('task',x.id,'created',{label:x.title}))});go(matchMedia('(max-width:860px)').matches?'today':'overview');toast(t('Demo verisi yüklendi (Ayarlar’dan temizlenebilir)'));
}
function unseed(){
  if(!S.tasks.some(x=>x.demo)&&!S.projects.some(p=>p.demo)&&!S.events.some(e=>e.demo)){toast(t('Silinecek demo verisi yok'));return}
  const id=commit(t('Demo verisi temizlendi'),()=>{const ids=new Set(S.tasks.filter(x=>x.demo).map(x=>x.id));if(S.timer&&ids.has(S.timer.taskId))S.timer=null;S.projects=S.projects.filter(x=>!x.demo);S.tasks=S.tasks.filter(x=>!x.demo);S.events=S.events.filter(x=>!x.demo);S.members=S.members.filter(m=>!m.demo);S.blocks=S.blocks.filter(b=>!ids.has(b.taskId));S.tasks.forEach(x=>{if(x.projectId&&!projectOf(x.projectId))x.projectId=null;if(x.assignee&&!S.members.some(m=>m.id===x.assignee))x.assignee=null;x.deps=x.deps.filter(d=>taskOf(d))})});
  render();undoToast(t('Demo verisi temizlendi'),id);
}
