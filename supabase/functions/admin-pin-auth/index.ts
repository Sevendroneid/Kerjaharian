import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SECRET_KEYS = Deno.env.get('SUPABASE_SECRET_KEYS');
const LEGACY_SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const ADMIN_PHONE = '6282340871029';
const ADMIN_USER_ID = 'd2f36cd1-55bb-46b8-8949-262152018cb3';
const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

function adminKey() {
  if (SECRET_KEYS) {
    try {
      const keys = JSON.parse(SECRET_KEYS);
      if (keys.default) return keys.default;
    } catch (_) {}
  }
  return LEGACY_SERVICE_ROLE || '';
}

const supabaseAdmin = createClient(SUPABASE_URL, adminKey());
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: cors });
}
async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method Not Allowed' }, 405);
  if (!adminKey()) return json({ error: 'Server auth belum dikonfigurasi' }, 500);

  try {
    const body = await req.json();
    const phone = String(body?.phone || '').replace(/\D/g, '');
    const pin = String(body?.pin || '');
    if (phone !== ADMIN_PHONE) return json({ error: 'Akses admin tidak tersedia untuk nomor ini' }, 403);
    if (!/^\d{8}$/.test(pin)) return json({ error: 'PIN admin harus 8 digit' }, 400);

    const { data: credential, error: readError } = await supabaseAdmin
      .from('admin_pin_credentials')
      .select('admin_user_id, pin_salt, pin_hash, failed_attempts, locked_until')
      .eq('admin_user_id', ADMIN_USER_ID)
      .maybeSingle();
    if (readError || !credential) return json({ error: 'Kredensial admin belum tersedia' }, 500);

    if (credential.locked_until && new Date(credential.locked_until).getTime() > Date.now()) {
      return json({ error: 'Terlalu banyak percobaan. Coba lagi setelah beberapa menit.' }, 429);
    }

    const candidate = await sha256(`${credential.pin_salt}${pin}`);
    if (candidate !== credential.pin_hash) {
      const attempts = Number(credential.failed_attempts || 0) + 1;
      const lockedUntil = attempts >= MAX_ATTEMPTS ? new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString() : null;
      await supabaseAdmin.from('admin_pin_credentials').update({ failed_attempts: lockedUntil ? 0 : attempts, locked_until: lockedUntil, updated_at: new Date().toISOString() }).eq('admin_user_id', ADMIN_USER_ID);
      return json({ error: lockedUntil ? 'PIN salah terlalu banyak. Login dikunci 15 menit.' : 'PIN admin salah.' }, 401);
    }

    const { data: adminUser, error: userError } = await supabaseAdmin.auth.admin.getUserById(ADMIN_USER_ID);
    if (userError || !adminUser.user) return json({ error: 'Akun admin tidak ditemukan' }, 500);
    if (adminUser.user.phone !== `+${ADMIN_PHONE}`) return json({ error: 'Identitas nomor admin tidak cocok' }, 403);

    const email = adminUser.user.email || `${ADMIN_PHONE}@phone.kerjaharian.local`;
    if (!adminUser.user.email) {
      const { error: emailError } = await supabaseAdmin.auth.admin.updateUserById(ADMIN_USER_ID, { email, email_confirm: true });
      if (emailError) throw emailError;
    }

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({ type: 'magiclink', email, options: { redirectTo: 'https://kerjaharian.vercel.app' } });
    if (linkError || !linkData?.properties?.action_link) throw linkError || new Error('Gagal membuat sesi admin');

    await supabaseAdmin.from('admin_pin_credentials').update({ failed_attempts: 0, locked_until: null, last_used_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('admin_user_id', ADMIN_USER_ID);
    return json({ success: true, action_link: linkData.properties.action_link });
  } catch (error) {
    console.error('admin-pin-auth:', error);
    return json({ error: error instanceof Error ? error.message : 'Login admin gagal' }, 500);
  }
});
