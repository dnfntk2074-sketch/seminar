import express from "express";
import pg from "pg";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
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
function isTest(s){
  const t=((s.ownerName||"")+" "+(s.customerName||"")).toLowerCase();
  return ["테스트","점검","test"].some(w=>t.includes(w));
}
async function init(){
  await pool.query(`CREATE TABLE IF NOT EXISTS app_settings(
    id text primary key default 'main',
    marquee_mode text not null default 'auto',
    marquee_text text not null default '',
    mvp_enabled boolean not null default true,
    mvp_title text not null default '한주 최다 방문 MVP',
    app_title text not null default '유료DB ACTION HUB',
    app_subtitle text not null default '방문 · 학습 · 콜 활동을 한눈에 공유합니다.',
    logo_height integer not null default 36
  )`);
  await pool.query(`INSERT INTO app_settings(id) VALUES('main') ON CONFLICT DO NOTHING`);
  await pool.query(`CREATE TABLE IF NOT EXISTS deleted_schedules(schedule_id text primary key, deleted_at timestamptz default now())`);
  await pool.query(`CREATE TABLE IF NOT EXISTS admin_auth(email text primary key, password_hash text not null, updated_at timestamptz default now())`);
  const r=await pool.query("SELECT 1 FROM admin_auth WHERE email=$1",[ADMIN_EMAIL]);
  if(!r.rowCount){
    const hash=await bcrypt.hash(ADMIN_PASSWORD,12);
    await pool.query("INSERT INTO admin_auth(email,password_hash) VALUES($1,$2)",[ADMIN_EMAIL,hash]);
  }
}
async function getFloot(){
  const r=await fetch(FLOOT+"/hub-data");
  if(!r.ok) throw new Error("upstream");
  const j=await r.json();
  return j?.json?.schedules||[];
}
async function getDeleted(){
  const r=await pool.query("SELECT schedule_id FROM deleted_schedules");
  return new Set(r.rows.map(x=>x.schedule_id));
}
async function getSettings(){
  const r=await pool.query("SELECT * FROM app_settings WHERE id='main'");
  return r.rows[0];
}

app.get("/api/data", async(req,res)=>{
  try{
    const [all,del,settings]=await Promise.all([getFloot(),getDeleted(),getSettings()]);
    res.json({schedules:all.filter(s=>!del.has(String(s.id))&&!isTest(s)),settings});
  }catch(e){res.status(500).json({error:"load_failed"});}
});

app.post("/api/register", async(req,res)=>{
  const {ownerName,place,date,time}=req.body||{};
  if(!ownerName||!place||!date||!time) return res.status(400).json({error:"missing"});
  const r=await fetch(FLOOT+"/public-visit",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({ownerName,place,date,time})});
  const text=await r.text();
  res.status(r.status).type(r.headers.get("content-type")||"application/json").send(text);
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
  try{
    const [all,del]=await Promise.all([getFloot(),getDeleted()]);
    res.json({schedules:all.map(s=>({...s,deleted:del.has(String(s.id))}))});
  }catch{res.status(500).json({error:"load_failed"});}
});
app.delete("/api/admin/schedules/:id",auth,async(req,res)=>{
  await pool.query("INSERT INTO deleted_schedules(schedule_id) VALUES($1) ON CONFLICT DO NOTHING",[req.params.id]);
  res.json({ok:true});
});
app.post("/api/admin/schedules/:id/restore",auth,async(req,res)=>{
  await pool.query("DELETE FROM deleted_schedules WHERE schedule_id=$1",[req.params.id]);
  res.json({ok:true});
});
app.get("/api/admin/settings",auth,async(req,res)=>res.json(await getSettings()));
app.put("/api/admin/settings",auth,async(req,res)=>{
  const s=req.body||{};
  await pool.query(`UPDATE app_settings SET marquee_mode=$1,marquee_text=$2,mvp_enabled=$3,mvp_title=$4,app_title=$5,app_subtitle=$6,logo_height=$7 WHERE id='main'`,
    [s.marquee_mode||"auto",s.marquee_text||"",!!s.mvp_enabled,s.mvp_title||"한주 최다 방문 MVP",s.app_title||"유료DB ACTION HUB",s.app_subtitle||"",Number(s.logo_height)||36]);
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
