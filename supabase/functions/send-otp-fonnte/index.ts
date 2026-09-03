import { createClient } from 'npm:@supabase/supabase-js@2';

const SB_URL = Deno.env.get('SB_URL')!;
const SB_KEY = Deno.env.get('SB_KEY')!;
const FONNTE_TOKEN = Deno.env.get('FONNTE_TOKEN')!;
const supabase = createClient(SB_URL, SB_KEY);

const cors = (origin: string | null) => ({
  'Access-Control-Allow-Origin': origin === 'https://kerjaharian.vercel.app' ? origin : 'https://kerjaharian.vercel.app',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
});

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function normalizePhone(input: string) {
  const digits = input.replace(/\D/g, '');
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  if (digits.startsWith('62')) return digits;
  return `62${digits}`;
}

function generateOtp() {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return String(100000 + (a[0] % 900000));
}

async function getDeviceProfile() {
  const response = await fetch('https://api.fonnte.com/device', {
    method: 'POST',
    headers: { Authorization: FONNTE_TOKEN },
  });
  const data = await response.json().catch(() => null);
  return { response, data };
}

async function configureStatusWebhook(profile: any) {
  try {
    if (!profile?.device) return;
    const { data: config } = await supabase
      .from('fonnte_monitor_config')
      .select('webhook_secret')
      .eq('id', true)
      .maybeSingle();
    if (!config?.webhook_secret) return;

    const webhookconnect = `${SB_URL}/functions/v1/fonnte-device-status?token=${config.webhook_secret}`;
    await fetch('https://api.fonnte.com/update-device', {
      method: 'POST',
      headers: {
        Authorization: FONNTE_TOKEN,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        name: String(profile.name || 'KerjaHarian'),
        device: String(profile.device),
        webhookconnect,
      }),
    });
  } catch (error) {
    // Monitoring configuration must never cause an OTP retry loop.
    console.error('Fonnte webhook auto-config:', error);
  }
}

Deno.serve(async (req) => {
  const headers = cors(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method tidak diizinkan' }), { status: 405, headers });

  try {
    const body = await req.json();
    const target = normalizePhone(String(body.phone || ''));
    if (!/^62\d{8,15}$/.test(target)) {
      return new Response(JSON.stringify({ error: 'Nomor WhatsApp tidak valid' }), { status: 400, headers });
    }

    // Safety gate: never call the WhatsApp send endpoint while the Fonnte
    // device is disconnected. This prevents pending OTPs from accumulating
    // and being released in a burst after a reconnect.
    const { response: deviceResponse, data: device } = await getDeviceProfile();
    if (!deviceResponse.ok || device?.status !== true) {
      return new Response(JSON.stringify({
        error: 'Layanan WhatsApp sedang tidak tersedia',
        code: 'fonnte_device_unavailable',
      }), { status: 503, headers });
    }

    const deviceStatus = String(device.device_status || '').toLowerCase();
    if (deviceStatus !== 'connect' && deviceStatus !== 'connected') {
      return new Response(JSON.stringify({
        error: 'WhatsApp KerjaHarian sedang terputus. OTP tidak dikirim untuk mencegah pesan tertunda dan risiko restriction.',
        code: 'fonnte_device_disconnected',
      }), { status: 503, headers });
    }

    const { data: recent } = await supabase
      .from('otp_codes')
      .select('created_at')
      .eq('phone', target)
      .gt('created_at', new Date(Date.now() - 60_000).toISOString())
      .limit(1);
    if (recent?.length) {
      return new Response(JSON.stringify({ error: 'Tunggu 60 detik sebelum meminta OTP lagi', retry_after: 60 }), { status: 429, headers });
    }

    const { count } = await supabase
      .from('otp_codes')
      .select('id', { count: 'exact', head: true })
      .eq('phone', target)
      .gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
    if ((count ?? 0) >= 10) {
      return new Response(JSON.stringify({ error: 'Batas permintaan OTP harian tercapai. Coba lagi besok.' }), { status: 429, headers });
    }

    const code = generateOtp();
    const codeHash = await sha256(`${target}:${code}`);
    const expires = new Date(Date.now() + 5 * 60_000).toISOString();

    // Only create an OTP record after the device has been confirmed connected.
    // A disconnected/restricted session therefore cannot accumulate a queue.
    const { data: row, error: dbError } = await supabase
      .from('otp_codes')
      .insert({
        phone: target,
        code: null,
        code_hash: codeHash,
        used: false,
        expired_at: expires,
        sent_at: null,
        provider_status: 'pending',
      })
      .select('id')
      .single();
    if (dbError) throw dbError;

    await configureStatusWebhook(device);

    const fonnteRes = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        Authorization: FONNTE_TOKEN,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        target,
        message: `Kode OTP KerjaHarian kamu: ${code}\n\nJangan bagikan kode ini kepada siapapun.`,
        connectOnly: 'true',
      }),
    });
    const result = await fonnteRes.json().catch(() => ({ status: false, reason: 'invalid_json' }));
    const providerOk = fonnteRes.ok && result?.status === true;

    await supabase
      .from('otp_codes')
      .update({
        provider_status: providerOk ? 'accepted' : 'failed',
        provider_detail: JSON.stringify(result).slice(0, 1000),
        sent_at: providerOk ? new Date().toISOString() : null,
      })
      .eq('id', row.id);

    if (!providerOk) {
      return new Response(JSON.stringify({
        error: 'WhatsApp OTP sedang tidak tersedia',
        code: 'fonnte_send_failed',
        detail: result?.reason || result?.detail || 'Fonnte gagal menerima pesan',
      }), { status: 503, headers });
    }

    return new Response(JSON.stringify({ success: true, expires_in: 300 }), { status: 200, headers });
  } catch (error) {
    console.error('send-otp-fonnte:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Terjadi kesalahan server' }), { status: 500, headers });
  }
});
