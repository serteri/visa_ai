import fs from 'node:fs';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const origin=process.env.MARKETING_ORIGIN||'http://localhost:3102';
const dir='scratch/acquisition-sprint-2/browser'+(origin.includes('localhost')?'-local':'-production');fs.mkdirSync(dir,{recursive:true});
const browser=await chromium.launch({headless:true});const context=await browser.newContext();
await context.route(/google-analytics\.com|googletagmanager\.com/,r=>r.abort());
await context.addInitScript(()=>{window.dataLayer=[];});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));const checks=[];
const resource='/resources/for-migration-professionals';
for(const width of [1440,390]){await page.setViewportSize({width,height:1000});const r=await page.goto(origin+resource,{waitUntil:'networkidle'});assert.equal(r.status(),200);assert.equal(await page.locator('h1').count(),1);assert((await page.evaluate(()=>document.documentElement.scrollWidth))<=width+1);assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'),'https://www.logivisa.com'+resource);assert.equal(await page.locator('a[data-tool-destination]').count(),4);await page.screenshot({path:`${dir}/resource-${width}.png`,fullPage:true});checks.push({resource,width,status:200,overflow:false});}
for(const [path,eventName,expected] of [
 ['/visas/190','research_continuation_click',{destination:'visa_comparison',locale:'en',subclass:'190',source_page_type:'visa',continuation_stage:'visa_to_tool'}],
 ['/occupations/261313-software-engineer','occupation_tool_click',{destination:'visa_comparison',locale:'en',occupation_code:'261313'}],
 ['/tools/skills-assessment?q=351311','research_continuation_click',{destination:'points_calculator',locale:'en',source_page_type:'tool',continuation_stage:'tool_to_tool'}],
 ['/tr/visas/190','research_continuation_click',{destination:'visa_comparison',locale:'tr',subclass:'190',source_page_type:'visa',continuation_stage:'visa_to_tool'}],
]){await page.goto(origin+path,{waitUntil:'networkidle'});const selector=`a[data-tool-destination="${expected.destination}"]`;await page.locator(selector).first().evaluate(a=>a.addEventListener('click',e=>e.preventDefault(),{once:true}));await page.locator(selector).first().click();const ev=await page.evaluate(name=>window.dataLayer.filter(v=>v[0]==='event'&&v[1]===name).map(v=>v[2]),eventName);assert.equal(ev.length,1);assert.deepEqual(ev[0],expected);if(eventName==='occupation_tool_click')assert.equal(await page.evaluate(()=>window.dataLayer.filter(v=>v[1]==='research_continuation_click').length),0);checks.push({path,eventName,payload:ev[0]});}
await page.goto(origin+'/tools/points-calculator/australia',{waitUntil:'networkidle'});assert.equal(await page.locator('[data-calculator-complete]').count(),0);
assert(!/PTE (50|65|79)/.test(await page.locator('#english').innerText()));
assert.equal(await page.locator('a[data-official-source][href*="/english-language/"]').count(),3);
const selects=await page.locator('select').evaluateAll(els=>els.map(e=>({id:e.id,options:[...e.options].map(o=>({value:o.value,text:o.text}))})));fs.writeFileSync(`${dir}/calculator-controls.json`,JSON.stringify(selects,null,2));
// The existing calculator uses native selects; select only synthetic test answers, with GA network requests blocked.
for(const [id,value] of [['age','25-32'],['english','proficient'],['education','bachelor-master'],['overseasExp','3-4']]){await page.locator(`#${id}`).selectOption(value);}
if(await page.locator('[data-calculator-complete]').count()){
 const a=page.locator('[data-calculator-complete] a[data-tool-destination="skills_assessment"]');await a.evaluate(a=>a.addEventListener('click',e=>e.preventDefault(),{once:true}));await a.click();const ev=await page.evaluate(()=>window.dataLayer.filter(v=>v[1]==='research_continuation_click').map(v=>v[2]));assert.equal(ev.length,1);assert.equal(ev[0].continuation_stage,'calculator_complete_to_research');assert.equal(await page.evaluate(()=>window.dataLayer.filter(v=>v[1]==='calculator_complete').length),1);checks.push({path:'/tools/points-calculator/australia',eventName:'research_continuation_click',payload:ev[0]});
}else {throw new Error('Calculator synthetic completion did not reach continuation state; inspect calculator-controls.json');}
assert.deepEqual(errors,[]);fs.writeFileSync(`${dir}/results.json`,JSON.stringify({origin,checked_at:new Date().toISOString(),checks,errors,ga_requests_blocked:true},null,2));await browser.close();console.log(`PASS ${checks.length} acquisition browser checks; GA requests blocked`);
