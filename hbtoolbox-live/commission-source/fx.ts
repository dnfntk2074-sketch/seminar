export const FX_SOURCE = 'ECB 공시 환율 · Frankfurter';
export const FX_SOURCE_URL = 'https://frankfurter.dev/';
export type FxRate = { rate:number; date:string; targetDate:string; source:string; sourceUrl:string };
export function koreaDay(now=new Date()) {
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
  const value=(type:string)=>parts.find(p=>p.type===type)!.value;
  return `${value('year')}-${value('month')}-${value('day')}`;
}
export function shiftDay(day:string,days:number){return new Date(Date.parse(day+'T00:00:00Z')+days*86400000).toISOString().slice(0,10);}
export function fxRange(now=new Date()){const to=shiftDay(koreaDay(now),-1);return {to,from:shiftDay(to,-14)};}
function validDay(value:unknown):value is string{return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;}
export function validRate(value:unknown,to:string):value is FxRate {
  const r=value as FxRate;
  return !!r&&typeof r.rate==='number'&&Number.isFinite(r.rate)&&r.rate>0&&r.rate<=100000&&validDay(r.date)&&r.date<=to&&r.date>=shiftDay(to,-14)&&r.source===FX_SOURCE&&r.sourceUrl===FX_SOURCE_URL;
}
export function latestRate(rows:unknown,range:{from:string;to:string}):FxRate {
  if(!Array.isArray(rows))throw new Error('환율 응답 형식 오류');
  const candidates=rows.filter(r=>r&&r.base==='USD'&&r.quote==='KRW'&&validDay(r.date)&&r.date>=range.from&&r.date<=range.to&&typeof r.rate==='number'&&Number.isFinite(r.rate)&&r.rate>0&&r.rate<=100000).sort((a,b)=>b.date.localeCompare(a.date));
  if(!candidates.length)throw new Error('최근 공시 환율 없음');
  return {rate:candidates[0].rate,date:candidates[0].date,targetDate:range.to,source:FX_SOURCE,sourceUrl:FX_SOURCE_URL};
}
