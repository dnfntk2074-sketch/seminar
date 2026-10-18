// Isolated preview only. Never connects to a production database.
import express from 'express';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {newDb} from 'pg-mem';
import {createAccess,originGuard} from './access.js';
if(process.env.HB_APPROVAL_PREVIEW!=='1'||process.env.DATABASE_URL||!(process.env.PREVIEW_ADMIN_TOKEN?.length>=32))throw Error('isolated_preview_required');
const token=process.env.PREVIEW_ADMIN_TOKEN,app=express(),dir=path.dirname(fileURLToPath(import.meta.url));
app.use(express.json());app.use((req,res,next)=>{res.set('Cache-Control','no-store');next()});
app.use(express.static(path.join(dir,'public')));
const db=newDb(),{Pool}=db.adapters.createPg(),realPool=new Pool();
const pool={connect:()=>realPool.connect(),query:(sql,args)=>(sql.startsWith('DELETE FROM hb_access_requests WHERE (status=')||sql.startsWith('DELETE FROM hb_approval_outbox WHERE (sent_at'))?Promise.resolve({rows:[],rowCount:0}):realPool.query(sql,args)};
function isOwner(req){return req.get('authorization')==='Bearer '+token||(req.headers.cookie||'').split(';').some(x=>x.trim()==='hb_preview_owner='+token)}
function auth(req,res,next){if(!isOwner(req))return res.status(401).json({error:'unauthorized'});req.admin={email:'preview@hb.test'};next()}
app.get('/api/admin/me',auth,(req,res)=>res.json(req.admin));
app.post('/api/admin/login',originGuard,(req,res)=>{if(req.body?.email!=='preview@hb.test'||req.body?.password!==token)return res.status(401).json({error:'unauthorized'});res.append('Set-Cookie',`hb_preview_owner=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=3600`);res.json({ok:true})});
app.post('/api/admin/logout',originGuard,(req,res)=>{res.append('Set-Cookie','hb_preview_owner=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0');res.json({ok:true})});
const fixtureDir=fs.mkdtempSync(path.join(os.tmpdir(),'hb-preview-')),key=crypto.randomBytes(32),iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',key,iv),encrypted=Buffer.concat([cipher.update('<!doctype html><html lang="ko"><title>테스트 계산기</title><h1>테스트 계산기</h1><p>운영 자료가 없는 권한 검증용 화면입니다.</p></html>'),cipher.final()]);
fs.writeFileSync(path.join(fixtureDir,'commission.enc'),Buffer.concat([iv,cipher.getAuthTag(),encrypted]));process.env.COMMISSION_CONTENT_KEY=key.toString('base64');
const access=createAccess({app,pool,auth,dir:fixtureDir,adminEmail:'preview@hb.test',isAdmin:isOwner});
app.get('/api/library',access.requireAccess('library'),(req,res)=>res.json({items:[{id:'preview-document',title:'검증용 자료',fileSize:13}]}));
app.get('/api/library/:id/file',access.requireAccess('library'),(req,res)=>res.type('text').send('preview-only'));
app.get('/health',(req,res)=>res.json({ok:true,isolated:true}));
app.use((error,req,res,next)=>{console.error('preview request failed');res.status(500).json({error:'server_error'})});
await access.init();app.listen(process.env.PORT||3000,'0.0.0.0',()=>console.log('Isolated approval preview ready'));
