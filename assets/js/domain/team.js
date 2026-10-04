/* ================= TEAM, ROLES & WORKSPACES =================
   Members are kept locally so tasks can be assigned today; invitations, sign-in
   and server-side authorisation (RLS) come in the backend phase. `can()` is the
   single permission check the UI uses, so the rules can move to the server as-is. */
const ROLES=['owner','admin','manager','member','viewer'];
const ROLE_K={owner:'Sahip',admin:'Yönetici',manager:'Proje yöneticisi',member:'Üye',viewer:'İzleyici'};
const PERMS=[
  ['workspace.manage','Çalışma alanı ayarları ve silme',['owner']],
  ['billing.manage','Faturalama',['owner']],
  ['members.manage','Üye davet etme ve rol değiştirme',['owner','admin']],
  ['projects.manage','Proje oluşturma, arşivleme, silme',['owner','admin','manager']],
  ['tasks.assign','Görev atama',['owner','admin','manager']],
  ['tasks.edit','Görev oluşturma ve düzenleme',['owner','admin','manager','member']],
  ['time.track','Zaman kaydı',['owner','admin','manager','member']],
  ['view','Projeleri ve takvimi görüntüleme',['owner','admin','manager','member','viewer']]
];
const can=(role,action)=>{const p=PERMS.find(x=>x[0]===action);return!!p&&p[2].includes(role)};
const ME=()=>({id:'me',name:S.profile.name||t('Sen'),role:'owner',capacity:S.settings.maxDaily*S.settings.workDays.length,me:true});
const allMembers=()=>[ME(),...S.members];
const memberOf=id=>!id||id==='me'?ME():S.members.find(m=>m.id===id)||null;
const memberName=id=>{const m=memberOf(id);return m?m.name:t('Silinmiş üye')};
const initials=n=>String(n||'?').trim().split(/\s+/).map(w=>w[0]).slice(0,2).join('').toLocaleUpperCase(LOC())||'?';
/* Stable gradient per name (10 hand-tuned pairs, all keep white initials ≥4.5:1). */
const avHue=n=>{let h=0;for(const c of String(n||'?'))h=(h*31+c.codePointAt(0))>>>0;return'av-g'+(h%10)};
const avatar=(id,cls='av-sm')=>{const m=memberOf(id);return`<span class="${cls} ${avHue(m?m.name:'?')}" title="${esc(m?m.name:'')}" aria-hidden="true">${esc(initials(m?m.name:'?'))}</span>`};
/* Workload: open, estimated work assigned to a member vs their weekly capacity. */
function memberLoad(id){
  const ts=openTasks().filter(x=>(x.assignee||'me')===id);
  const hours=ts.reduce((s,x)=>s+Math.max(0,(+x.estimate||0)-actualH(x)),0);
  const m=memberOf(id),cap=m?m.capacity:0;
  const byP={};ts.forEach(x=>{if(x.projectId)byP[x.projectId]=(byP[x.projectId]||0)+(+x.estimate||0)});
  const cur=Object.entries(byP).sort((a,b)=>b[1]-a[1])[0];
  return{tasks:ts,hours,cap,free:Math.max(0,cap-hours),over:hours>cap,project:cur?projectOf(cur[0]):null};
}
const WORKSPACE_KINDS=[['personal','Kişisel çalışma alanı'],['company','Şirket çalışma alanı'],['team','Ekip çalışma alanı']];
