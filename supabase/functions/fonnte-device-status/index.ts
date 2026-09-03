import { createClient } from 'npm:@supabase/supabase-js@2';

const SB_URL = Deno.env.get('SB_URL')!;
const SB_KEY = Deno.env.get('SB_KEY')!;
const supabase = createClient(SB_URL, SB_KEY);
const headers = { 'Content-Type': 'application/json' };

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'method_not_allowed' }), { status: 405, headers });
  try {
    const token = new URL(req.url).searchParams.get('token') || '';
    const { data: config } = await supabase.from('fonnte_monitor_config').select('webhook_secret').eq('id', true).maybeSingle();
    if (!config?.webhook_secret || token !== config.webhook_secret) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers });
    const body = await req.json();
    const device = String(body.device ?? '').trim();
    const status = String(body.status ?? '').toLowerCase();
    const reason = body.reason ? String(body.reason) : null;
    const rawTimestamp = body.timestamp;
    const numericTimestamp = Number(rawTimestamp);
    const eventDate = Number.isFinite(numericTimestamp)
      ? new Date(numericTimestamp > 1e12 ? numericTimestamp : numericTimestamp * 1000)
      : new Date();
    if (!device || !['connect', 'disconnect'].includes(status)) return new Response(JSON.stringify({ error: 'invalid_payload' }), { status: 400, headers });
    const eventAt = Number.isNaN(eventDate.getTime()) ? new Date().toISOString() : eventDate.toISOString();
    const now = new Date().toISOString();
    const { error: insertError } = await supabase.from('fonnte_device_status').insert({ device, status, reason, source: 'webhook', event_at: eventAt, checked_at: now, raw: body });
    if (insertError) throw insertError;
    const { error: updateError } = await supabase.from('fonnte_monitor_config').update({ device, last_status: status, last_reason: reason, last_event_at: eventAt, last_health_check_at: now, consecutive_failures: status === 'connect' ? 0 : 1, updated_at: now }).eq('id', true);
    if (updateError) throw updateError;
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
  } catch (error) {
    console.error('fonnte-device-status:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'internal_error' }), { status: 500, headers });
  }
});
