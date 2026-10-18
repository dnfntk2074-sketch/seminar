import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const dir=path.dirname(fileURLToPath(import.meta.url));
const TABLES=['app_settings','schedules','library_files','purged_schedule_ids','deleted_schedules','admin_auth','push_config','push_recipients','push_events','push_deliveries','hb_access_requests','hb_access_audit','hb_approval_keys','hb_approval_push','hb_approval_outbox'];
const quoted=s=>'"'+s.replace(/"/g,'""')+'"';
let retentionScheduled=false;
async function expireBackups(pool){
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(724188102)');
    const old=await client.query("SELECT revision,tables FROM hb_update_backups.releases WHERE created_at < now()-interval '29 days'");
    for(const release of old.rows){
      for(const item of release.tables){if(/^r[0-9a-f]{12}_[a-z_]+$/.test(item.snapshot))await client.query('DROP TABLE IF EXISTS hb_update_backups.'+quoted(item.snapshot));}
      await client.query('DELETE FROM hb_update_backups.releases WHERE revision=$1',[release.revision]);
    }
    await client.query('COMMIT');
  }catch(error){await client.query('ROLLBACK');throw error}finally{client.release()}
}
export async function backupBeforeUpdate(pool){
  if(!retentionScheduled){retentionScheduled=true;const retention=setInterval(()=>expireBackups(pool).catch(()=>console.warn('Backup retention maintenance pending')),86400000);retention.unref();}
  const revision=process.env.RAILWAY_GIT_COMMIT_SHA||crypto.createHash('sha256').update(fs.readFileSync(path.join(dir,'server.js'))).update(fs.readFileSync(path.join(dir,'access.js'))).digest('hex');
  const client=await pool.connect();
  try{
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ');
    await client.query('SELECT pg_advisory_xact_lock(724188102)');
    await client.query('CREATE SCHEMA IF NOT EXISTS hb_update_backups');
    await client.query(`CREATE TABLE IF NOT EXISTS hb_update_backups.releases(revision text PRIMARY KEY,created_at timestamptz NOT NULL DEFAULT now(),tables jsonb NOT NULL)`);
    const existing=await client.query('SELECT revision FROM hb_update_backups.releases WHERE revision=$1',[revision]);
    if(existing.rowCount){await client.query('COMMIT');console.log('Pre-update backup already verified',revision.slice(0,12));return}
    const result=await client.query("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname='public' AND tablename=ANY($1::text[])",[TABLES]);
    const copies=[];
    const prefix='r'+crypto.createHash('sha256').update(revision).digest('hex').slice(0,12)+'_';
    for(const {tablename} of result.rows){
      if(!TABLES.includes(tablename))throw Error('Unexpected backup table');
      const snapshot=prefix+tablename;
      await client.query('CREATE TABLE hb_update_backups.'+quoted(snapshot)+' AS TABLE public.'+quoted(tablename));
      const count=await client.query('SELECT count(*)::text AS count FROM hb_update_backups.'+quoted(snapshot));
      copies.push({source:tablename,snapshot,rows:count.rows[0].count});
    }
    await client.query('INSERT INTO hb_update_backups.releases(revision,tables) VALUES($1,$2::jsonb)',[revision,JSON.stringify(copies)]);
    // Old snapshots contain recovery-only personal data; cap their life at 30 days.
    const old=await client.query("SELECT revision,tables FROM hb_update_backups.releases WHERE created_at < now()-interval '30 days'");
    for(const release of old.rows){
      for(const item of release.tables){if(/^r[0-9a-f]{12}_[a-z_]+$/.test(item.snapshot))await client.query('DROP TABLE IF EXISTS hb_update_backups.'+quoted(item.snapshot));}
      await client.query('DELETE FROM hb_update_backups.releases WHERE revision=$1',[release.revision]);
    }
    await client.query('COMMIT');
    console.log('Pre-update backup completed',revision.slice(0,12),'tables:',copies.length,'rows:',copies.reduce((n,x)=>n+Number(x.rows),0));
  }catch(error){await client.query('ROLLBACK');throw error}finally{client.release()}
}
