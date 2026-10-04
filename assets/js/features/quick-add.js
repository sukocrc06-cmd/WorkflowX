/* ================= SMART QUICK ADD =================
   "Raporu yarın saat 15'e kadar bitir 2 saat yüksek"   → title, due, estimate, priority
   "Web sitesi revizyonu cuma 4 saat yüksek @müşteri"    → + project
   "Haftalık rapor her cuma 16:00 1sa #rapor"             → + recurrence, tags
   The parser only fills what it is sure about; the preview shows every recognised
   field before saving, and an unknown @project blocks the save instead of being dropped. */
const QDAYS={pazartesi:1,salı:2,sali:2,çarşamba:3,carsamba:3,perşembe:4,persembe:4,cumartesi:6,cuma:5,pazar:0,monday:1,tuesday:2,wednesday:3,thursday:4,friday:5,saturday:6,sunday:0,mon:1,tue:2,wed:3,thu:4,fri:5,sat:6,sun:0};
const QSUFFIX="(?:['’]?(?:ya|ye|yı|yi|a|e|da|de|ta|te|dan|den|tan|ten|ki|dır|dir))?";
const QDAY_KEYS=Object.keys(QDAYS).sort((a,b)=>b.length-a.length).join('|');
const QPRIO=w=>{w=norm(w);return/acil|urg/.test(w)?'urgent':/yuksek|high/.test(w)?'high':/dusuk|low/.test(w)?'low':'medium'};
function parseQuick(txt){
  let s=' '+String(txt||'').slice(0,500)+' ';
  const r={title:'',est:0,prio:'medium',prioSet:false,tags:[],proj:null,projMiss:null,due:null,recur:null};
  const now=new Date();
  // duration: "2 saat", "2sa", "1,5 h", "45dk", "30 min"
  s=s.replace(/\s(\d+(?:[.,]\d+)?)\s?(saat|sa|hours?|hrs?|h)(?=\s)/i,(m,n)=>{r.est+=parseFloat(n.replace(',','.'));return ' '});
  s=s.replace(/\s(\d+)\s?(dakika|dk|mins?|m)(?=\s)/i,(m,n)=>{r.est+=(+n)/60;return ' '});
  // priority: "!yüksek" anywhere, or a bare priority word at the very end ("… 4 saat yüksek")
  s=s.replace(/\s!(acil|urgent|yüksek|yuksek|high|orta|medium|düşük|dusuk|low)(?=\s)/iu,(m,p)=>{r.prio=QPRIO(p);r.prioSet=true;return ' '});
  if(!r.prioSet)s=s.replace(/\s(acil|urgent|yüksek|yuksek|high|düşük|dusuk|low)(?:\s+(?:öncelik(?:li)?|oncelik(?:li)?|priority))?\s*$/iu,(m,p)=>{r.prio=QPRIO(p);r.prioSet=true;return ' '});
  s=s.replace(/\s#([\p{L}\d_-]{1,40})/gu,(m,g)=>{if(r.tags.length<10)r.tags.push(g);return ' '});
  s=s.replace(/\s@([\p{L}\d_-]{1,60})/u,(m,g)=>{const q=norm(g);r.proj=S.projects.find(p=>!p.archived&&norm(p.name).replace(/\s+/g,'').includes(q))||null;if(!r.proj)r.projMiss=g;return ' '});
  // recurrence (before weekdays, because "her pazartesi" contains a weekday)
  const wk=new RegExp(`\\s(?:her|every)\\s((?:(?:${QDAY_KEYS})${QSUFFIX}(?:\\s*(?:,|ve|and)\\s*)?)+)(?=\\s)`,'iu');
  s=s.replace(/\s(?:hafta\s?içi\s(?:her\s)?gün|her\s(?:hafta\s?içi|iş\sgünü)|every\sweekday|weekdays)(?=\s)/iu,()=>{r.recur={freq:'weekdays',interval:1};return ' '});
  if(!r.recur)s=s.replace(/\s(?:her\s?gün|every\sday|daily)(?=\s)/iu,()=>{r.recur={freq:'daily',interval:1};return ' '});
  if(!r.recur)s=s.replace(/\s(?:her\sayın|every\smonth\son(?:\sthe)?)\s(\d{1,2})(?:['’]?(?:i|ı|u|ü|si|sı|sü|su|nde|inde|ında|st|nd|rd|th))?(?=\s)/iu,(m,d)=>{if(+d>=1&&+d<=31){r.recur={freq:'monthly',interval:1,monthDay:+d};return ' '}return m});
  if(!r.recur)s=s.replace(wk,(m,list)=>{const days=[...list.toLocaleLowerCase('tr-TR').matchAll(new RegExp(QDAY_KEYS,'giu'))].map(x=>QDAYS[x[0]]).filter(d=>d!==undefined);if(!days.length)return m;r.recur={freq:'weekly',interval:1,days:[...new Set(days)]};return ' '});
  if(!r.recur)s=s.replace(/\s(?:her\shafta|every\sweek|weekly)(?=\s)/iu,()=>{r.recur={freq:'weekly',interval:1,days:[now.getDay()]};return ' '});
  if(!r.recur)s=s.replace(/\s(?:her\say|every\smonth|monthly)(?=\s)/iu,()=>{r.recur={freq:'monthly',interval:1,monthDay:now.getDate()};return ' '});
  // time: "15:00", "saat 15", "15'e kadar", "saat 15.30'da", "at 3pm"
  let hh=null,mm=0,day=null,timeFound=false;
  const setT=(h,mi)=>{if(h<24&&mi<60){hh=h;mm=mi;timeFound=true;return true}return false};
  s=s.replace(/\s(?:saat\s|at\s|by\s)?(\d{1,2})[:.](\d{2})(?:['’][a-zçğıöşü]{1,3})?(?=\s)/iu,(m,h,mi)=>setT(+h,+mi)?' ':m);
  if(!timeFound)s=s.replace(/\s(?:at|by)\s(\d{1,2})\s?(am|pm)(?=\s)/i,(m,h,ap)=>{let H=+h%12;if(ap.toLowerCase()==='pm')H+=12;return setT(H,0)?' ':m});
  if(!timeFound)s=s.replace(/\ssaat\s(\d{1,2})(?:['’][a-zçğıöşü]{1,3})?(?=\s)/iu,(m,h)=>setT(+h,0)?' ':m);
  if(!timeFound)s=s.replace(/\s(\d{1,2})['’](?:e|a|ye|ya|te|ta|de|da)(?=\s)/iu,(m,h)=>setT(+h,0)?' ':m);
  const rel=[[/\s(bugün|bugun|today)(?:['’]?[a-zçğıöşü]{0,3})?(?=\s)/iu,0],[/\s(yarın|yarin|tomorrow)(?:['’]?[a-zçğıöşü]{0,3})?(?=\s)/iu,1],[/\s(haftaya|next\s+week)(?=\s)/iu,7]];
  for(const[re,o]of rel){if(re.test(s)){day=addDays(sod(now),o);s=s.replace(re,' ');break}}
  if(!day){const re=new RegExp(`\\s(${QDAY_KEYS})${QSUFFIX}(?=\\s)`,'iu');
    s=s.replace(re,(m,w)=>{const target=QDAYS[w.toLocaleLowerCase('tr-TR')];if(target===undefined)return m;day=addDays(sod(now),(target-now.getDay()+7)%7);return ' '})}
  if(day||(hh!==null&&!r.recur)){const d=day?new Date(day):sod(now);if(hh!==null)d.setHours(hh,mm,0,0);else d.setHours(S.settings.workEnd,0,0,0);if(d<now)d.setDate(d.getDate()+(day&&hh===null?7:1));r.due=d}
  if(r.recur&&!r.due){const base=new Date(now);base.setHours(hh!==null?hh:S.settings.workEnd,hh!==null?mm:0,0,0);let d=base;
    const ok=x=>r.recur.freq==='daily'||(r.recur.freq==='weekdays'&&x.getDay()%6!==0)||(r.recur.freq==='weekly'&&r.recur.days.includes(x.getDay()))||(r.recur.freq==='monthly'&&x.getDate()===r.recur.monthDay);
    for(let i=0;i<62&&(!ok(d)||d<now);i++)d=addDays(d,1);if(ok(d)&&d>=now)r.due=d}
  if(r.due||r.recur)s=s.replace(/\s(?:kadar|until)(?=\s)/giu,' ');
  r.title=s.replace(/\s+/g,' ').trim().slice(0,200);
  if(r.title)r.title=r.title.charAt(0).toLocaleUpperCase(LOC())+r.title.slice(1);r.est=Math.min(200,Math.round(r.est*4)/4);
  return r;
}
const qhint=()=>`<span>${t('İpucu: tarih, saat, süre (3sa / 45dk), öncelik, #etiket, @proje ve “her pazartesi” gibi tekrar yazabilirsin.')}</span>`;
function qPreview(r){
  if(!r.title&&!r.due&&!r.est&&!r.tags.length&&!r.proj&&!r.projMiss&&!r.recur)return qhint();
  const c=[],lab=l=>`<small>${l}</small> `;
  c.push(r.title?`<span class="pill qp-title">${lab(t('Başlık'))}${esc(r.title)}</span>`:`<span class="pill late">${t('Başlık eksik')}</span>`);
  if(r.due)c.push(`<span class="pill acc">${svg('cal','i s')} ${lab(t('Teslim'))}${relDue(r.due)}</span>`);
  if(r.est)c.push(`<span class="pill acc">${svg('clock','i s')} ${lab(t('Süre'))}${hrs(r.est)}</span>`);
  if(r.prioSet)c.push(`<span class="pill pr-${r.prio}">${lab(t('Öncelik'))}${PR(r.prio)}</span>`);
  if(r.recur)c.push(`<span class="pill acc">${svg('refresh','i s')} ${esc(recurText(r.recur))}</span>`);
  r.tags.forEach(g=>c.push(`<span class="pill">#${esc(g)}</span>`));
  if(r.proj)c.push(`<span class="pill">${lab(t('Proje'))}<i class="dotc" style="background:${r.proj.color}"></i>${esc(r.proj.name)}</span>`);else if(r.projMiss)c.push(`<span class="pill late">@${esc(r.projMiss)} · ${t('proje bulunamadı')}</span>`);
  return c.join('')+`<span style="margin-left:auto">↵ ${r.projMiss?t('önce projeyi düzelt'):t('ekle')}</span>`;
}
document.addEventListener('input',e=>{if(e.target.id==='qaddi'){const box=$('#qprev');if(box)box.innerHTML=qPreview(parseQuick(e.target.value))}});
function submitQuick(q){
  const r=parseQuick(q);
  if(!r.title){toast(t('Görev adı gerekli.'));return}
  if(r.projMiss){toast(t('“@{p}” adında bir proje yok. Proje adını düzelt ya da @ işaretini kaldır.',{p:r.projMiss}));$('#qaddi')?.focus();return}
  const x=newTask({title:r.title,priority:r.prio,due:r.due?toLocal(r.due):'',estimate:r.est,projectId:r.proj?r.proj.id:null,tags:r.tags.slice(0,10),recur:r.recur});
  const id=commit(t('Görev eklendi'),()=>{S.tasks.push(x);logAct('task',x.id,'created',{label:x.title})});
  if(UI.taskFilter==='done'||UI.taskFilter==='late')UI.taskFilter='open';UI.flash={id:x.id,kind:'new'};render();
  const inp=$('#qaddi');if(inp)inp.focus();
  toast(t('Görev eklendi: {x}',{x:x.title}),x.estimate?{label:t('Planla'),fn:()=>suggestFor([x])}:{label:t('Geri al'),fn:()=>{const top=HISTORY.past[HISTORY.past.length-1];if(top&&top.id===id)undo()}});
}
