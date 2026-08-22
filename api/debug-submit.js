export default async function handler(req,res){
  res.setHeader('Content-Type','application/json; charset=utf-8');
  if(req.method!=='POST') return res.status(405).json({ok:false,error:'POST only'});
  try{
    const r=await fetch('https://api.solapi.com/messages/v4/send-many/detail',{method:'POST'});
    return res.status(200).json({ok:true,reachable:true,status:r.status});
  }catch(e){
    return res.status(500).json({ok:false,error:e.message});
  }
}