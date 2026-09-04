const SUPABASE_URL = 'https://cgulvtbyqkixpxxqzcet.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_37nHNxKCf60GiWedu90g9g_DDetNzb9';
const TARGET = `${SUPABASE_URL}/functions/v1/phone-auth-otpid`;

export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    const response = await fetch(TARGET, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify(req.body || {}),
    });

    const text = await response.text();
    let payload: any;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = { error: text || `HTTP ${response.status}` };
    }

    res.status(response.status).json(payload);
  } catch (error: any) {
    res.status(502).json({ error: error?.message || 'Gagal menghubungi layanan autentikasi.' });
  }
}
