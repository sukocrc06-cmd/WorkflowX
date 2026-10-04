/* ================= I18N =================
   Keys are the Turkish source strings; EN holds translations. {x} = variable. */
let LANG=prefs.get('lang','tr')==='en'?'en':'tr';
function t(s,v){let r=(LANG==='en'&&EN[s]!==undefined)?EN[s]:s;if(v)r=r.replace(/\{(\w+)\}/g,(m,k)=>v[k]!==undefined?v[k]:m);return r}
const LOC=()=>LANG==='en'?'en-US':'tr-TR';

