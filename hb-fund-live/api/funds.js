const BASE='https://pub.insure.or.kr/compareDis/variableInsrn/fundDay/list.do';
const MEMBERS=['L31','L63','L03','L78','L41','L33','L72'];
const CODES=['KLVL310A021','KLVL310A021','KLVL310A018','KLVL310U016','KLVL310A020','KLVL310A013','KLVL630BBK8','KLVL630BBK5','KLVL63BK820','KLVL0326570',null,null,'KLVL7800ADE','KLVL7800AGE','KLVL410BBC6','KLVL410BBC1',null,'KLVL3344211','KLVL3344266','KLVL3344300','KLVL3344311','KLVL3344111','KLVL3344255',null,'KLVL7268061'];
const labels=[['iM라이프','PRO변액연금보험','글로벌 멀티에셋자산배분형III'],['iM라이프','iM라이프 더블플러스 변액연금보험','글로벌 멀티에셋자산배분형III'],['iM라이프','iM라이프 더블플러스 변액연금보험','AI 글로벌멀티에셋'],['iM라이프','마이솔루션 AI 변액연금보험S','글로벌채권형'],['iM라이프','마이솔루션 AI 변액연금보험S','미국대형우량주'],['iM라이프','마이솔루션 AI 변액연금보험','글로벌AI플랫폼 액티브형'],['하나생명','하나뿐인 변액연금보험','글로벌 4차산업성장형'],['하나생명','하나뿐인 변액연금보험','변액저축 MMF'],['하나생명','하나뿐인 변액연금보험','AI 글로벌 주식혼합70형'],['삼성생명','글로벌 AI 신성장 변액연금보험','글로벌 AI 신성장 적극형'],['BNP파리바카디프생명','시그니처 ETF 변액연금(저축)보험','스마트베타 (적극투자형)'],['BNP파리바카디프생명','시그니처 ETF 변액연금(저축)보험','글로벌자산배분Ⅱ (적극투자형)'],['BNP파리바카디프생명','시그니처 AI 변액연금보험','AI 멀티팩터 주식형'],['BNP파리바카디프생명','시그니처 AI 변액연금보험','AI 글로벌 주식형'],['IBK연금보험','IBK 연금액 평생보증받는 변액연금보험','글로벌 주식형펀드'],['IBK연금보험','IBK 연금액 평생보증받는 변액연금보험','채권형펀드'],['IBK연금보험','IBK 연금액 평생보증받는 변액연금보험','글로벌 주식형 50% + 채권형 50%'],['KDB생명','더 행복드림 변액연금보험','인덱스플러스알파70혼합형'],['KDB생명','더 행복드림 변액연금보험','코리아주식형'],['KDB생명','더 행복드림 변액연금보험','AI솔루션자산배분적극형'],['KDB생명','더 행복드림 변액연금보험','선진국주식형'],['KDB생명','더 행복드림 변액연금보험','채권형'],['KDB생명','더 행복드림 변액연금보험','SOC주식형(25.1.1 이전 가입자 限)'],['KDB생명','더 행복드림 변액연금보험','SOC주식형 30% + 채권형 70%'],['메트라이프','변액연금보험 동행 Plus','미국주식형 3호']];
export function clean(s){return s.replace(/<span[^>]*class=['"]sr_only['"][^>]*>[\s\S]*?<\/span>/g,'').replace(/<[^>]*>/g,'').replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').trim();}
export function number(s){const t=clean(s).replace(/,/g,'');if(!t||t==='-'||!/[0-9]/.test(t))return null;const v=Number(t.replace(/[▲▼%\s]/g,''));return Number.isFinite(v)?(t.includes('▼')?-Math.abs(v):v):null;}
export function parse(s){const out=new Map();for(const m of s.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)){const r=m[1];if(!r.includes('l_fundCd_'))continue;const label=n=>clean(r.match(new RegExp('id="l_'+n+'_[^"]+"[^>]*>([\\s\\S]*?)<\\/label>'))?.[1]||'');const c=[...r.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/g)].map(x=>x[1]);if(c.length<12)continue;const date=label('stdYmd');const code=label('fundCd');if(!/^\d{8}$/.test(date)||!/^KLV/.test(code))continue;out.set(code,{code,date:date.slice(0,4)+'-'+date.slice(4,6)+'-'+date.slice(6),name:label('fundNm'),company:label('memberNm'),member:label('memberCd'),start:clean(c[3]),price:number(c[4]),y1:number(c[5]),y3:number(c[6]),y5:number(c[7]),cum:number(c[11])});}return out;}
function day(){return new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul'}).format(new Date());}
export function monthsBefore(s,m){const [y,mo,d]=s.split('-').map(Number);const t=new Date(Date.UTC(y,mo-1-m,1));t.setUTCDate(Math.min(d,new Date(Date.UTC(t.getUTCFullYear(),t.getUTCMonth()+1,0)).getUTCDate()));return t.toISOString().slice(0,10);}
async function table(date){
 const p=new URLSearchParams({pageUnit:'2000',search_item:'itemTypeProft',search_stdYmd:date});
 for(const x of MEMBERS)p.append('search_memberCd',x);
 const r=await fetch(BASE+'?'+p,{signal:AbortSignal.timeout(20000),headers:{'User-Agent':'HB-Fund-Live/3.0','Accept':'text/html'}});
 if(!r.ok)throw new Error('공시 응답 '+r.status);
 const html=await r.text();
 if(!html.includes('gongsi_data_wrap')||!html.includes('search_stdYmd'))throw new Error('공시 페이지 형식 확인 필요');
 const rows=parse(html);
 for(const [code,row] of rows)if(row.date!==date||!Number.isFinite(row.price)||row.price<=0)rows.delete(code);
 return rows;
}
// Keep each company's funds on a single, genuinely published date, including blends.
const GROUPS=MEMBERS.map(member=>({member,codes:[...new Set(CODES.filter(code=>code?.startsWith('KLV'+member)))]}));
export function selectLatest(tables){
 const current=new Map();
 const ordered=[...tables].sort((a,b)=>b.date.localeCompare(a.date));
 for(const group of GROUPS){
  const complete=ordered.find(t=>group.codes.every(code=>t.rows.has(code)));
  if(complete)for(const code of group.codes)current.set(code,complete.rows.get(code));
  else for(const code of group.codes){const found=ordered.find(t=>t.rows.has(code));if(found)current.set(code,found.rows.get(code));}
 }
 return current;
}
export function hasCompleteCoverage(current){return GROUPS.every(g=>g.codes.every(code=>current.has(code)));}
export async function collectLatest(today,load=table){
 const tables=[];
 // First check today and yesterday together. Continue only while recommended funds are missing.
 for(const offsets of [[0,1],[2,3,4,5],[6,7,8,9,10,11,12,13]]){
  const batch=await Promise.all(offsets.map(async n=>{
   const date=new Date(Date.parse(today)-n*86400000).toISOString().slice(0,10);
   try{return {date,rows:await load(date)};}catch(e){console.warn('공시 조회 실패',date,e.message);return null;}
  }));
  tables.push(...batch.filter(Boolean));
  const current=selectLatest(tables);
  if(hasCompleteCoverage(current))return current;
 }
 return selectLatest(tables);
}
export function build(current,histories,checkedAt){const rows=labels.map(([company,product,fund],i)=>{const x=current.get(CODES[i]);const row={company,product,fund,code:CODES[i],m1:null,m3:null,m6:null,y1:null,y3:null,y5:null,cum:null,annual:null,date:null,status:'확인 필요'};if(!x)return row;Object.assign(row,{y1:x.y1,y3:x.y3,y5:x.y5,cum:x.cum,date:x.date,officialName:x.name,source:BASE+'?search_memberCd='+x.member+'&search_fundNm='+encodeURIComponent(x.name),status:'공시 확인'});for(const [j,k] of ['m1','m3','m6'].entries()){const old=(histories instanceof Map?histories.get(monthsBefore(x.date,[1,3,6][j])):histories[j])?.get(x.code);if(x.price>0&&old?.price>0&&old.date===monthsBefore(x.date,[1,3,6][j]))row[k]=(x.price/old.price-1)*100;}const days=(Date.parse(x.date)-Date.parse(x.start))/86400000;if(days>=365&&x.cum!==null)row.annual=x.cum*365/days;return row;});for(const [i,a,b,w] of [[16,14,15,.5],[23,22,21,.3]]){const x=rows[a],y=rows[b];if(x.date&&x.date===y.date){rows[i].date=x.date;rows[i].status='비중 계산 · 참고';for(const k of ['m1','m3','m6','y1','y3','y5'])if(x[k]!==null&&y[k]!==null)rows[i][k]=x[k]*w+y[k]*(1-w);}}
 const dates=[...new Set(rows.map(x=>x.date).filter(Boolean))].sort();if(!dates.length)throw new Error('추천 펀드의 공시 데이터를 찾지 못했습니다');return {checkedAt,dates,source:'생명보험협회 변액보험 펀드현황',funds:rows,sources:Object.fromEntries([...new Set(labels.map(x=>x[0]))].map(name=>[name,{ok:rows.some(x=>x.company===name&&x.date),count:rows.filter(x=>x.company===name&&x.date).length}]))};}
const CARDIF='https://www.cardif.co.kr/product/investment-report.do';
export function parseCardif(html){
 const block=html.match(/const\s+summaryData\s*=\s*\{([\s\S]*?)\};/)?.[1];
 const title=html.match(/id=["']summaryChartTitle["'][^>]*>([\s\S]*?)<\/div>/)?.[1];
 const dateText=clean(title||'').match(/(\d{4})\.(\d{2})\.(\d{2})\s*기준/);
 if(!block||!dateText)throw new Error('카디프 월간 공시 형식 확인 필요');
 const date=dateText.slice(1).join('-');
 if(!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date||date>day())throw new Error('카디프 공시 기준일 확인 필요');
 const result=new Map();
 for(const period of ['m1','y1']){
  const items=block.match(new RegExp('\\b'+period+'\\s*:\\s*\\[([\\s\\S]*?)\\]'))?.[1];
  if(!items)throw new Error('카디프 월간 수익률 기간 확인 필요');
  for(const item of items.matchAll(/\{[^{}]*\bname\s*:\s*'([^']+)'[^{}]*\bval\s*:\s*'([+-]?\d+(?:\.\d+)?%)'[^{}]*\}/g)){
   const name=item[1].replace(/\s/g,'').replace(/Ⅱ/g,'II');
   if(!result.has(name))result.set(name,{});
   result.get(name)[period]=Number(item[2].replace('%',''));
  }
 }
 const names=[['스마트베타(적극)','스마트베타 (적극투자형)'],['글로벌자산배분II(적극)','글로벌자산배분Ⅱ (적극투자형)']];
 const funds=names.map(([key,name])=>{
  const values=result.get(key);
  if(!values||!Number.isFinite(values.m1)||!Number.isFinite(values.y1))throw new Error('카디프 공식 EMP 전략 확인 필요');
  return {name,date,m1:values.m1,y1:values.y1,source:CARDIF};
 });
 return {status:'ok',date,source:CARDIF,funds};
}
async function cardifMonthly(){
 try{
  const r=await fetch(CARDIF,{signal:AbortSignal.timeout(25000),headers:{'Accept':'text/html','User-Agent':'HB-Fund-Live/2.1'}});
  if(!r.ok)throw new Error('카디프 월간 공시 응답 '+r.status);
  return parseCardif(await r.text());
 }catch(e){return {status:'unavailable',source:CARDIF,funds:[],error:'카디프 월간 공시를 확인하지 못했습니다. '+e.message};}
}

export function applyCardifMonthly(data,monthly){
 const names=['스마트베타 (적극투자형)','글로벌자산배분Ⅱ (적극투자형)'];
 for(const [n,i] of [10,11].entries()){
  const row=data.funds[i];
  const item=monthly?.status==='ok'?monthly.funds?.find(x=>x.name===names[n]):null;
  Object.assign(row,{fund:names[n],source:CARDIF,status:'월간 공시 확인 필요',date:null,m1:null,m3:null,m6:null,y1:null,y3:null,y5:null,cum:null,annual:null});
  if(item&&Number.isFinite(item.m1)&&Number.isFinite(item.y1)&&item.date)
   Object.assign(row,{m1:item.m1,y1:item.y1,date:item.date,officialName:item.name,status:'월간 공시 · 적극투자형'});
 }
 data.dates=[...new Set(data.funds.map(x=>x.date).filter(Boolean))].sort();
 for(const name of Object.keys(data.sources)){
  const rows=data.funds.filter(x=>x.company===name&&x.date);
  data.sources[name]={ok:rows.length>0,count:rows.length};
 }
 return data;
}

export function summarize(data,today=day()){
 const daily=data.funds.filter(x=>x.code||x.fund.includes('% +'));
 for(const row of daily){
  if(row.date&&row.date<today)row.status=(row.fund.includes('% +')?'비중 계산 · 참고 · ':'')+(row.retained?'이전 확인값 유지':'최근 공시 · 당일 공시 대기');
 }
 const confirmed=data.funds.filter(x=>x.date).length;
 const waiting=daily.filter(x=>x.date&&x.date<today).length;
 const missing=data.funds.length-confirmed;
 data.requestedDate=today;
 data.dates=[...new Set(data.funds.map(x=>x.date).filter(Boolean))].sort();
 data.summary={total:data.funds.length,confirmed,waiting,missing,retained:data.funds.filter(x=>x.retained).length};
 data.sources=Object.fromEntries([...new Set(labels.map(x=>x[0]))].map(name=>{
  const all=data.funds.filter(x=>x.company===name),valid=all.filter(x=>x.date);
  const dailyRows=valid.filter(x=>x.code||x.fund.includes('% +'));
  return [name,{ok:valid.length===all.length,count:valid.length,total:all.length,
   dates:[...new Set(valid.map(x=>x.date))].sort(),dailyDates:[...new Set(dailyRows.map(x=>x.date))].sort(),
   waiting:dailyRows.filter(x=>x.date<today).length,retained:valid.some(x=>x.retained)}];
 }));
 return data;
}
export function retainPrevious(data,previous){
 if(!previous)return data;
 const findOld=row=>previous.funds.find(x=>x.company===row.company&&x.product===row.product&&x.fund===row.fund&&x.code===row.code);
 for(const group of GROUPS){
  const name=labels[CODES.indexOf(group.codes[0])][0];
  const indices=data.funds.map((x,i)=>x.company===name&&(x.code||x.fund.includes('% +'))?i:-1).filter(i=>i>=0);
  if(indices.every(i=>data.funds[i].date))continue;
  const old=indices.map(i=>findOld(data.funds[i]));
  if(old.every(x=>x?.date)&&new Set(old.map(x=>x.date)).size===1)
   for(const [n,i] of indices.entries())data.funds[i]={...old[n],retained:true,status:'이전 확인값 유지'};
 }
 for(const i of [10,11])if(!data.funds[i].date){const old=findOld(data.funds[i]);if(old?.date)data.funds[i]={...old,retained:true,status:'이전 월간 공시 유지'};}
 return data;
}
let cached;let pending;
export async function refresh(force=false){
 const today=day();
 const ttl=cached?.data.summary?.waiting||cached?.data.summary?.missing||cached?.data.summary?.retained?5*60*1000:30*60*1000;
 if(!force&&cached?.data.requestedDate===today&&Date.now()-cached.time<ttl)return cached.data;
 if(pending)return pending;
 pending=(async()=>{
  const monthlyPromise=cardifMonthly();
  const current=await collectLatest(today);
  // Anchor each period to its own company's actual published date, never today's blank date.
  const historyDates=[...new Set([...current.values()].flatMap(x=>[1,3,6].map(m=>monthsBefore(x.date,m))))];
  const histories=new Map(await Promise.all(historyDates.map(async date=>{
   try{return [date,await table(date)];}catch(e){console.warn('기간 공시 조회 실패',date,e.message);return [date,null];}
  })));
  let data;
  try{data=build(current,histories,new Date().toISOString());}
  catch(e){
   if(!cached)throw e;
   data={...cached.data,checkedAt:new Date().toISOString(),funds:cached.data.funds.map(x=>({...x,retained:true,status:'이전 확인값 유지'}))};
  }
  applyCardifMonthly(data,await monthlyPromise);
  retainPrevious(data,cached?.data);
  summarize(data,today);
  console.info('펀드 공시 확인',JSON.stringify(data.summary));
  cached={time:Date.now(),data};
  return data;
 })();
 try{return await pending;}finally{pending=null;}
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 try{res.status(200).json(await refresh(req.query?.refresh==='1'));}
 catch(e){console.error('펀드 공시 실패',e.message);res.status(503).json({error:'최신 공시 수익률 조회에 실패했습니다. 이전 확인값과 기준일을 유지합니다.',detail:e.message});}
}
