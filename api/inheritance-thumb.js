export default async function handler(req, res) {
  try {
    const source = 'https://raw.githubusercontent.com/dnfntk2074-sketch/seminar/main/inheritance-tax/inheritance-og-kakao-v15.jpg';
    const r = await fetch(source, { cache: 'no-store' });
    if (!r.ok) {
      res.status(r.status).send('thumbnail fetch failed');
      return;
    }
    const buf = Buffer.from(await r.arrayBuffer());
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Content-Length', String(buf.length));
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=86400');
    res.status(200).send(buf);
  } catch (e) {
    res.status(500).send('thumbnail error');
  }
}
