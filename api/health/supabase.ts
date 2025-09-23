import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const url = process.env.SUPABASE_URL!;
    const r = await fetch(`${url}/auth/v1/health`);
    const j = await r.json();
    res.status(200).json({ ok: true, url: url.replace(/(https:\/\/.{5}).+/, '$1***'), auth: j.status });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: String(e) });
  }
}
