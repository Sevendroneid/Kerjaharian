import { createClient } from 'npm:@supabase/supabase-js@2';

const SB_URL = Deno.env.get('SB_URL')!;
const SB_KEY = Deno.env.get('SB_KEY')!;
const FONNTE_TOKEN = Deno.env.get('FONNTE_TOKEN')!;
const supabase = createClient(SB_URL, SB_KEY);

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'method_not_allowed' }), { status: 405 });
  try {
    const key = req.headers.get('x-health-key') || '';
    const { data: config } = await supabase.from('fonnte_monitor_config').select('health_secret').eq('id', true).maybeSingle();
    if (!config?.health_secret || key !== config.health_secret) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
    const response = await fetch('https://api.fonnte.com/device', { method: 'POST', headers: { Authorization: FONNTE_TOKEN } });
    const result = await response.json().catch(() => ({}));
    const now = new Date().toISOString();
    if (!response.ok || result?.status !== true) {
      await supabase.rpc('record_fonnte_health_failure', { p_reason: String(result?.reason || `HTTP ${response.status}`) });
      return new Response(JSON.stringify({ ok: false, reason: result?.reason || `HTTP ${response.status}` }), { status: 502 });
    }
    const device = String(result.device || '').trim();
    const status = result.device_status === 'connect' ? 'connect' : 'disconnect';
    await supabase.from('fonnte_device_status').insert({ device: device || 'unknown', status, reason: status === 'disconnect' ? 'healthcheck_detected_disconnect' : null, source: 'healthcheck', event_at: now, checked_at: now, raw: result });
    await supabase.from('fonnte_monitor_config').update({ device: device || null, last_status: status, last_reason: status === 'disconnect' ? 'healthcheck_detected_disconnect' : null, last_event_at: now, last_health_check_at: now, consecutive_failures: status === 'connect' ? 0 : 1, updated_at: now }).eq('id', true);
    return new Response(JSON.stringify({ ok: true, device, status, quota: result.quota }), { status: 200 });
  } catch (error) {
    console.error('fonnte-health-check:', error);
    await supabase.rpc('record_fonnte_health_failure', { p_reason: error instanceof Error ? error.message : 'network_error' });
    return new Response(JSON.stringify({ ok: false, error: 'health_check_failed' }), { status: 502 });
  }
});
