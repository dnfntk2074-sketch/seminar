import express from "express";
import pg from "pg";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";

const { Pool } = pg;
const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const DATABASE_URL = process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET || "change-me";
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "dnfntk2074@gmail.com").toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "ChangeMe!2026";
const FLOOT = "https://guri-leaders-hb-db-hub.floot.app/_api";
const pool = new Pool({ connectionString: DATABASE_URL, ssl: DATABASE_URL?.includes("railway") ? { rejectUnauthorized:false } : undefined });

app.use(express.json());
app.use(express.static(path.join(__dirname,"public")));

function parseCookies(req){
  const h=req.headers.cookie||"";
  return Object.fromEntries(h.split(";").map(v=>v.trim()).filter(Boolean).map(v=>{const i=v.indexOf("="); return [decodeURIComponent(v.slice(0,i)),decodeURIComponent(v.slice(i+1))]}));
}
function auth(req,res,next){
  try{
    const t=parseCookies(req).hb_admin;
    if(!t) throw new Error();
    const p=jwt.verify(t,JWT_SECRET);
    if((p.email||"").toLowerCase()!==ADMIN_EMAIL) throw new Error();
    req.admin=p; next();
  }catch{ res.status(401).json({error:"unauthorized"}); }
}
function tokenHash(token){ return crypto.createHash("sha256").update(String(token||"")).digest("hex"); }
function isTest(s){
  const t=((s.owner_name||s.ownerName||"")+" "+(s.customer_name||s.customerName||"")).toLowerCase();
  return ["테스트","점검","test"].some(w=>t.includes(w));
}
function sameOwnerName(a,b){return String(a||"").trim()===String(b||"").trim()}
function toPublic(row,hash,ownerName){
  return {
    id:String(row.id), ownerName:row.owner_name, customerName:row.customer_name,
    scheduledAt:new Date(row.scheduled_at).toISOString(),
    canEdit:!!hash && !!ownerName && sameOwnerName(row.owner_name,ownerName) && !!row.owner_token_hash && crypto.timingSafeEqual(Buffer.from(hash),Buffer.from(row.owner_token_hash))
  };
}
async function init(){
  await pool.query(`CREATE TABLE IF NOT EXISTS app_settings(
    id text primary key default 'main',
    marquee_mode text not null default 'auto',
    marquee_text text not null default '',
    mvp_enabled boolean not null default true,
    mvp_title text not null default '한주 최다 방문 MVP',
    app_title text not null default '유료DB ACTION HUB',
    app_subtitle text not null default '방문 · 학습 · 콜 활동을 한눈에 공유합니다.'
  )`);
  await pool.query(`INSERT INTO app_settings(id) VALUES('main') ON CONFLICT DO NOTHING`);
  await pool.query(`CREATE TABLE IF NOT EXISTS schedules(
    id text primary key,
    owner_name text not null,
    customer_name text not null,
    scheduled_at timestamptz not null,
    owner_token_hash text,
    source text not null default 'local',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS purged_schedule_ids(schedule_id text primary key, purged_at timestamptz not null default now())`);
  const old=await pool.query(`SELECT to_regclass('public.deleted_schedules') AS t`);
  if(old.rows[0]?.t){
    await pool.query(`INSERT INTO purged_schedule_ids(schedule_id) SELECT schedule_id FROM deleted_schedules ON CONFLICT DO NOTHING`);
    await pool.query(`DROP TABLE deleted_schedules`);
  }
  await pool.query(`CREATE TABLE IF NOT EXISTS admin_auth(email text primary key, password_hash text not null, updated_at timestamptz default now())`);
  const r=await pool.query("SELECT 1 FROM admin_auth WHERE email=$1",[ADMIN_EMAIL]);
  if(!r.rowCount){
    const hash=await bcrypt.hash(ADMIN_PASSWORD,12);
    await pool.query("INSERT INTO admin_auth(email,password_hash) VALUES($1,$2)",[ADMIN_EMAIL,hash]);
  }
}
async function syncFloot(){
  try{
    const r=await fetch(FLOOT+"/hub-data",{signal:AbortSignal.timeout(5000)});
    if(!r.ok) return;
    const j=await r.json();
    const all=j?.json?.schedules||[];
    const purged=new Set((await pool.query("SELECT schedule_id FROM purged_schedule_ids")).rows.map(x=>String(x.schedule_id)));
    for(const s of all){
      const id=String(s.id||"");
      if(!id||purged.has(id)||!s.ownerName||!s.customerName||!s.scheduledAt) continue;
      await pool.query(`INSERT INTO schedules(id,owner_name,customer_name,scheduled_at,source)
        VALUES($1,$2,$3,$4,'upstream')
        ON CONFLICT(id) DO UPDATE SET owner_name=EXCLUDED.owner_name,customer_name=EXCLUDED.customer_name,scheduled_at=EXCLUDED.scheduled_at,updated_at=now()
        WHERE schedules.source='upstream'`,[id,s.ownerName,s.customerName,s.scheduledAt]);
    }
  }catch(e){ console.warn("upstream sync skipped",e.message); }
}
async function getSettings(){
  const r=await pool.query("SELECT marquee_mode,marquee_text,mvp_enabled,mvp_title,app_title,app_subtitle FROM app_settings WHERE id='main'");
  return r.rows[0];
}
function makeCustomer(type,place){
  if(type==="study") return "[DB학습회] "+place;
  if(type==="call") return "[콜번개] "+place;
  return place;
}

