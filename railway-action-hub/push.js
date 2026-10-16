import webpush from 'web-push';
import crypto from 'node:crypto';
const names=['이충학 지점장','이미라 단장','이중재 EM','차지혜 실장'];
const hash=v=>crypto.createHash('sha256').update(String(v||'')).digest('hex');
export function validSubscription(s){
  try{const u=new URL(s.endpoint);return u.protocol==='https:'&&u.port===''&&!u.username&&!u.password&&(/^(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|web\.push\.apple\.com)$/.test(u.hostname)||u.hostname.endsWith('.notify.windows.com'))&&/^[A-Za-z0-9_-]{80,100}$/.test(s.keys?.p256dh)&&/^[A-Za-z0-9_-]{20,30}$/.test(s.keys?.auth)}catch{return false}
}
export function activityPayload(kind,s){
 if(kind==='notice'){
  const text=String(s.content||'').replace(/\\r\\n|\\n|\/n/gi,' ').replace(/\s+/g,' ').trim();
  return {title:'📢 새 공지 · 구리리더스HB',body:(String(s.title||'새 공지')+(text?' · '+text:'')).slice(0,140),url:'/?notice='+encodeURIComponent(s.id),tag:'notice-'+s.id};
 }
 const type=String(s.customer_name||'').startsWith('[후속상담]')?'후속상담':String(s.customer_name||'').startsWith('[고객관리]')?'고객관리':'신규상담';return {title:kind==='registered'?'새 활동 등록':'활동 완료',body:`${String(s.owner_name||'').slice(0,40)} TFA · ${type} · ${new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(s.scheduled_at))}`,url:'/',tag:`${kind}-${s.id}`}}
