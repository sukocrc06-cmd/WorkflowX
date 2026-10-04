/* ================= ICS IMPORT ================= */
const unescICS=v=>String(v||'').replace(/\\n/gi,' ').replace(/\\([,;\\])/g,'$1').trim();
function parseICS(text){
  const lines=text.replace(/\r\n/g,'\n').replace(/\n[ \t]/g,'').split('\n');const evs=[];let cur=null;
  for(const raw of lines){const ln=raw.trim();
    if(ln==='BEGIN:VEVENT'){cur={EXDATE:[]};continue}
    if(ln==='END:VEVENT'){if(cur)evs.push(cur);cur=null;continue}
    if(!cur)continue;
    const i=ln.indexOf(':');if(i<0)continue;
    const [nm,...params]=ln.slice(0,i).split(';'),name=nm.toUpperCase(),val=ln.slice(i+1);
    const tz=(params.find(p=>/^TZID=/i.test(p))||'').slice(5).replace(/^"|"$/g,'');
    if(name==='EXDATE')cur.EXDATE.push(...val.split(',').map(v=>({v,tz})));else if(!(name in cur)){cur[name]=val;if(tz)cur[name+'_TZ']=tz}
  }
  return evs;
}
/* Wall-clock time in an IANA zone (TZID) → instant. Two passes handle DST offsets.
   Unknown zones (e.g. Windows names) fall back to local wall time and are reported. */
function tzOffset(ms,tz){const f=new Intl.DateTimeFormat('en-US',{timeZone:tz,hourCycle:'h23',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'});const p=Object.fromEntries(f.formatToParts(new Date(ms)).map(x=>[x.type,x.value]));return Date.UTC(+p.year,+p.month-1,+p.day,+p.hour%24,+p.minute,+p.second)-ms}
function zonedToDate(a,tz){const guess=Date.UTC(...a);let t1=guess-tzOffset(guess,tz);t1=guess-tzOffset(t1,tz);return new Date(t1)}
function icsDate(v,tz){const m=String(v||'').trim().match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/);if(!m)return null;
  const Y=+m[1],M=+m[2]-1,D=+m[3];if(M>11||D<1||D>31)return null;
  if(!m[4]){const d=new Date(Y,M,D);return d.getMonth()===M?{date:d,allDay:true}:null}
  const a=[Y,M,D,+m[4],+m[5],+(m[6]||0)];if(a[3]>23||a[4]>59||a[5]>59)return null;
  if(m[7])return{date:new Date(Date.UTC(...a)),allDay:false};
  if(tz){try{return{date:zonedToDate(a,tz),allDay:false,tz:true}}catch{return{date:new Date(...a),allDay:false,tzUnknown:true}}}
  return{date:new Date(...a),allDay:false}}
function icsDur(v){const m=String(v||'').match(/^P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/);if(!m)return 0;return((+m[1]||0)*7*86400+(+m[2]||0)*86400+(+m[3]||0)*3600+(+m[4]||0)*60+(+m[5]||0))*1000}
function icsExpand(start,rrule,exd){
  const R={};(rrule||'').split(';').forEach(p=>{const[k,v]=p.split('=');if(k&&v)R[k.toUpperCase()]=v});
  const out=[],winS=+addDays(sod(new Date()),-30),winE=+addDays(sod(new Date()),90);
  const push=d=>{if(+d>=winS&&+d<=winE&&!exd.has(+d))out.push(new Date(d))};
  if(!R.FREQ){push(start);return out}
  const iv=Math.max(1,+(R.INTERVAL||1)),count=R.COUNT?+R.COUNT:Infinity,until=R.UNTIL?icsDate(R.UNTIL)?.date:null;
  const stop=d=>(until&&d>until)||+d>winE;
  let n=0;
  if(R.FREQ==='DAILY'){for(let d=new Date(start),g=0;n<count&&g<3000;d=addDays(d,iv),g++){if(stop(d))break;n++;push(d)}}
  else if(R.FREQ==='WEEKLY'){
    const BY={SU:0,MO:1,TU:2,WE:3,TH:4,FR:5,SA:6};const days=(R.BYDAY?R.BYDAY.split(',').map(x=>BY[x.slice(-2)]).filter(x=>x!==undefined):[start.getDay()]).sort((a,b)=>a-b);
    const ws=addDays(sod(start),-start.getDay());let done=false;
    for(let w=0,g=0;!done&&n<count&&g<800;w+=iv,g++){for(const dd of days){const d=addDays(ws,w*7+dd);d.setHours(start.getHours(),start.getMinutes(),start.getSeconds(),0);if(d<start)continue;if(stop(d)||n>=count){done=true;break}n++;push(d)}}
  }
  else if(R.FREQ==='MONTHLY'||R.FREQ==='YEARLY'){for(let i=0,g=0;n<count&&g<400;i+=iv,g++){const d=new Date(start);if(R.FREQ==='MONTHLY')d.setMonth(start.getMonth()+i);else d.setFullYear(start.getFullYear()+i);if(stop(d))break;n++;push(d)}}
  else push(start);
  return out;
}
function importICS(text){
  const evs=parseICS(text);
  if(!evs.length){toast(t('Dosyada etkinlik bulunamadı. Geçerli bir .ics dosyası mı?'));return}
  let added=0,skipped=0,dup=0,badTz=0,invalid=0;const before=JSON.stringify(S);
  const have=new Set(S.events.filter(e=>e.source==='ics').map(e=>e.uid+'|'+e.start));
  for(const e of evs){
    if(/CANCELLED/i.test(e.STATUS||'')){skipped++;continue}
    const s=icsDate(e.DTSTART,e.DTSTART_TZ);if(!s){invalid++;continue}if(s.allDay){skipped++;continue}if(s.tzUnknown)badTz++;
    const endD=e.DTEND?icsDate(e.DTEND,e.DTEND_TZ||e.DTSTART_TZ)?.date:null;let dur=endD?endD-s.date:(e.DURATION?icsDur(e.DURATION):HOUR);if(!(dur>0))dur=HOUR;
    const exd=new Set(e.EXDATE.map(({v,tz})=>{const d=icsDate(v,tz||e.DTSTART_TZ);return d?+d.date:0}));
    for(const d of icsExpand(s.date,e.RRULE,exd)){
      const st=toLocal(d),k=(e.UID||'')+'|'+st;if(have.has(k)){dup++;continue}have.add(k);
      S.events.push({id:uid(),uid:String(e.UID||'').slice(0,256),source:'ics',title:unescICS(e.SUMMARY).slice(0,200)||t('(Başlıksız)'),start:st,end:toLocal(new Date(+d+Math.min(dur,864e5))),type:'meeting',location:unescICS(e.LOCATION).slice(0,300),participants:'',desc:'',projectId:null,demo:false});
      if(++added>=3000)break;
    }
  }
  if(added){HISTORY.past.push({id:++HISTORY.seq,label:t('.ics içe aktarıldı'),before});HISTORY.future=[]}
  save();render();
  toast(t('{a} etkinlik içe aktarıldı · {s} atlandı (tüm gün/iptal) · {d} zaten vardı',{a:added,s:skipped,d:dup})+(invalid?' · '+t('{n} geçersiz kayıt yok sayıldı',{n:invalid}):'')+(badTz?' · '+t('{n} etkinlikte saat dilimi tanınmadı; yerel saat varsayıldı',{n:badTz}):''),added?{label:t('Takvimde gör'),fn:()=>{UI.weekStart=startOfWeek(new Date());go('calendar')}}:null);
}

