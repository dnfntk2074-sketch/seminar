export default async function handler(req,res){
  res.setHeader('Content-Type','application/json; charset=utf-8');
  return res.status(200).json({
    ok:true,
    env:{
      SOLAPI_API_KEY:!!process.env.SOLAPI_API_KEY,
      SOLAPI_API_SECRET:!!process.env.SOLAPI_API_SECRET,
      SOLAPI_FROM:!!process.env.SOLAPI_FROM,
      ADMIN_PHONE:!!process.env.ADMIN_PHONE
    }
  });
}
