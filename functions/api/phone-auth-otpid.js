const SUPABASE_URL = 'https://cgulvtbyqkixpxxqzcet.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_37nHNxKCf60GiWedu90g9g_DDetNzb9';
const TARGET = `${SUPABASE_URL}/functions/v1/phone-auth-otpid`;

export async function onRequest(context) {
  const { request } = context;
  if (request.method === 'OPTIONS') return new Response(null, { status: 204 });
  if (request.method !== 'POST') return Response.json({ error: 'Method Not Allowed' }, { status: 405 });

  try {
    const response = await fetch(TARGET, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: await request.text(),
    });

    const text = await response.text();
    let payload;
    try { payload = text ? JSON.parse(text) : null; }
    catch { payload = { error: text || `HTTP ${response.status}` }; }
    return Response.json(payload, { status: response.status });
  } catch (error) {
    return Response.json({ error: error?.message || 'Gagal menghubungi layanan autentikasi.' }, { status: 502 });
  }
}
