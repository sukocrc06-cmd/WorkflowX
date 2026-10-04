// Visits every route and reports console errors. Usage: node qa/smoke.js
const { chromium } = require('playwright');const path=require('path');
const URL='file://'+path.resolve(__dirname,'../index.html');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1440,height:900}});
 const errs=[];p.on('pageerror',e=>errs.push('PAGEERR '+e.message));p.on('console',m=>{if(m.type()==='error'&&!/ERR_TUNNEL|fonts\.g/.test(m.text()))errs.push(m.text())});
 await p.goto(URL);await p.waitForTimeout(300);
 const routes=['#/','#/login','#/signup','#/forgot-password','#/legal/privacy','#/legal/terms','#/security','#/contact','#/nope','#/app'];
 for(const r of routes){await p.evaluate(h=>location.hash=h,r);await p.waitForTimeout(250);}
 await p.click('[data-a=obDemo]').catch(()=>{});await p.waitForTimeout(400);
 const ids=await p.evaluate(()=>({t:S.tasks[1].id,p:S.projects[0].id}));
 const app=['#/app','#/app/today','#/app/tasks','#/app/tasks/'+ids.t,'#/app/tasks/zzz','#/app/projects','#/app/projects/'+ids.p,...['tasks','board','timeline','calendar'].map(x=>'#/app/projects/'+ids.p+'/'+x),'#/app/calendar','#/app/calendar/day','#/app/calendar/month','#/app/calendar/week?d=2026-10-05','#/app/planning','#/app/analytics','#/app/team','#/app/settings','#/app/roadmap','#/app/admin','#/app/xyz','#/app/tasks/<script>'];
 for(const r of app){await p.evaluate(h=>location.hash=h,r);await p.waitForTimeout(250);const v=await p.evaluate(()=>UI.view);console.log(r.padEnd(46),'→',v);}
 console.log('ERRORS:',JSON.stringify(errs,null,1));await b.close();})();