export async function installPush(app,pool,auth){
  await pool.query(`CREATE TABLE IF NOT EXISTS push_config(id text primary key,public_key text not null,private_key text not null)`);
  await pool.query(`CREATE TABLE IF NOT EXISTS push_recipients(id integer primary key, name text not null, token_hash text, subscription jsonb, connected_at timestamptz, invite_expires_at timestamptz)`);
  await pool.query(`CREATE TABLE IF NOT EXISTS push_events(id text primary key,payload jsonb not null,created_at timestamptz default now())`);
  await pool.query(`CREATE TABLE IF NOT EXISTS push_deliveries(event_id text references push_events(id),recipient_id integer references push_recipients(id),subscription jsonb not null,attempts integer default 0,next_at timestamptz default now(),sent_at timestamptz,last_status text,primary key(event_id,recipient_id))`);
  const keys=webpush.generateVAPIDKeys();await pool.query(`INSERT INTO push_config VALUES('main',$1,$2) ON CONFLICT DO NOTHING`,[keys.publicKey,keys.privateKey]);
  const config=(await pool.query(`SELECT * FROM push_config WHERE id='main'`)).rows[0];webpush.setVapidDetails('https://action-hub-web-production.up.railway.app',config.public_key,config.private_key);
  for(let i=0;i<names.length;i++)await pool.query(`INSERT INTO push_recipients(id,name) VALUES($1,$2) ON CONFLICT DO NOTHING`,[i+1,names[i]]);
  const wrap=fn=>(req,res,next)=>Promise.resolve(fn(req,res)).catch(next);
  const identity=async req=>(await pool.query(`SELECT * FROM push_recipients WHERE token_hash=$1 AND (connected_at IS NOT NULL OR invite_expires_at>now())`,[hash(req.body?.token)])).rows[0];
  app.get('/api/admin/push',auth,wrap(async(req,res)=>res.json({recipients:(await pool.query(`SELECT id,name,connected_at AS "connectedAt",subscription IS NOT NULL AS connected FROM push_recipients ORDER BY id`)).rows})));
  app.post('/api/admin/push/invite',auth,wrap(async(req,res)=>{const id=Number(req.body?.id);if(![1,2,3,4].includes(id))return res.status(400).json({error:'invalid'});const token=crypto.randomBytes(32).toString('base64url');await pool.query(`UPDATE push_recipients SET token_hash=$1,subscription=NULL,connected_at=NULL,invite_expires_at=now()+interval '7 days' WHERE id=$2`,[hash(token),id]);res.json({path:'/push.html#'+token})}));
  app.post('/api/push/info',wrap(async(req,res)=>{const p=await identity(req);if(!p)return res.status(403).json({error:'invalid_link'});res.setHeader('Cache-Control','no-store');res.json({name:p.name,publicKey:config.public_key,connected:!!p.subscription})}));
  app.post('/api/push/subscribe',wrap(async(req,res)=>{const p=await identity(req);if(!p)return res.status(403).json({error:'invalid_link'});if(!validSubscription(req.body?.subscription))return res.status(400).json({error:'invalid_subscription'});await pool.query(`UPDATE push_recipients SET subscription=$1,connected_at=now() WHERE id=$2`,[JSON.stringify(req.body.subscription),p.id]);res.json({ok:true})}));
  app.post('/api/push/unsubscribe',wrap(async(req,res)=>{const p=await identity(req);if(!p)return res.status(403).json({error:'invalid_link'});await pool.query(`UPDATE push_recipients SET subscription=NULL WHERE id=$1`,[p.id]);res.json({ok:true})}));
  app.post('/api/push/test',wrap(async(req,res)=>{const p=await identity(req);if(!p?.subscription)return res.status(403).json({error:'not_connected'});try{await webpush.sendNotification(p.subscription,JSON.stringify({title:'ACTION HUB 알림 연결 확인',body:p.name+'님의 휴대폰에 알림이 연결되었습니다.',url:'/push.html',tag:'connection-test'}),{TTL:300,timeout:10000});res.json({ok:true})}catch(e){res.status(502).json({error:'push_failed'})}}));
  // Public opt-in endpoints manage only this device's notification subscription.
  await pool.query(`CREATE SEQUENCE IF NOT EXISTS push_member_id_seq START WITH 5`);
  await pool.query(`ALTER TABLE push_recipients ADD COLUMN IF NOT EXISTS device_token_hash text`);
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS push_member_token_unique ON push_recipients(device_token_hash) WHERE device_token_hash IS NOT NULL`);
  const deviceToken=req=>/^[A-Za-z0-9_-]{43,100}$/.test(String(req.body?.deviceToken||''))?hash(req.body.deviceToken):null;
  app.get('/api/push/public-key',wrap(async(req,res)=>{res.setHeader('Cache-Control','no-store');res.json({publicKey:config.public_key})}));
  app.post('/api/push/member/status',wrap(async(req,res)=>{
    const tokenHash=deviceToken(req);if(!tokenHash)return res.status(400).json({error:'invalid_token'});
    const p=(await pool.query(`SELECT subscription IS NOT NULL AS connected FROM push_recipients WHERE device_token_hash=$1`,[tokenHash])).rows[0];
    res.setHeader('Cache-Control','no-store');res.json({connected:!!p?.connected});
  }));
  app.post('/api/push/member/subscribe',wrap(async(req,res)=>{
    const tokenHash=deviceToken(req);if(!tokenHash)return res.status(400).json({error:'invalid_token'});
    if(!validSubscription(req.body?.subscription))return res.status(400).json({error:'invalid_subscription'});
    const name=String(req.body?.name||'TFA').trim().slice(0,50)||'TFA';
    await pool.query(`INSERT INTO push_recipients(id,name,device_token_hash,subscription,connected_at)
      VALUES(nextval('push_member_id_seq'),$1,$2,$3,now())
      ON CONFLICT(device_token_hash) WHERE device_token_hash IS NOT NULL
      DO UPDATE SET name=EXCLUDED.name,subscription=EXCLUDED.subscription,connected_at=now()`,[name,tokenHash,JSON.stringify(req.body.subscription)]);
    res.json({ok:true});
  }));
  app.post('/api/push/member/unsubscribe',wrap(async(req,res)=>{
    const tokenHash=deviceToken(req);if(!tokenHash)return res.status(400).json({error:'invalid_token'});
    // A device may also have an old leader invitation; turn off that same endpoint too.
    await pool.query(`UPDATE push_recipients SET subscription=NULL WHERE device_token_hash=$1
      OR subscription->>'endpoint' IN (SELECT subscription->>'endpoint' FROM push_recipients WHERE device_token_hash=$1 AND subscription IS NOT NULL)`,[tokenHash]);
    res.json({ok:true});
  }));

  let busy=false;
  async function deliver(){if(busy)return;busy=true;try{const rows=(await pool.query(`SELECT * FROM push_deliveries WHERE sent_at IS NULL AND attempts<5 AND next_at<=now() ORDER BY next_at LIMIT 20`)).rows;for(const d of rows){const current=(await pool.query(`SELECT subscription FROM push_recipients WHERE id=$1`,[d.recipient_id])).rows[0]?.subscription;if(!current||current.endpoint!==d.subscription.endpoint){await pool.query(`UPDATE push_deliveries SET attempts=5,last_status='disconnected' WHERE event_id=$1 AND recipient_id=$2`,[d.event_id,d.recipient_id]);continue}const payload=(await pool.query(`SELECT payload FROM push_events WHERE id=$1`,[d.event_id])).rows[0]?.payload;try{await webpush.sendNotification(d.subscription,JSON.stringify(payload),{TTL:86400,timeout:10000});await pool.query(`UPDATE push_deliveries SET sent_at=now(),last_status='accepted' WHERE event_id=$1 AND recipient_id=$2`,[d.event_id,d.recipient_id])}catch(e){const expired=[404,410].includes(e.statusCode);if(expired)await pool.query(`UPDATE push_recipients SET subscription=NULL WHERE id=$1 AND subscription->>'endpoint'=$2`,[d.recipient_id,d.subscription.endpoint]);await pool.query(`UPDATE push_deliveries SET attempts=$3,last_status=$4,next_at=now()+interval '1 minute'*power(2,attempts) WHERE event_id=$1 AND recipient_id=$2`,[d.event_id,d.recipient_id,expired?5:d.attempts+1,String(e.statusCode||'network')])}}}catch{console.warn('push delivery retry pending')}finally{busy=false}}
  const timer=setInterval(deliver,15000);timer.unref();deliver();
  return async function enqueue(kind,s){try{if(['테스트','점검','test'].some(w=>String(s.owner_name||'').toLowerCase().includes(w)))return;const id=kind==='notice'?'notice:'+hash(s.id+'|'+s.title+'|'+s.content):`${kind}:${s.id}`;const client=await pool.connect();try{await client.query('BEGIN');const r=await client.query(`INSERT INTO push_events(id,payload) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING id`,[id,JSON.stringify(activityPayload(kind,s))]);if(r.rowCount)await client.query(`INSERT INTO push_deliveries(event_id,recipient_id,subscription) SELECT $1,id,subscription FROM (SELECT DISTINCT ON (subscription->>'endpoint') id,subscription FROM push_recipients WHERE subscription IS NOT NULL ORDER BY subscription->>'endpoint',id) AS devices ON CONFLICT DO NOTHING`,[id]);await client.query('COMMIT')}catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}void deliver()}catch{console.warn('push event could not be queued')}};
}
