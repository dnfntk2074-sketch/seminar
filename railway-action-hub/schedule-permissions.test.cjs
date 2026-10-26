const fs=require('fs'),vm=require('vm'),crypto=require('crypto'),assert=require('assert/strict');
const src=fs.readFileSync(require('path').join(__dirname,'supabase/functions/hub-api/index.ts'),'utf8');
const access=fs.readFileSync(require('path').join(__dirname,'supabase/functions/hub-api/access.js'),'utf8');
const routes=new Map();let row;let mutations=0;
const pool={query:async(sql,args)=>{
 if(sql.startsWith('SELECT'))return {rowCount:row?1:0,rows:row?[{...row}]:[]};
 mutations++;
 if(sql.startsWith('DELETE')){row=null;return {rowCount:1,rows:[]}};
 if(sql.startsWith('UPDATE schedules SET owner_name')){Object.assign(row,{owner_name:args[0],customer_name:args[1],scheduled_at:args[2]});return {rowCount:1,rows:[{id:row.id}]}};
 if(sql.startsWith('UPDATE schedules SET completed')){row.completed=args[0];return {rowCount:1,rows:[{...row}]}};
 throw Error(sql);
}};
const app={get:(p,...f)=>routes.set('GET '+p,f),post:(p,...f)=>routes.set('POST '+p,f),put:(p,...f)=>routes.set('PUT '+p,f),patch:(p,...f)=>routes.set('PATCH '+p,f),delete:(p,...f)=>routes.set('DELETE '+p,f)};
const ctx=vm.createContext({console,Buffer,crypto,pool,app,ADMIN_EMAIL:'owner@example.invalid',JWT_SECRET:'test',jwt:{verify:t=>{if(t==='admin')return{email:'owner@example.invalid'};if(t==='pass')return{email:'owner@example.invalid',purpose:'schedule-owner'};throw Error()}},parseCookies:req=>req.cookies||{},auth:(req,res,next)=>req.cookies?.hb_admin==='admin'?next():res.status(401).json({}),notifyActivity:async()=>{},isTest:()=>false,getSettings:async()=>({})});
vm.runInContext(src.slice(src.indexOf('function tokenHash('),src.indexOf('function isTest('))+src.slice(src.indexOf('function requestOwnerName('),src.indexOf('async function init(')),ctx);
vm.runInContext(access.slice(access.indexOf('export function originGuard('),access.indexOf('export function createAccess(')).replace('export ',''),ctx);
vm.runInContext(src.slice(src.indexOf('function makeCustomer('),src.indexOf('app.get("/api/library"')),ctx);
const token='member-device-a';const hash=crypto.createHash('sha256').update(token).digest('hex');
function reset(){row={id:'schedule-a',owner_name:'TFA A',customer_name:'Cafe',scheduled_at:'2026-10-26T01:00:00Z',owner_token_hash:hash,completed:false};mutations=0}
async function call(method,{device=token,cookies={},name='TFA A',origin='https://hub.test',body={}}={}){
 const req={params:{id:'schedule-a'},cookies,body,get:k=>({'x-owner-token':device,'x-owner-name':encodeURIComponent(name),origin,host:'hub.test'})[k]};
 const res={code:200,status(n){this.code=n;return this},json(v){this.body=v;return this},setHeader(){}};
 const handlers=routes.get(method+' /api/schedules/:id'+(method==='PATCH'?'/complete':''));
 let i=0;async function next(){if(i<handlers.length)return await handlers[i++](req,res,next)}await next();return res;
}
const edit={ownerName:'TFA A',place:'New Cafe',date:'2026-10-27',time:'13:00',type:'study'};
(async()=>{
 reset();let p=ctx.toPublic(row,hash,'',false);assert.equal(p.canEdit,true);assert.equal(p.isOwner,true);
 assert.equal(ctx.toPublic(row,'','TFA A',false).canEdit,false);
 assert.equal(ctx.toPublic({...row,owner_token_hash:'short'},hash,'',false).isOwner,false);
 assert.equal((await call('PUT',{body:edit})).code,200);assert.equal(row.customer_name,'[후속상담] New Cafe');
 reset();assert.equal((await call('PUT',{device:'other',body:edit})).code,403);assert.equal(mutations,0);
 assert.equal((await call('PUT',{device:'',body:edit})).code,403);
 assert.equal((await call('PUT',{body:{...edit,ownerName:'TFA B'}})).code,403);
 assert.equal((await call('PUT',{body:edit,origin:'https://evil.test'})).code,403);
 assert.equal((await call('DELETE',{device:'other'})).code,403);assert.equal(mutations,0);
 assert.equal((await call('DELETE',{origin:'https://evil.test'})).code,403);assert.equal(mutations,0);
 assert.equal((await call('PATCH',{body:{completed:true}})).code,200);assert.equal(row.completed,true);
 assert.equal((await call('DELETE')).code,200);assert.equal(row,null);
 for(const cookies of [{hb_admin:'admin'},{hb_schedule_pass:'pass'}]){reset();assert.equal((await call('PUT',{device:'other',cookies,body:{...edit,ownerName:'TFA B'}})).code,200);assert.equal(row.owner_name,'TFA B')}
 reset();row.owner_token_hash=null;assert.equal(ctx.toPublic(row,hash,'TFA A',false).canEdit,false);assert.equal((await call('PUT',{body:edit})).code,403);
 console.log('PASS: own edit/delete/complete; foreign/anonymous/CSRF/rename denial; admin and persistent owner pass; legacy row isolation');
})().catch(e=>{console.error(e);process.exit(1)});
