import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import {newDb} from 'pg-mem';
import {createAccess,validateApplication,originGuard} from './access.js';

const origin='https://hub.test';
const app=express();app.use(express.json());
const db=newDb();const {Pool}=db.adapters.createPg();const realPool=new Pool();
// pg-mem does not implement PostgreSQL interval age comparisons. Only skip the
// retention maintenance query; request and decision SQL execute against the DB.
const pool={connect:()=>realPool.connect(),query:(sql,args)=>sql.startsWith('DELETE FROM hb_access_requests WHERE (status=')?Promise.resolve({rows:[],rowCount:0}):realPool.query(sql,args)};
const auth=(req,res,next)=>req.headers.authorization==='Bearer test-owner'?(req.admin={email:'owner@test.invalid'},next()):res.status(401).json({error:'unauthorized'});
const access=createAccess({app,pool,auth,dir:process.cwd(),adminEmail:'owner@test.invalid'});
app.get('/api/library',access.requireAccess('library'),(req,res)=>res.json({items:[{title:'protected'}]}));
app.get('/api/library/:id/file',access.requireAccess('library'),(req,res)=>res.send('file'));
app.use((e,req,res,next)=>{console.error(e);res.status(500).json({error:'server_error'})});
await access.init();
const publicGet=url=>request(app).get(url).set('Host','hub.test');
const send=(method,url,cookie)=>request(app)[method](url).set('Host','hub.test').set('Origin',origin).set('Cookie',cookie||'');
const owner=(method,url)=>send(method,url).set('Authorization','Bearer test-owner');
let cookie,id;
test('minimal input, explicit consent and resource validation',()=>{
 const valid={name:'홍길동',employee:'12345',phone:'010-1234-5678',resource:'library',consent:true};
 assert.equal(validateApplication(valid).phone,'01012345678');assert.equal(validateApplication({...valid,consent:false}),null);assert.equal(validateApplication({...valid,resource:'toString'}),null);assert.equal(validateApplication({...valid,phone:'123'}),null);
});
test('unauthorized visitor cannot list or directly download files',async()=>{assert.equal((await publicGet('/api/library')).status,403);assert.equal((await publicGet('/api/library/arbitrary/file')).status,403);assert.equal((await publicGet('/api/approvals/requests')).status,401)});
test('device application deduplicates and binds to a secure HttpOnly cookie',async()=>{
 const first=await publicGet('/api/access/status?resource=library');assert.equal(first.body.status,'none');cookie=first.headers['set-cookie'][0].split(';')[0];assert.match(first.headers['set-cookie'][0],/HttpOnly; Secure; SameSite=Lax/);
 const body={name:'홍길동',employee:'12345',phone:'01012345678',resource:'library',consent:true};
 assert.equal((await send('post','/api/access/request',cookie).send(body)).body.status,'pending');
 assert.equal((await send('post','/api/access/request',cookie).send(body)).status,200);
 const listed=await owner('get','/api/approvals/requests');assert.equal(listed.body.items.length,1);id=listed.body.items[0].id;
 assert.equal((await send('get','/api/library',cookie)).status,403);
});
test('only the owner can approve, and CSRF is rejected',async()=>{
 assert.equal((await send('patch','/api/approvals/requests/'+id,cookie).send({status:'approved'})).status,401);
 assert.equal((await request(app).patch('/api/approvals/requests/'+id).set('Host','hub.test').set('Origin','https://foreign.test').set('Authorization','Bearer test-owner').send({status:'approved'})).status,403);
 assert.equal((await owner('patch','/api/approvals/requests/'+id).send({status:'approved'})).status,200);
});
test('approval is isolated by device and resource; revocation blocks direct download',async()=>{
 assert.equal((await send('get','/api/library',cookie)).status,200);assert.equal((await send('get','/api/library/1/file',cookie)).status,200);
 assert.equal((await publicGet('/api/library')).status,403);
 assert.equal((await send('get','/api/access/status?resource=commission',cookie)).body.status,'none');
 assert.equal((await send('get','/commission/',cookie)).status,302);
 assert.equal((await owner('patch','/api/approvals/requests/'+id).send({status:'revoked'})).status,200);
 assert.equal((await send('get','/api/library/1/file',cookie)).status,403);
});
test('push subscription endpoints require owner auth and validate endpoints',async()=>{
 assert.equal((await send('post','/api/approvals/push').send({subscription:{}})).status,401);
 assert.equal((await owner('post','/api/approvals/push').send({subscription:{endpoint:'https://evil.test/',keys:{}}})).status,400);
});
test.after(async()=>{access.stop();await realPool.end()});
