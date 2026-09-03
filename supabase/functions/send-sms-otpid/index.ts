import { Webhook } from 'npm:standardwebhooks@1.0.0';

const OTPID_BASE_URL = (Deno.env.get('OTPID_BASE_URL') || 'https://api.otp.id').replace(/\/$/, '');
const OTPID_API_KEY = Deno.env.get('OTPID_API_KEY');
const SEND_SMS_HOOK_SECRET = Deno.env.get('SEND_SMS_HOOK_SECRET');

function normalizePhone(input: string) {
  const digits = input.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  if (digits.startsWith('62')) return digits;
  return `62${digits}`;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
  if (!OTPID_API_KEY || !SEND_SMS_HOOK_SECRET) {
    console.error('Missing OTP.ID or Send SMS Hook secret');
    return new Response(JSON.stringify({ error: 'SMS provider is not configured' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const payload = await req.text();
    const headers = Object.fromEntries(req.headers);
    const secret = SEND_SMS_HOOK_SECRET.replace(/^v1,whsec_/, '');
    const wh = new Webhook(secret);
    const { user, sms } = wh.verify(payload, headers) as { user?: { phone?: string }; sms?: { otp?: string } };

    const destination = normalizePhone(String(user?.phone || ''));
    const otp = String(sms?.otp || '');
    if (!/^62\d{8,15}$/.test(destination) || !/^\d{6}$/.test(otp)) {
      return new Response(JSON.stringify({ error: 'Invalid phone or OTP payload' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const response = await fetch(`${OTPID_BASE_URL}/v3/send`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OTPID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: 'whatsapp',
        destination,
        otp,
        brand: 'KerjaHarian',
      }),
    });

    const result = await response.json().catch(() => null);
    const deliveryAccepted = response.ok && result?.success === true && ['sent', 'success'].includes(String(result?.data?.status || '').toLowerCase());

    if (!deliveryAccepted) {
      console.error('OTP.ID delivery rejected', { http_status: response.status, provider_status: result?.data?.status, error: result?.error });
      return new Response(JSON.stringify({ error: 'OTP delivery failed' }), { status: 502, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({}), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('send-sms-otpid:', error);
    return new Response(JSON.stringify({ error: 'Invalid or unverifiable SMS hook request' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
});
