/* ================= ACTIVITY HISTORY =================
   Append-only log of what changed, per entity. Stored in product state so it
   survives reloads; in the backend phase it maps 1:1 to an `activity` table. */
const ACT_MAX=1000;
function logAct(entity,entityId,type,data={}){
  S.activity.push({id:uid(),at:new Date().toISOString(),entity,entityId:entityId||'',type,data});
  if(S.activity.length>ACT_MAX)S.activity.splice(0,S.activity.length-ACT_MAX);
}
/* Field-level diff for task / project edits → [[field, old, new]] as display strings. */
const ACT_FIELDS={title:'Başlık',due:'Teslim',start:'Başlangıç',estimate:'Tahmini süre',priority:'Öncelik',status:'Durum',projectId:'Proje',assignee:'Atanan',recur:'Tekrar',deadline:'Teslim',name:'Ad'};
function actVal(k,v){
  if(v==null||v===''||(Array.isArray(v)&&!v.length))return'—';
  if(k==='due'||k==='start')return fDT(v);
  if(k==='deadline')return fDate(parseDay(v));
  if(k==='estimate')return hrs(+v);
  if(k==='priority')return PR(v);
  if(k==='status')return ST(v);
  if(k==='projectId')return projectOf(v)?.name||t('Silinmiş proje');
  if(k==='assignee')return memberName(v);
  if(k==='recur')return recurText(v);
  return String(v);
}
function diffFields(before,after,keys){
  const out=[];
  for(const k of keys){const a=before[k],b=after[k];if(JSON.stringify(a??null)!==JSON.stringify(b??null))out.push([k,String(actVal(k,a)).slice(0,120),String(actVal(k,b)).slice(0,120)])}
  return out;
}
const ACT_TEXT={
  created:'oluşturuldu',updated:'güncellendi',completed:'tamamlandı',reopened:'yeniden açıldı',status:'durumu değişti',
  scheduled:'takvime yerleştirildi',moved:'bloğu taşındı',commented:'yorum eklendi',subtask:'alt görev güncellendi',
  archived:'arşivlendi',restored:'arşivden çıkarıldı',recurred:'sonraki tekrarı oluşturuldu',time:'süre kaydedildi',assigned:'atandı',member_added:'ekibe eklendi',member_updated:'üye bilgileri güncellendi',member_removed:'ekipten çıkarıldı',member_role:'rolü değişti'
};
function activityFor(entity,id){return S.activity.filter(a=>a.entity===entity&&a.entityId===id).slice().reverse()}
function activityRow(a,{label=true}={}){
  const when=new Date(a.at);
  const ch=(a.data&&Array.isArray(a.data.changes)?a.data.changes:[]).map(([k,o,n])=>`<li><b>${t(ACT_FIELDS[k]||k)}</b>: ${esc(o)} → ${esc(n)}</li>`).join('');
  return`<li class="act"><span class="act-dot"></span><div><span>${label&&a.data&&a.data.label?`<b>${esc(a.data.label)}</b> `:''}${t(ACT_TEXT[a.type]||a.type)}${a.data&&a.data.note?` · ${esc(a.data.note)}`:''}</span><time datetime="${esc(a.at)}">${fDate(when)} ${fTime(when)}</time>${ch?`<ul>${ch}</ul>`:''}</div></li>`;
}
