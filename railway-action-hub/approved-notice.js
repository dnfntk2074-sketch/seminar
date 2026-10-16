// Explicitly approved by the owner on 2026-10-16. The ledger prevents republishing on restart.
export const approvedNotice={
 id:'action-hub-update-20261016-approved-v1',
 title:'📢 액션허브 업데이트 안내',
 content:`TFA님들의 활동을 함께 응원하고, 새로운 소식을 편하게 확인하실 수 있도록 액션허브를 업데이트했습니다😊

① 활동 등록·완료 시 응원 팝업
신규상담·후속상담·고객관리 활동을 등록하거나 완료하면, 이름과 함께 따뜻한 응원 문구가 표시됩니다.
활동별로 다양한 문구를 준비했습니다👏

② 활동·공지 알림을 전체 TFA로 확대
알림을 연결하시면 다른 TFA님들의 활동 등록·완료 소식과 새 공지를 휴대폰으로 받아보실 수 있습니다.
공지 알림을 누르면 해당 내용을 바로 확인할 수 있습니다.

🔔 알림 연결 방법
홈 화면에 추가한 액션허브 아이콘 실행 → 새로고침 → 상단 로고 오른쪽 ‘알림 켜기’ → 설정창에서 ‘알림 켜기’ → 허용

※ 알림을 받으시려면 각자 한 번씩 연결해 주세요.

③ 공지사항 누적 보관
새 공지는 게시 날짜·시간과 함께 전체 내용이 표시됩니다.
이전 공지는 아래에 한 줄 요약으로 쌓이며, 스크롤해서 찾아보고 누르면 전체 내용을 펼쳐볼 수 있습니다.

업데이트된 기능은 새로고침 후 이용해 주세요.
TFA님들의 한 걸음 한 걸음을 함께 응원하겠습니다🌿`,
 url:''
};

export async function publishApprovedNotice(pool,notify,publication=approvedNotice){
 await pool.query(`CREATE TABLE IF NOT EXISTS notice_publications(id text primary key,payload jsonb not null,created_at timestamptz not null default now())`);
 const client=await pool.connect();let payload;
 try{
  await client.query('BEGIN');
  await client.query(`SELECT id FROM app_settings WHERE id='main' FOR UPDATE`);
  const stored=await client.query(`SELECT payload FROM notice_publications WHERE id=$1`,[publication.id]);
  if(stored.rows.length){payload=stored.rows[0].payload}else{
   const time=(await client.query(`SELECT now() AS published_at`)).rows[0].published_at;
   payload={id:new Date(time).toISOString(),title:publication.title,content:publication.content};
   await client.query(`UPDATE app_settings SET
     notice_history=CASE WHEN length(trim(notice_title||notice_content))>0 THEN jsonb_build_array(jsonb_build_object('title',notice_title,'content',notice_content,'url',notice_url,'published_at',notice_published_at))||notice_history ELSE notice_history END,
     notice_title=$1,notice_content=$2,notice_url=$3,notice_published_at=$4::timestamptz,notice_enabled=true,notice_new=true
     WHERE id='main'`,[publication.title,publication.content,publication.url||'',payload.id]);
   await client.query(`INSERT INTO notice_publications(id,payload) VALUES($1,$2)`,[publication.id,JSON.stringify(payload)]);
  }
  await client.query('COMMIT');
 }catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}
 // The normal notification queue deduplicates this same event on every restart.
 await notify('notice',payload);
}
