const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const source=fs.readFileSync(require('node:path').join(__dirname,'../assets/app.js'),'utf8');
const quiet={error(){}};
const loadSource=source.slice(source.indexOf('  async function loadMyApps()'),source.indexOf('  const teamOf'));
test('failed read preserves existing application content', async()=>{
 const run=new Function('sb','console',`let me={id:'u'},myApps=[{id:1,motivation:'keep'}];${loadSource};return loadMyApps().then(ok=>({ok,myApps}));`);
 for(const rpc of [async()=>({error:{message:'offline'},data:null}),async()=>{throw Error('offline')},async()=>({data:null,error:null})]){
  assert.deepEqual(await run({rpc},quiet),{ok:false,myApps:[{id:1,motivation:'keep'}]});
 }
});
test('successful read refreshes application content',async()=>{
 const run=new Function('sb',`let me={id:'u'},myApps=[];${loadSource};return loadMyApps().then(ok=>({ok,myApps}));`);
 assert.deepEqual(await run({rpc:async()=>({data:[{id:2,motivation:'current'}]})}),{ok:true,myApps:[{id:2,motivation:'current'}]});
});
const submitStart=source.indexOf('      form.onsubmit = async',source.indexOf('async function renderTeam'));
const submitSource=source.slice(submitStart,source.indexOf('\n    }\n    if (done)',submitStart)).replace('form.onsubmit =','return');
async function submit({apps=[],readOK=true,insertError=null,fallbackError=null}={}){
 const calls=[],err={},btn={},alerts=[];
 const form={motivation:{value:'reason'},role_name:{value:'dev'},role_second:{value:''},concerns:{value:''},takeaway:{value:''},reset(){calls.push('reset')}};
 const $=sel=>sel==='#apply-error'?err:sel==='#apply-submit'?btn:sel==='[name=rank]:checked'?{value:'1'}:null;
 const sb={from:()=>({insert:async row=>{calls.push('insert');return {error:insertError}},update(){throw Error('must not change ranks here')}})};
 const fn=new Function('form','$','editId','ensureCard','loadMyApps','myApps','sb','nowIso','slug','me','saveFallback','refresh','friendly','alert','console',submitSource)(form,$,null,async()=>true,async()=>readOK,apps,sb,()=>'', 'new',{id:'u'},async()=>{calls.push('fallback');return fallbackError},async()=>{calls.push('refresh')},x=>x,x=>alerts.push(x),quiet);
 await fn({preventDefault(){}});
 return {calls,err,btn,alerts};
}
test('conflicting rank never mutates existing applications',async()=>{
 const r=await submit({apps:[{id:'old',rank:1}]});assert.deepEqual(r.calls,[]);assert.match(r.err.textContent,/순위/);assert.equal(r.btn.disabled,false);
});
test('failed read blocks submission',async()=>{
 const r=await submit({readOK:false});assert.deepEqual(r.calls,[]);assert.match(r.err.textContent,/중단/);
});
test('failed insert never saves fallback or reports success',async()=>{
 const r=await submit({insertError:{message:'failed'}});assert.deepEqual(r.calls,['insert']);assert.equal(r.err.textContent,'failed');
});
test('partial save refreshes application and clearly reports remaining work',async()=>{
 const r=await submit({fallbackError:{message:'failed'}});assert.deepEqual(r.calls,['insert','fallback','reset','refresh']);assert.match(r.alerts[0],/신청서는 저장됐지만/);
});
test('successful application saves and refreshes',async()=>{
 const r=await submit();assert.deepEqual(r.calls,['insert','fallback','reset','refresh']);assert.deepEqual(r.alerts,[]);
});
test('delete failure never signs user out',async()=>{
 const block=source.slice(source.indexOf("      case 'delete':")+"      case 'delete':".length,source.indexOf('\n        break;',source.indexOf("      case 'delete':")));
 for(const fails of [true,false]){
  const calls=[];
  const run=new Function('sb','confirm','alert','refresh','friendly','console',`return (async()=>{${block}})()`);
  await run({rpc:async()=>({error:fails?{message:'failed'}:null}),auth:{signOut:async()=>calls.push('out')}},()=>true,()=>calls.push('alert'),async()=>calls.push('refresh'),x=>x,quiet);
  assert.deepEqual(calls,fails?['alert']:['out','refresh']);
 }
});
test('edit only opens a freshly loaded complete application',async()=>{
 const start=source.indexOf("      $('#edit-apply').onclick = async");
 const block=source.slice(start,source.indexOf("      $('#cancel-apply')",start));
 for(const ok of [true,false]){
  const button={},opened=[],messages=[];
  new Function('$','loadMyApps','alert','myApps','mine','refresh','openApplyForm',block)(()=>button,async()=>ok,x=>messages.push(x),[{id:'mine',motivation:'preserved'}],{id:'mine'},async()=>{},x=>opened.push(x));
  await button.onclick();
  assert.deepEqual(opened,ok?[{id:'mine',motivation:'preserved'}]:[]);
  assert.equal(messages.length,ok?0:1);
 }
});