app.get("/api/data", async(req,res)=>{
  try{
    await syncFloot();
    const [rows,settings]=await Promise.all([pool.query("SELECT * FROM schedules ORDER BY scheduled_at ASC"),getSettings()]);
    const h=req.get("x-owner-token")?tokenHash(req.get("x-owner-token")):"";
    const ownerName=(req.get("x-owner-name")||"").trim();
    res.json({schedules:rows.rows.filter(s=>!isTest(s)).map(s=>toPublic(s,h,ownerName)),settings});
  }catch(e){console.error(e);res.status(500).json({error:"load_failed"});}
});

app.post("/api/register", async(req,res)=>{
  const {ownerName,place,date,time,type="visit",ownerToken}=req.body||{};
  if(!ownerName||!place||!date||!time||!ownerToken||!["visit","study","call"].includes(type)) return res.status(400).json({error:"missing"});
  const at=new Date(`${date}T${time}:00+09:00`);
  if(Number.isNaN(at.getTime())) return res.status(400).json({error:"invalid_date"});
  const id=crypto.randomUUID();
  await pool.query(`INSERT INTO schedules(id,owner_name,customer_name,scheduled_at,owner_token_hash,source) VALUES($1,$2,$3,$4,$5,'local')`,
    [id,String(ownerName).trim(),makeCustomer(type,String(place).trim()),at.toISOString(),tokenHash(ownerToken)]);
  res.json({ok:true,id});
});

app.put("/api/schedules/:id",async(req,res)=>{
  const {ownerName,place,date,time,type="visit",ownerToken}=req.body||{};
  if(!ownerName||!place||!date||!time||!ownerToken||!["visit","study","call"].includes(type)) return res.status(400).json({error:"missing"});
  const at=new Date(`${date}T${time}:00+09:00`);
  if(Number.isNaN(at.getTime())) return res.status(400).json({error:"invalid_date"});
  const r=await pool.query("SELECT owner_name,owner_token_hash FROM schedules WHERE id=$1",[req.params.id]);
  const ownerIdentity=(req.get("x-owner-name")||"").trim();
  if(!r.rowCount||!ownerIdentity||!sameOwnerName(r.rows[0].owner_name,ownerIdentity)||!r.rows[0].owner_token_hash||r.rows[0].owner_token_hash!==tokenHash(ownerToken)) return res.status(403).json({error:"forbidden"});
  await pool.query("UPDATE schedules SET owner_name=$1,customer_name=$2,scheduled_at=$3,updated_at=now() WHERE id=$4",
    [String(ownerName).trim(),makeCustomer(type,String(place).trim()),at.toISOString(),req.params.id]);
  res.json({ok:true});
});
app.delete("/api/schedules/:id",async(req,res)=>{
  const ownerToken=req.get("x-owner-token")||req.body?.ownerToken||"";
  const r=await pool.query("SELECT owner_name,owner_token_hash FROM schedules WHERE id=$1",[req.params.id]);
  const ownerIdentity=(req.get("x-owner-name")||"").trim();
  if(!r.rowCount||!ownerIdentity||!sameOwnerName(r.rows[0].owner_name,ownerIdentity)||!r.rows[0].owner_token_hash||r.rows[0].owner_token_hash!==tokenHash(ownerToken)) return res.status(403).json({error:"forbidden"});
  await pool.query("DELETE FROM schedules WHERE id=$1",[req.params.id]);
  res.json({ok:true});
});

