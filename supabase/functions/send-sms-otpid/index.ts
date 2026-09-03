import { Webhook } from 'npm:standardwebhooks@1.0.0';

const OTPID_BASE_URL = (Deno.env.get('OTPID_BASE_URL') || 'https://api.otp.id').replace(/\/$/, '');
const OTPID_API_KEY = Deno.env.get('OTPID_API_KEY');
const SEND_SMS_HOOK_SECRET = Deno.env.get('SEND_SMS_HOOK_SECRET');

function normalizePhone(input: string) {
  const digits = input.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('62')) return digits;
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  if (digits.startsWith('8')) return `62${digits}`;
  return '';
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
  if (!OTPID_API_KEY || !SEND_SMS_HOOK_SECRET) return json({ error: 'SMS provider is not configured' }, 500);

  try {
    const payload = await req.text();
    const headers = Object.fromEntries(req.headers);
    const secret = SEND_SMS_HOOK_SECRET.replace(/^v1,whsec_/, '');
    const webhook = new Webhook(secret);
    const { user, sms } = webhook.verify(payload, headers) as { user?: { phone?: string }; sms?: { otp?: string } };

    const destination = normalizePhone(String(user?.phone || ''));
    const otp = String(sms?.otp || '');
    if (!/^628\d{8,11}$/.test(destination) || !/^\d{6}$/.test(otp)) return json({ error: 'Invalid phone or OTP payload' }, 400);

    // Fail closed: OTP.ID's documented Tap-to-Verify flow is whatsapp_inbound and
    // does not document an outbound endpoint that accepts a Supabase-generated OTP.
    // Never call an undocumented provider endpoint or send a mismatched OTP.
    console.error('OTP.ID custom-code outbound integration is not configured');
    return json({ error: 'OTP provider integration is not configured for Supabase-generated OTP' }, 503);
  } catch (error) {
    console.error('send-sms-otpid:', error);
    return json({ error: 'Invalid or unverifiable SMS hook request' }, 400);
  }
});
