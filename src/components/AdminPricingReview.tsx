import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type JobPrice = {
  id: string;
  category_id: string;
  job_name: string;
  unit: string;
  base_price: number;
  minimum_price: number;
  duration_minutes: number | null;
  overtime_rate_per_minute: number | null;
  is_active: boolean;
};

type AuditRow = {
  id: string;
  job_price_id: string;
  old_price: number;
  proposed_price: number;
  reasoning: string | null;
  job_prices?: { job_name: string } | null;
};

const money = (value: number) => `Rp${Number(value || 0).toLocaleString('id-ID')}`;
const durationLabel = (minutes: number) => `${Math.floor(minutes / 60)}j ${minutes % 60}m`;

export default function AdminPricingReview() {
  const [prices, setPrices] = useState<JobPrice[]>([]);
  const [audits, setAudits] = useState<AuditRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Partial<JobPrice>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const load = async () => {
    setLoading(true);
    setMessage('');
    const [pricing, audit] = await Promise.all([
      supabase.rpc('admin_list_job_timing'),
      supabase.from('job_prices_audit').select('*, job_prices(job_name)').eq('status', 'pending'),
    ]);
    if (pricing.error) setMessage(pricing.error.message);
    else setPrices((pricing.data ?? []) as JobPrice[]);
    setAudits((audit.data ?? []) as AuditRow[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateDraft = (id: string, field: keyof JobPrice, value: number) => {
    setDrafts((current) => ({ ...current, [id]: { ...current[id], [field]: value } }));
  };

  const save = async (row: JobPrice) => {
    const draft = drafts[row.id] ?? {};
    const basePrice = Number(draft.base_price ?? row.base_price);
    const minimumPrice = Number(draft.minimum_price ?? row.minimum_price ?? row.base_price);
    const duration = Number(draft.duration_minutes ?? row.duration_minutes ?? 480);
    const overtime = Number(draft.overtime_rate_per_minute ?? row.overtime_rate_per_minute ?? Math.ceil((basePrice / duration) * 1.5));

    setSaving(row.id);
    setMessage('');
    const { error } = await supabase.rpc('admin_set_job_pricing', {
      p_job_price_id: row.id,
      p_base_price: basePrice,
      p_minimum_price: minimumPrice,
      p_duration_minutes: duration,
      p_overtime_rate_per_minute: overtime,
    });
    setSaving(null);
    if (error) setMessage(error.message);
    else {
      setMessage(`${row.job_name} berhasil disimpan.`);
      await load();
    }
  };

  const approve = async (row: AuditRow) => {
    const current = prices.find((p) => p.id === row.job_price_id);
    if (!current) return;
    setSaving(row.id);
    const { error } = await supabase.rpc('admin_set_job_pricing', {
      p_job_price_id: row.job_price_id,
      p_base_price: row.proposed_price,
      p_minimum_price: Math.min(current.minimum_price, row.proposed_price),
      p_duration_minutes: current.duration_minutes ?? 480,
      p_overtime_rate_per_minute: current.overtime_rate_per_minute ?? Math.ceil((row.proposed_price / (current.duration_minutes ?? 480)) * 1.5),
    });
    if (!error) await supabase.from('job_prices_audit').update({ status: 'approved' }).eq('id', row.id);
    setSaving(null);
    setMessage(error ? error.message : 'Usulan harga disetujui.');
    await load();
  };

  const reject = async (row: AuditRow) => {
    await supabase.from('job_prices_audit').update({ status: 'rejected' }).eq('id', row.id);
    await load();
  };

  if (loading) return <div className="p-6">Memuat konfigurasi pekerjaan...</div>;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Panel Admin — Durasi & Overtime</h1>
        <p className="text-sm text-gray-600 mt-1">
          Semua pekerjaan yang sudah memiliki base price tampil di sini. Admin dapat menetapkan durasi, minimum price, dan tarif lembur.
        </p>
        <p className="text-sm text-gray-600 mt-1">
          Rekomendasi awal overtime: <b>150% dari tarif normal per menit</b>. Contoh Cuci AC Rp75.000/120 menit = Rp625/menit → overtime sekitar Rp938/menit.
        </p>
      </div>

      {message && <div className="rounded-lg bg-gray-100 p-3 text-sm">{message}</div>}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Daftar Pekerjaan ({prices.length})</h2>
        {prices.map((row) => {
          const draft = drafts[row.id] ?? {};
          const duration = Number(draft.duration_minutes ?? row.duration_minutes ?? 480);
          const overtime = Number(draft.overtime_rate_per_minute ?? row.overtime_rate_per_minute ?? Math.ceil((row.base_price / duration) * 1.5));
          return (
            <div key={row.id} className="border rounded-xl p-4 bg-white shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
                <div>
                  <div className="font-semibold">{row.job_name}</div>
                  <div className="text-xs text-gray-500">{row.category_id} · {row.unit}</div>
                </div>
                <div className="text-sm">Base: <b>{money(row.base_price)}</b></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <label className="text-sm">Base price<input type="number" min="0" value={draft.base_price ?? row.base_price} onChange={(e) => updateDraft(row.id, 'base_price', Number(e.target.value))} className="mt-1 w-full border rounded-lg p-2" /></label>
                <label className="text-sm">Minimum price<input type="number" min="0" value={draft.minimum_price ?? row.minimum_price ?? row.base_price} onChange={(e) => updateDraft(row.id, 'minimum_price', Number(e.target.value))} className="mt-1 w-full border rounded-lg p-2" /></label>
                <label className="text-sm">Durasi (menit)<input type="number" min="1" value={draft.duration_minutes ?? row.duration_minutes ?? 480} onChange={(e) => updateDraft(row.id, 'duration_minutes', Number(e.target.value))} className="mt-1 w-full border rounded-lg p-2" /></label>
                <label className="text-sm">Overtime / menit<input type="number" min="0" value={draft.overtime_rate_per_minute ?? row.overtime_rate_per_minute ?? overtime} onChange={(e) => updateDraft(row.id, 'overtime_rate_per_minute', Number(e.target.value))} className="mt-1 w-full border rounded-lg p-2" /></label>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-3 text-xs text-gray-500">
                <span>Durasi: {durationLabel(duration)} · Overtime: {money(overtime)}/menit</span>
                <button disabled={saving === row.id} onClick={() => save(row)} className="bg-black text-white px-4 py-2 rounded-lg disabled:opacity-50">{saving === row.id ? 'Menyimpan...' : 'Simpan'}</button>
              </div>
            </div>
          );
        })}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Review Usulan Harga AI</h2>
        {audits.length === 0 && <p className="text-sm text-gray-500">Tidak ada usulan pending.</p>}
        {audits.map((row) => (
          <div key={row.id} className="border rounded-xl p-4">
            <p className="font-semibold">{row.job_prices?.job_name ?? row.job_price_id}</p>
            <p>{money(row.old_price)} → {money(row.proposed_price)}</p>
            <p className="text-sm text-gray-600 mt-1">{row.reasoning}</p>
            <div className="flex gap-2 mt-3">
              <button disabled={saving === row.id} onClick={() => approve(row)} className="bg-green-600 text-white px-3 py-2 rounded-lg disabled:opacity-50">Setujui</button>
              <button disabled={saving === row.id} onClick={() => reject(row)} className="bg-red-500 text-white px-3 py-2 rounded-lg disabled:opacity-50">Tolak</button>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
