import crypto from 'node:crypto';
import fs from 'node:fs';
import webpush from 'web-push';

export const RESOURCES = {library:'ACTION HUB 자료실',commission:'생보 수수료 계산기'};
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
export function cookieValue(req, name) {
  const part=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(name+'='));
  return part ? part.slice(name.length+1) : '';
}
export function validateApplication(body) {
  const name=String(body.name||'').trim();
  const employee=String(body.employee||'').trim();
  const phone=String(body.phone||'').replace(/[^0-9]/g,'');
  if(!Object.hasOwn(RESOURCES,body.resource) || name.length<2 || name.length>40 || employee.length<1 || employee.length>30 || !/^01[016789]\d{7,8}$/.test(phone) || body.consent!==true) return null;
  return {name,employee,phone,resource:body.resource};
}
export function originGuard(req,res,next) {
  // Cookies alone must not authorize cross-site approval or enrollment requests.
  const origin=req.get('origin');
  if(!origin || origin !== 'https://'+req.get('host')) return res.status(403).json({error:'origin_denied'});
  next();
}
export function createAccess({app,pool,auth,dir,adminEmail,isAdmin=()=>false}) {
  const wrap=fn=>(req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);
  const limits=new Map();
  let keys, timer;
  function device(req,res,create=false) {
    let value=cookieValue(req,'hb_access');
    if(!/^[A-Za-z0-9_-]{43}$/.test(value)) {
      if(!create)return null;
      value=crypto.randomBytes(32).toString('base64url');
      res.append('Set-Cookie',`hb_access=${value}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=15552000`);
    }
    return hash(value);
  }
  function noStore(req,res,next){res.set('Cache-Control','private, no-store');next();}
  async function allowed(req,resource) {
    if(isAdmin(req))return true;
    const token=device(req);
    if(!token)return false;
    return !!(await pool.query("SELECT 1 FROM hb_access_requests WHERE device_hash=$1 AND resource=$2 AND status='approved'",[token,resource])).rowCount;
  }
  function requireAccess(resource,redirect=false) {
    return wrap(async(req,res,next)=>{
      res.set('Cache-Control','private, no-store');
      if(await allowed(req,resource))return next();
      if(redirect)return res.redirect('/access/?resource='+resource);
      res.status(403).json({error:'approval_required',requestUrl:'/access/?resource='+resource});
    });
  }
  async function init() {
    await pool.query(`CREATE TABLE IF NOT EXISTS hb_access_requests(
      id text PRIMARY KEY, device_hash text NOT NULL, resource text NOT NULL CHECK(resource IN ('library','commission')),
      name text NOT NULL, employee text NOT NULL, phone text NOT NULL,
      status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','revoked')),
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
      reviewed_by text, reviewed_at timestamptz, UNIQUE(device_hash,resource))`);
    await pool.query(`CREATE TABLE IF NOT EXISTS hb_access_audit(id bigserial PRIMARY KEY, request_id text NOT NULL, action text NOT NULL, actor text NOT NULL, created_at timestamptz NOT NULL DEFAULT now())`);
    await pool.query(`CREATE TABLE IF NOT EXISTS hb_approval_keys(id text PRIMARY KEY, public_key text NOT NULL, private_key text NOT NULL)`);
    const generated=webpush.generateVAPIDKeys();
    await pool.query("INSERT INTO hb_approval_keys VALUES('main',$1,$2) ON CONFLICT DO NOTHING",[generated.publicKey,generated.privateKey]);
    keys=(await pool.query("SELECT public_key,private_key FROM hb_approval_keys WHERE id='main'")).rows[0];
    await pool.query(`CREATE TABLE IF NOT EXISTS hb_approval_push(id text PRIMARY KEY, subscription jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now())`);
    await pool.query(`CREATE TABLE IF NOT EXISTS hb_approval_outbox(id text PRIMARY KEY, subscriber text NOT NULL REFERENCES hb_approval_push(id) ON DELETE CASCADE,
      payload jsonb NOT NULL, attempts integer NOT NULL DEFAULT 0, next_at timestamptz NOT NULL DEFAULT now(), sent_at timestamptz)`);
    async function cleanup(){
      await pool.query("DELETE FROM hb_access_requests WHERE (status='pending' AND created_at < now()-interval '90 days') OR (status IN ('rejected','revoked') AND reviewed_at < now()-interval '30 days')");
      await pool.query("DELETE FROM hb_approval_outbox WHERE (sent_at IS NOT NULL AND sent_at < now()-interval '7 days') OR (attempts>=5 AND next_at < now()-interval '7 days')");
    }
    await cleanup();
    const cleanupTimer=setInterval(()=>cleanup().catch(()=>console.warn('approval retention cleanup pending')),86400000);cleanupTimer.unref();
    timer=setInterval(deliver,15000);timer.unref();
    void deliver();
  }
  let busy=false;
  async function deliver(){
    if(busy||!keys)return;busy=true;
    try {
      const jobs=(await pool.query(`SELECT o.*,s.subscription FROM hb_approval_outbox o JOIN hb_approval_push s ON s.id=o.subscriber
        WHERE o.sent_at IS NULL AND o.attempts<5 AND o.next_at<=now() ORDER BY o.next_at LIMIT 20`)).rows;
      for(const job of jobs)try {
        await webpush.sendNotification(job.subscription,JSON.stringify(job.payload),{TTL:86400,timeout:10000,vapidDetails:{subject:'mailto:'+adminEmail,publicKey:keys.public_key,privateKey:keys.private_key}});
        await pool.query('UPDATE hb_approval_outbox SET sent_at=now() WHERE id=$1',[job.id]);
      }catch(e){
        if([404,410].includes(e.statusCode))await pool.query('DELETE FROM hb_approval_push WHERE id=$1',[job.subscriber]);
        else await pool.query("UPDATE hb_approval_outbox SET attempts=attempts+1,next_at=now()+interval '1 minute'*power(2,attempts) WHERE id=$1",[job.id]);
      }
    }catch{console.warn('approval notification delivery pending')}finally{busy=false}
  }
  app.use(['/api/access','/api/approvals','/commission'],noStore);
  app.get('/api/access/status',wrap(async(req,res)=>{
    const resource=String(req.query.resource||'library');
    if(!Object.hasOwn(RESOURCES,resource))return res.status(400).json({error:'invalid_resource'});
    if(isAdmin(req))return res.json({resource,label:RESOURCES[resource],status:'approved',owner:true,updatedAt:null});
    const token=device(req,res,true);
    const row=(await pool.query('SELECT status,updated_at FROM hb_access_requests WHERE device_hash=$1 AND resource=$2',[token,resource])).rows[0];
    res.json({resource,label:RESOURCES[resource],status:row?.status||'none',updatedAt:row?.updated_at||null});
  }));
  app.post('/api/access/request',originGuard,wrap(async(req,res)=>{
    const form=validateApplication(req.body||{});
    if(!form)return res.status(400).json({error:'invalid_application'});
    const token=device(req,res);
    if(!token)return res.status(400).json({error:'device_required'});
    const ip=token;
    const count=limits.get(ip)||{n:0,until:0};
    if(count.until<Date.now()){count.n=0;count.until=Date.now()+3600000;}
    if(++count.n>5)return res.status(429).json({error:'too_many_requests'});
    limits.set(ip,count);if(limits.size>5000)for(const [key,x] of limits)if(x.until<Date.now())limits.delete(key);
    const client=await pool.connect();
    try{
      await client.query('BEGIN');
      const row=(await client.query(`INSERT INTO hb_access_requests(id,device_hash,resource,name,employee,phone)
        VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(device_hash,resource) DO NOTHING RETURNING id`,
        [crypto.randomUUID(),token,form.resource,form.name,form.employee,form.phone])).rows[0];
      if(row){
        await client.query("INSERT INTO hb_access_audit(request_id,action,actor) VALUES($1,'requested','applicant')",[row.id]);
        // Do not put applicant names, employee numbers or phone numbers on the lock screen.
        const payload={title:'HB 승인센터 · 새 이용 신청',body:RESOURCES[form.resource]+' 이용 신청이 도착했습니다.',url:'/approvals/',tag:'approval-'+row.id};
        await client.query(`INSERT INTO hb_approval_outbox(id,subscriber,payload)
          SELECT $1||':'||id,id,$2::jsonb FROM hb_approval_push ON CONFLICT DO NOTHING`,[row.id,JSON.stringify(payload)]);
      }
      const state=(await client.query('SELECT status FROM hb_access_requests WHERE device_hash=$1 AND resource=$2',[token,form.resource])).rows[0];
      await client.query('COMMIT');res.json({ok:true,status:state.status});void deliver();
    }catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}
  }));
  app.get('/api/approvals/requests',auth,wrap(async(req,res)=>{
    const rows=(await pool.query(`SELECT id,resource,name,employee,phone,status,created_at,reviewed_at FROM hb_access_requests ORDER BY created_at DESC LIMIT 1000`)).rows;
    res.json({items:rows});
  }));
  app.patch('/api/approvals/requests/:id',originGuard,auth,wrap(async(req,res)=>{
    const status=req.body?.status;
    if(!['approved','rejected','revoked'].includes(status))return res.status(400).json({error:'invalid_status'});
    const client=await pool.connect();
    try{
      await client.query('BEGIN');
      const row=(await client.query(`SELECT id,status FROM hb_access_requests WHERE id=$1 FOR UPDATE`,[req.params.id])).rows[0];
      if(!row){await client.query('ROLLBACK');return res.status(404).json({error:'not_found'})}
      const valid={pending:['approved','rejected'],approved:['revoked'],rejected:['approved'],revoked:['approved']};
      if(!valid[row.status]?.includes(status)){await client.query('ROLLBACK');return res.status(409).json({error:'status_changed'})}
      await client.query('UPDATE hb_access_requests SET status=$1,reviewed_by=$2,reviewed_at=now(),updated_at=now() WHERE id=$3',[status,req.admin.email,row.id]);
      await client.query('INSERT INTO hb_access_audit(request_id,action,actor) VALUES($1,$2,$3)',[row.id,status,req.admin.email]);
      await client.query('COMMIT');res.json({ok:true});
    }catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}
  }));
  app.get('/api/approvals/push',auth,(req,res)=>res.json({publicKey:keys.public_key}));
  app.post('/api/approvals/push',originGuard,auth,wrap(async(req,res)=>{
    const s=req.body?.subscription;
    const {validSubscription}=await import('./push.js');
    if(!s||!validSubscription(s))return res.status(400).json({error:'invalid_subscription'});
    await pool.query(`INSERT INTO hb_approval_push(id,subscription) VALUES($1,$2)
      ON CONFLICT(id) DO UPDATE SET subscription=EXCLUDED.subscription`,[hash(s.endpoint),JSON.stringify(s)]);
    res.json({ok:true});
  }));
  app.delete('/api/approvals/push',originGuard,auth,wrap(async(req,res)=>{
    if(typeof req.body?.endpoint!=='string')return res.status(400).json({error:'invalid_endpoint'});
    await pool.query('DELETE FROM hb_approval_push WHERE id=$1',[hash(req.body.endpoint)]);res.json({ok:true});
  }));
  app.post('/api/approvals/push/test',originGuard,auth,wrap(async(req,res)=>{
    const row=(await pool.query('SELECT subscription FROM hb_approval_push WHERE id=$1',[hash(String(req.body?.endpoint||''))])).rows[0];
    if(!row)return res.status(404).json({error:'not_connected'});
    try{await webpush.sendNotification(row.subscription,JSON.stringify({title:'HB 승인센터',body:'이 기기에 신청 알림이 연결되었습니다.',url:'/approvals/',tag:'approval-test'}),{TTL:300,timeout:10000,vapidDetails:{subject:'mailto:'+adminEmail,publicKey:keys.public_key,privateKey:keys.private_key}});res.json({ok:true});}
    catch{res.status(502).json({error:'push_failed'})}
  }));
  app.get(['/commission','/commission/','/commission/index.html'],requireAccess('commission',true),(req,res)=>{
    const secret=process.env.COMMISSION_CONTENT_KEY;
    if(!secret)return res.status(503).send('계산기 연결 준비 중입니다. 잠시 후 다시 이용해 주세요.');
    const bytes=fs.readFileSync(dir+'/commission.enc');
    const decipher=crypto.createDecipheriv('aes-256-gcm',Buffer.from(secret,'base64'),bytes.subarray(0,12));
    decipher.setAuthTag(bytes.subarray(12,28));
    res.type('html').set('Content-Security-Policy',"frame-ancestors 'self'").send(Buffer.concat([decipher.update(bytes.subarray(28)),decipher.final()]));
  });
  app.get('/api/commission-fx',requireAccess('commission'),wrap(async(req,res)=>{
    const r=await fetch('https://hbtoolbox.vercel.app/api/commission-fx',{signal:AbortSignal.timeout(15000)});
    if(!r.ok)return res.status(503).json({error:'환율을 불러오지 못했습니다. 계약 환율을 직접 입력해 주세요.'});
    res.json(await r.json());
  }));
  return {init,requireAccess,allowed,stop:()=>clearInterval(timer)};
}
