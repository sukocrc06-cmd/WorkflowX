/* ================= HELPERS ================= */
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>(crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2));
const pad=n=>String(n).padStart(2,'0');
const toLocal=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
/* Date-only strings ('2026-10-02') must be read as LOCAL midnight. new Date('2026-10-02') is UTC
   and shows the previous day west of Greenwich. */
const parseDay=s=>new Date(String(s).slice(0,10)+'T00:00');
const dayKey=d=>toLocal(new Date(d)).slice(0,10);
const sod=d=>{const x=new Date(d);x.setHours(0,0,0,0);return x};
const addDays=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
/* Day boundaries are calendar-based: a DST day is 23 or 25 hours long, never assume 24. */
const dayEnd=d=>+addDays(sod(d),1);
const startOfWeek=d=>{const x=sod(d);return addDays(x,-((x.getDay()+6)%7))};
/* Central date/time formatting. Intl formatters are expensive to create, so one is cached
   per language and option set; every screen formats dates through these helpers. */
const FMT=new Map();
const fmt=(kind,opts)=>{const k=LANG+kind;let f=FMT.get(k);if(!f){f=new Intl.DateTimeFormat(LOC(),opts);FMT.set(k,f)}return f};
const dayName=(i,short)=>fmt(short?'wds':'wdl',{weekday:short?'short':'long'}).format(new Date(2024,0,7+i));
const fDate=d=>fmt('dm',{day:'numeric',month:'short'}).format(new Date(d));
const fTime=d=>fmt('hm',{hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(d));
const fDT=d=>`${fDate(d)} ${fTime(d)}`;
const num=h=>{h=Math.round(h*10)/10;const s=Number.isInteger(h)?String(h):h.toFixed(1);return LANG==='en'?s:s.replace('.',',')};
const hrs=h=>num(h)+' '+t('sa');
/* Exact durations for tracked time: "2 sa 35 dk" / "2h 35m". */
const dur=h=>{const m=Math.round(Math.max(0,h)*60),H=Math.floor(m/60),M=m%60;return H&&M?t('{h} sa {m} dk',{h:H,m:M}):H?t('{h} sa',{h:H}):t('{m} dk',{m:M})};
const HOUR=36e5;
const overlap=(a1,a2,b1,b2)=>Math.max(0,Math.min(a2,b2)-Math.max(a1,b1));
const clock=ms=>{const s=Math.max(0,Math.floor(ms/1000));return`${pad(Math.floor(s/3600))}:${pad(Math.floor(s%3600/60))}:${pad(s%60)}`};
function relDue(d){const days=Math.round((sod(d)-sod(new Date()))/864e5);if(days===0)return t('Bugün')+' '+fTime(d);if(days===1)return t('Yarın')+' '+fTime(d);if(days===-1)return t('Dün');if(days<0)return t('{n} gün gecikti',{n:-days});if(days<7)return dayName(new Date(d).getDay())+' '+fTime(d);return fDate(d)}

const STATUS_K={inbox:'Gelen',todo:'Yapılacak',progress:'Devam ediyor',blocked:'Engellendi',done:'Tamamlandı'};
const PRIO_K={low:'Düşük',medium:'Orta',high:'Yüksek',urgent:'Acil'};
const EVT_K={meeting:'Toplantı',focus:'Odak bloğu',personal:'Kişisel',event:'Etkinlik',milestone:'Kilometre taşı'};
const ST=k=>t(STATUS_K[k]),PR=k=>t(PRIO_K[k]),EV=k=>t(EVT_K[k]);
const PRIO_W={low:1,medium:2,high:3,urgent:4};
const EVT_C={meeting:'#6366f1',focus:'#10b981',personal:'#a3a3a3',event:'#0ea5e9',milestone:'#e4531c'};
const COLORS=['#6366f1','#0ea5e9','#10b981','#f59e0b','#ef4444','#a855f7','#14b8a6','#ec4899'];