app.post("/api/admin/login",async(req,res)=>{
  const email=(req.body?.email||"").toLowerCase();
  const password=req.body?.password||"";
  if(email!==ADMIN_EMAIL) return res.status(401).json({error:"invalid"});
  const r=await pool.query("SELECT password_hash FROM admin_auth WHERE email=$1",[ADMIN_EMAIL]);
  if(!r.rowCount || !(await bcrypt.compare(password,r.rows[0].password_hash))) return res.status(401).json({error:"invalid"});
  const token=jwt.sign({email:ADMIN_EMAIL},JWT_SECRET,{expiresIn:"7d"});
  res.setHeader("Set-Cookie",`hb_admin=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800`);
  res.json({ok:true});
});
app.post("/api/admin/logout",(req,res)=>{res.setHeader("Set-Cookie","hb_admin=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0");res.json({ok:true})});
app.get("/api/admin/me",auth,(req,res)=>res.json({email:req.admin.email}));
app.get("/api/admin/schedules",auth,async(req,res)=>{
  try{await syncFloot();const r=await pool.query("SELECT id,owner_name AS \"ownerName\",customer_name AS \"customerName\",scheduled_at AS \"scheduledAt\",source FROM schedules ORDER BY scheduled_at DESC LIMIT 100");res.json({schedules:r.rows});}
  catch{res.status(500).json({error:"load_failed"});}
});
app.delete("/api/admin/schedules/:id",auth,async(req,res)=>{
  const r=await pool.query("SELECT source FROM schedules WHERE id=$1",[req.params.id]);
  if(r.rowCount&&r.rows[0].source==='upstream') await pool.query("INSERT INTO purged_schedule_ids(schedule_id) VALUES($1) ON CONFLICT DO NOTHING",[req.params.id]);
  await pool.query("DELETE FROM schedules WHERE id=$1",[req.params.id]);
  res.json({ok:true});
});
app.get("/api/admin/settings",auth,async(req,res)=>res.json(await getSettings()));
app.put("/api/admin/settings",auth,async(req,res)=>{
  const s=req.body||{};
  await pool.query(`UPDATE app_settings SET marquee_mode=$1,marquee_text=$2,mvp_enabled=$3,mvp_title=$4,app_title=$5,app_subtitle=$6 WHERE id='main'`,
    [s.marquee_mode||"auto",s.marquee_text||"",!!s.mvp_enabled,s.mvp_title||"한주 최다 방문 MVP",s.app_title||"유료DB ACTION HUB",s.app_subtitle||""]);
  res.json({ok:true});
});
app.post("/api/admin/change-password",auth,async(req,res)=>{
  const p=req.body?.password||"";
  if(p.length<8) return res.status(400).json({error:"too_short"});
  const hash=await bcrypt.hash(p,12);
  await pool.query("UPDATE admin_auth SET password_hash=$1,updated_at=now() WHERE email=$2",[hash,ADMIN_EMAIL]);
  res.json({ok:true});
});

app.get("/admin",(req,res)=>res.sendFile(path.join(__dirname,"public","admin.html")));
app.get("*",(req,res)=>res.sendFile(path.join(__dirname,"public","index.html")));

init().then(()=>app.listen(PORT,"0.0.0.0",()=>console.log("HB ACTION HUB listening",PORT))).catch(e=>{console.error(e);process.exit(1);});
