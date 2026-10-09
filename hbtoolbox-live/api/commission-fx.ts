import {fxRange,latestRate} from '../commission-source/fx';
export async function GET(){
  const range=fxRange();
  const url='https://api.frankfurter.dev/v2/providers/ecb/rates?'+new URLSearchParams({base:'USD',quotes:'KRW',from:range.from,to:range.to});
  try{
    const response=await fetch(url,{signal:AbortSignal.timeout(12000),headers:{Accept:'application/json'}});
    if(!response.ok)throw new Error('환율 제공처 응답 실패');
    const rate=latestRate(await response.json(),range);
    return Response.json({...rate,retrievedAt:new Date().toISOString()},{headers:{'Cache-Control':'public, max-age=0, s-maxage=300'}});
  }catch(error){
    console.error('commission-fx: exchange-rate lookup unavailable',error instanceof Error?error.message:'unknown');
    return Response.json({error:'환율을 불러오지 못했습니다. 저장된 환율을 확인하거나 계약 환율을 직접 입력해 주세요.'},{status:503,headers:{'Cache-Control':'no-store'}});
  }
}
