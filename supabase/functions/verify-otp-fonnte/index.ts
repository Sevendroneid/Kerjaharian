import { createClient } from 'npm:@supabase/supabase-js@2';
const SB_URL = Deno.env.get('SB_URL')!;
const SB_KEY = Deno.env.get('SB_KEY')!;
const supabase = createClient(SB_URL, SB_KEY);
const cors = (origin: string | null) => ({ 'Access-Control-Allow-Origin': origin === 'https://kerjaharian.vercel.app' ? origin : 'https://kerjaharian.vercel.app', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Content-Type': 'application/json' });
async function sha256(value: string) { const bytes = new TextEncoder().encode(value); const digest = await crypto.subtle.digest('SHA-256', bytes); return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2,'0')).join(''); }
function normalizePhone(input: string) { const digits = input.replace(/\D/g,''); if (digits.startsWith('0')) return `62${digits.slice(1)}`; if (digits.startsWith('62')) return digits; return `62${digits}`; }
Deno.serve(async (req) => {
  const headers = cors(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  if (req.method !== 'POST') return new Response(JSON.stringify({ valid:false,error:'Method tidak diizinkan' }), { status:405, headers });
  try {
    const body = await req.json();
    const target = normalizePhone(String(body.phone || ''));
    const code = String(body.code || '').trim();
    if (!/^62\d{8,15}$/.test(target) || !/^\d{6}$/.test(code)) return new Response(JSON.stringify({ valid:false,error:'Nomor atau kode tidak valid' }), { status:400, headers });
    const hash = await sha256(`${target}:${code}`);
    const { data: valid, error } = await supabase.rpc('consume_fonnte_otp',{ p_phone:target, p_code_hash:hash });
    if (error) throw error;
    if (valid !== true) return new Response(JSON.stringify({ valid:false,error:'Kode OTP salah atau kadaluarsa' }), { status:400, headers });
    return new Response(JSON.stringify({ valid:true }), { status:200, headers });
  } catch (error) {
    console.error('verify-otp-fonnte:', error);
    return new Response(JSON.stringify({ valid:false,error:'Gagal memeriksa OTP' }), { status:500, headers });
  }
});
