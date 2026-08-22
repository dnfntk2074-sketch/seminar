export default async function handler(req,res){
  if(req.method !== 'POST') return res.status(405).json({ok:false});
  const d = req.body || {};
  if(!d.name || !d.phone || !d.referrer) return res.status(400).json({ok:false});
  // Connect existing SOLAPI sender here with Vercel environment variables.
  // Never place API secrets in index.html.
  console.log('[SEMINAR APPLICATION]', d);
  return res.status(200).json({ok:true});
}
