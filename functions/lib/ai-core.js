import { createClient } from '@supabase/supabase-js';

export const json = (body, status = 200, extra = {}) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra } });
export const cors = (origin) => ({ 'access-control-allow-origin': origin || '*', 'access-control-allow-headers': 'authorization, content-type', 'access-control-allow-methods': 'POST, OPTIONS' });
export const clean = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();

export async function authenticate(request, env, allowedRoles = ['worker', 'employer', 'admin']) {
  const authorization = request.headers.get('authorization') || '';
  if (!authorization.startsWith('Bearer ')) return null;
  const token = authorization.slice(7);
  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const anonKey = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  const client = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data?.user) return null;
  const { data: profile } = await client.from('profiles').select('id,role,is_online,full_name').eq('id', data.user.id).maybeSingle();
  if (!profile || !allowedRoles.includes(profile.role)) return null;
  return { client, token, user: data.user, profile, url, anonKey };
}

export async function model(message, context, env, system) {
  const safeSystem = system || 'Anda adalah KerjaHarian AI. Gunakan hanya fakta dari CONTEXT. Jangan mengarang data, status, harga, identitas, atau tindakan. Jika data kurang, katakan kurang. Jawab Bahasa Indonesia secara ringkas dan konkret.';
  if (env.AI?.run) {
    try {
      const result = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', { messages: [{ role: 'system', content: safeSystem }, { role: 'user', content: `CONTEXT: ${JSON.stringify(context)}\n\nINPUT: ${message}` }], max_tokens: 700 });
      const answer = result?.response || result?.result?.response;
      if (typeof answer === 'string' && answer.trim()) return { answer: answer.trim(), provider: 'workers-ai' };
    } catch {}
  }
  return null;
}

export function classify(text) {
  const t = clean(text).toLowerCase();
  if (/harga|upah|tarif|bayaran/.test(t)) return 'pricing';
  if (/daftar|registrasi|akun|login|masuk|otp/.test(t)) return 'account';
  if (/kerja|lowongan|job|panggilan|ambil pekerjaan/.test(t)) return 'work';
  if (/pekerja|karyawan|tenaga/.test(t)) return 'worker_search';
  if (/order|pesanan|pekerjaan|status|gagal|masalah|kendala/.test(t)) return 'problem';
  return 'general';
}

export async function userContext(auth, env) {
  const h = { apikey: auth.anonKey, Authorization: `Bearer ${auth.token}` };
  const [jobsRes, ownJobsRes] = await Promise.all([
    fetch(`${auth.url}/rest/v1/jobs?select=id,title,category,location,wage,wage_type,status,workflow_status,created_at&status=eq.open&is_deleted=eq.false&order=created_at.desc&limit=20`, { headers: h }),
    fetch(`${auth.url}/rest/v1/jobs?select=id,title,category,location,wage,wage_type,status,workflow_status,created_at&employer_id=eq.${encodeURIComponent(auth.user.id)}&is_deleted=eq.false&order=created_at.desc&limit=10`, { headers: h })
  ]);
  return { role: auth.profile.role, is_online: auth.profile.is_online === true, jobs: jobsRes.ok ? await jobsRes.json() : [], own_jobs: ownJobsRes.ok ? await ownJobsRes.json() : [] };
}

export async function adminContext(auth) {
  const { data: profiles } = await auth.client.from('profiles').select('role,is_online,kyc_status');
  const { data: jobs } = await auth.client.from('jobs').select('id,title,category,location,wage,status,workflow_status,created_at').eq('is_deleted', false).order('created_at', { ascending: false }).limit(50);
  const rows = Array.isArray(profiles) ? profiles : [];
  const js = Array.isArray(jobs) ? jobs : [];
  return { counts: { workers: rows.filter(x => x.role === 'worker').length, employers: rows.filter(x => x.role === 'employer').length, online_workers: rows.filter(x => x.role === 'worker' && x.is_online).length, pending_kyc: rows.filter(x => x.kyc_status === 'pending').length, open: js.filter(x => x.status === 'open').length, active: js.filter(x => x.workflow_status === 'active').length, assigned: js.filter(x => x.status === 'assigned').length }, recent_jobs: js.slice(0, 20) };
}
