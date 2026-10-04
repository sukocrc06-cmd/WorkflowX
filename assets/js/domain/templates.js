/* ================= TEMPLATES =================
   Built-in templates are constants; user templates are stored in S.templates.
   A template is a list of items; depIndex chains an item to an earlier one.
   Applying a project template spreads the items' deadlines over the project period. */
const BUILTIN_TEMPLATES=[
  {id:'tpl-client',kind:'project',name:'Yeni Müşteri Projesi',desc:'Araştırmadan teslime altı adım; her adım bir öncekine bağlı.',builtin:true,items:[
    {title:'Araştırma',estimate:4,priority:'medium'},{title:'Planlama',estimate:3,priority:'medium',depIndex:0},
    {title:'Tasarım',estimate:8,priority:'high',depIndex:1},{title:'Geliştirme',estimate:16,priority:'high',depIndex:2},
    {title:'Test',estimate:4,priority:'high',depIndex:3},{title:'Teslim ve kapanış',estimate:2,priority:'urgent',depIndex:4}]},
  {id:'tpl-launch',kind:'project',name:'Ürün lansmanı',desc:'Mesaj, içerik, kanal ve ölçüm.',builtin:true,items:[
    {title:'Hedef kitle ve mesaj',estimate:3,priority:'high'},{title:'İçerik üretimi',estimate:8,priority:'medium',depIndex:0},
    {title:'Kanal planı',estimate:2,priority:'medium',depIndex:0},{title:'Yayın',estimate:2,priority:'urgent',depIndex:1},{title:'Sonuç raporu',estimate:3,priority:'medium',depIndex:3}]},
  {id:'tpl-weekly',kind:'task',name:'Haftalık rapor',desc:'Her cuma tekrar eden rapor görevi.',builtin:true,items:[
    {title:'Haftalık rapor',estimate:1.5,priority:'medium',subtasks:['Verileri topla','Özet yaz','Ekibe gönder'],recur:{freq:'weekly',interval:1,days:[5]}}]},
  {id:'tpl-meeting-prep',kind:'task',name:'Toplantı hazırlığı',desc:'Gündem, notlar ve takip.',builtin:true,items:[
    {title:'Toplantı hazırlığı',estimate:1,priority:'medium',subtasks:['Gündemi hazırla','Önceki notları oku','Takip maddelerini yaz']}]}
];
const allTemplates=kind=>[...BUILTIN_TEMPLATES,...S.templates].filter(x=>!kind||x.kind===kind);
const templateOf=id=>allTemplates().find(x=>x.id===id);
const tplName=tp=>tp.builtin?t(tp.name):tp.name;
/* Creates tasks from a template (inside a commit). Returns the created tasks. */
function instantiate(tp,{projectId=null,start=null,end=null}={}){
  const items=tp.items||[],now=new Date(),made=[];
  const total=items.reduce((s,i)=>s+(+i.estimate||1),0);
  const from=start?+start:+now,to=end?+end:null;let acc=0;
  items.forEach((it,i)=>{
    acc+=(+it.estimate||1);
    let due='';
    if(to&&to>from){const d=new Date(from+(to-from)*acc/total);d.setHours(S.settings.workEnd,0,0,0);while(!isWorkDay(d)&&+d>from)d.setDate(d.getDate()-1);due=toLocal(d)}
    const x={id:uid(),title:tp.builtin?t(it.title):it.title,desc:'',status:'todo',priority:it.priority||'medium',due,start:'',estimate:+it.estimate||0,projectId,assignee:null,
      tags:[...(it.tags||[])],deps:[],logs:[],comments:[],subtasks:(it.subtasks||[]).map(s=>({id:uid(),title:tp.builtin?t(s):s,done:false})),
      recur:it.recur?{...it.recur}:null,createdAt:toLocal(now),completedAt:null,demo:false};
    if(Number.isInteger(it.depIndex)&&made[it.depIndex])x.deps=[made[it.depIndex].id];
    made.push(x);
  });
  S.tasks.push(...made);made.forEach(x=>logAct('task',x.id,'created',{label:x.title,note:t('Şablondan: {x}',{x:tplName(tp)})}));
  return made;
}
/* Saves a project's (or one task's) structure as a reusable template. */
function templateFrom(kind,name,tasks){
  const idx=new Map(tasks.map((x,i)=>[x.id,i]));
  return{id:uid(),kind,name:String(name).slice(0,120),desc:'',items:tasks.slice(0,40).map(x=>{const d=(x.deps||[]).map(id=>idx.get(id)).find(i=>i!==undefined);
    return{title:x.title,estimate:+x.estimate||0,priority:x.priority,tags:(x.tags||[]).slice(0,10),subtasks:(x.subtasks||[]).map(s=>s.title).slice(0,50),depIndex:d===undefined?null:d,recur:x.recur||null}})};
}
