/* ================= SCHEMA (structured output validation · Faz 8 · p8b) =================
   A tiny, dependency-free schema checker (the same role Zod plays on a server).
   Every plan — from the rule engine today or an AI model later — must match PLAN_SCHEMA
   before it is shown, and every block must match BLOCK_SCHEMA plus the semantic checks
   in validatePlan(). Errors are reported as [path, message] so they can be logged and shown. */
const Sch={
  str:(o={})=>({t:'str',...o}), num:(o={})=>({t:'num',...o}), bool:()=>({t:'bool'}),
  id:()=>({t:'re',re:RX.id}), local:()=>({t:'re',re:RX.local,date:true}), iso:()=>({t:'iso'}),
  oneOf:v=>({t:'enum',v}), arr:(of,o={})=>({t:'arr',of,...o}), obj:(f,o={})=>({t:'obj',f,...o}), any:()=>({t:'any'}),
  opt:s=>({...s,opt:true}), nul:s=>({...s,nul:true})
};
function schemaErrors(s,v,p='$',out=[]){
  if(out.length>=50)return out;                                            // enough to explain; stop early on garbage
  if(v===undefined){if(!s.opt)out.push([p,'eksik']);return out}
  if(v===null){if(!s.nul)out.push([p,'boş olamaz']);return out}
  const bad=m=>{out.push([p,m]);return out};
  switch(s.t){
    case 'str':if(typeof v!=='string')return bad('metin olmalı');if(s.max&&v.length>s.max)return bad('en fazla '+s.max+' karakter');return out;
    case 'num':if(typeof v!=='number'||!Number.isFinite(v))return bad('sayı olmalı');if(s.min!=null&&v<s.min)return bad('en az '+s.min);if(s.max!=null&&v>s.max)return bad('en fazla '+s.max);return out;
    case 'bool':return typeof v==='boolean'?out:bad('doğru/yanlış olmalı');
    case 're':if(typeof v!=='string'||!s.re.test(v))return bad('biçim geçersiz');if(s.date&&isNaN(Date.parse(v)))return bad('tarih geçersiz');return out;
    case 'iso':return typeof v==='string'&&v.length<=40&&!isNaN(Date.parse(v))?out:bad('tarih geçersiz');
    case 'enum':return s.v.includes(v)?out:bad('izin verilmeyen değer');
    case 'arr':if(!Array.isArray(v))return bad('liste olmalı');if(s.max!=null&&v.length>s.max)return bad('en fazla '+s.max+' öğe');v.forEach((x,i)=>schemaErrors(s.of,x,p+'['+i+']',out));return out;
    case 'obj':if(typeof v!=='object'||Array.isArray(v))return bad('nesne olmalı');
      for(const k of Object.keys(s.f))schemaErrors(s.f[k],v[k],p+'.'+k,out);
      if(s.strict)for(const k of Object.keys(v))if(!(k in s.f))out.push([p+'.'+k,'beklenmeyen alan']);
      return out;
    default:return out;
  }
}
const BLOCK_SCHEMA=Sch.obj({taskId:Sch.id(),start:Sch.local(),end:Sch.local(),why:Sch.opt(Sch.nul(Sch.obj({})))});
const UNPLACED_SCHEMA=Sch.obj({taskId:Sch.id(),h:Sch.num({min:0,max:10000}),reason:Sch.opt(Sch.nul(Sch.str({max:40}))),weekendHelps:Sch.opt(Sch.bool())});
const PLAN_SCHEMA=Sch.obj({
  id:Sch.id(),source:Sch.oneOf(['rules','ai']),request:Sch.opt(Sch.nul(Sch.str({max:500}))),createdAt:Sch.iso(),
  taskIds:Sch.arr(Sch.id(),{max:500}),addedDeps:Sch.opt(Sch.arr(Sch.id(),{max:500})),
  blocks:Sch.arr(Sch.any(),{max:2000}),unplaced:Sch.arr(Sch.any(),{max:500}),
  replaces:Sch.opt(Sch.arr(Sch.id(),{max:2000})),overDays:Sch.opt(Sch.arr(Sch.str({max:10}),{max:14}))
});
