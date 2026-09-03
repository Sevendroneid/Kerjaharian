import { createClient } from 'npm:@supabase/supabase-js@2';

const OTPID_BASE_URL = (Deno.env.get('OTPID_BASE_URL') || 'https://api.otp.id').replace(/\/$/, '');
const OTPID_API_KEY = Deno.env.get('OTPID_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SECRET_KEYS = Deno.env.get('SUPABASE_SECRET_KEYS');
const LEGACY_SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const SITE_URL = Deno.env.get('KERJAHARIAN_SITE_URL') || 'https://kerjaharian.vercel.app';

function adminKey() {
  if (SUPABASE_SECRET_KEYS) {
    try {
      const keys = JSON.parse(SUPABASE_SECRET_KEYS);
      if (keys.default) return keys.default;
    } catch (error) {
      console.warn('Invalid SUPABASE_SECRET_KEYS; falling back to legacy key', error);
    }
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

function normalizePhone(input: string) {
  const digits = String(input || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  if (digits.startsWith('62')) return digits;
  return `62${digits}`;
}

function validPhone(phone: string) {
  return /^62\d{8,15}$/.test(phone);
}

async function requestInbound(phone: string) {
  const response = await fetch(`${OTPID_BASE_URL}/v3/request`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OTPID_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      channel: 'whatsapp_inbound',
      destination: phone,
      brand: 'KerjaHarian',
      ttl: 300,
    }),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || result?.success !== true || !result?.data?.otp_id || !result?.data?.verification?.wa_link) {
    console.error('OTP.ID inbound request failed', { status: response.status, error: result?.error });
    throw new Error('OTP.ID gagal membuat sesi WhatsApp');
  }
  return result.data;
}

async function findOrCreateUser(phone: string) {
  const variants = [phone, `+${phone}`];
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .or(`phone.in.(${variants.join(',')}),whatsapp.in.(${variants.join(',')})`)
    .limit(1)
    .maybeSingle();

  if (profile?.id) {
    const { data: existing, error } = await supabaseAdmin.auth.admin.getUserById(profile.id);
    if (!error && existing.user) return existing.user;
  }

  const email = `${phone}@phone.kerjaharian.local`;
  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    phone: `+${phone}`,
    phone_confirm: true,
    email,
    email_confirm: true,
    user_metadata: { phone_auth: true, phone },
  });
  if (!createError && created.user) return created.user;

  if (createError) {
    const message = String(createError.message || '').toLowerCase();
    if (!message.includes('already') && !message.includes('registered')) throw createError;
  }

  let page = 1;
  while (page <= 10) {
    const { data: users, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;
    const found = users.users.find((u) => u.phone === `+${phone}` || u.email === email);
    if (found) return found;
    if (users.users.length < 100) break;
    page += 1;
  }
  throw new Error('Akun nomor HP tidak dapat ditemukan');
}

async function createSessionLink(phone: string) {
  const user = await findOrCreateUser(phone);
  let email = user.email;
  if (!email) {
    email = `${phone}@phone.kerjaharian.local`;
    const { data: updated, error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      email,
      email_confirm: true,
    });
    if (error || !updated.user) throw error || new Error('Gagal menyiapkan sesi login');
  }

  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo: SITE_URL },
  });
  if (error || !data?.properties?.action_link) throw error || new Error('Gagal membuat sesi login');
  return data.properties.action_link;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method Not Allowed' }, 405);
  if (!OTPID_API_KEY || !adminKey()) return json({ error: 'OTP.ID belum dikonfigurasi' }, 500);

  try {
    const body = await req.json();
    const action = body?.action;
    const phone = normalizePhone(body?.phone);
    if (!validPhone(phone)) return json({ error: 'Nomor HP Indonesia tidak valid' }, 400);

    if (action === 'request') {
      const cutoff = new Date(Date.now() - 60 * 1000).toISOString();
      const { data: recentChallenge, error: recentError } = await supabaseAdmin
        .from('phone_auth_otpid_challenges')
        .select('id')
        .eq('phone', phone)
        .is('consumed_at', null)
        .gt('created_at', cutoff)
        .limit(1)
        .maybeSingle();
      if (recentError) throw recentError;
      if (recentChallenge) return json({ error: 'Permintaan verifikasi baru saja dibuat. Silakan lanjutkan WhatsApp yang sudah dibuka.' }, 429);

      const data = await requestInbound(phone);
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      const { data: challenge, error } = await supabaseAdmin
        .from('phone_auth_otpid_challenges')
        .insert({ phone, otp_id: data.otp_id, expires_at: expiresAt })
        .select('id, expires_at')
        .single();
      if (error) throw error;
      return json({ challenge_id: challenge.id, expires_at: challenge.expires_at, verification: data.verification });
    }

    if (action === 'status') {
      const challengeId = String(body?.challenge_id || '');
      if (!/^[0-9a-f-]{36}$/i.test(challengeId)) return json({ error: 'Sesi verifikasi tidak valid' }, 400);
      const { data: challenge, error: challengeError } = await supabaseAdmin
        .from('phone_auth_otpid_challenges')
        .select('id, phone, otp_id, expires_at, consumed_at')
        .eq('id', challengeId)
        .eq('phone', phone)
        .maybeSingle();
      if (challengeError || !challenge) return json({ error: 'Sesi verifikasi tidak ditemukan' }, 404);

      if (challenge.consumed_at) {
        const actionLink = await createSessionLink(phone);
        return json({ status: 'success', action_link: actionLink });
      }
      if (new Date(challenge.expires_at).getTime() < Date.now()) return json({ status: 'expired' });

      const response = await fetch(`${OTPID_BASE_URL}/v3/otp/${encodeURIComponent(challenge.otp_id)}`, {
        headers: { Authorization: `Bearer ${OTPID_API_KEY}` },
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error('Gagal membaca status OTP.ID');
      const status = String(result?.data?.status || result?.status || 'pending').toLowerCase();
      if (status !== 'success' && status !== 'verified') return json({ status });

      const actionLink = await createSessionLink(phone);
      const { error: consumeError } = await supabaseAdmin
        .from('phone_auth_otpid_challenges')
        .update({ consumed_at: new Date().toISOString() })
        .eq('id', challenge.id)
        .is('consumed_at', null);
      if (consumeError) throw consumeError;
      return json({ status: 'success', action_link: actionLink });
    }

    return json({ error: 'Unknown action' }, 400);
  } catch (error) {
    console.error('phone-auth-otpid:', error);
    return json({ error: error instanceof Error ? error.message : 'Verifikasi gagal' }, 500);
  }
});
