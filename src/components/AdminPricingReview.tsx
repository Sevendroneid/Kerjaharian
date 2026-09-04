import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronUp, Filter, RefreshCw, Search, Save, Sparkles, ToggleLeft, ToggleRight, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type JobPrice = {
  id: string;
  category_id: string;
  category_label: string | null;
  job_name: string;
  slug: string;
  tier: number;
  base_price: number;
  minimum_price: number;
  unit: string;
  pay_unit: string | null;
  description: string | null;
  location_scope: string | null;
  duration_minutes: number | null;
  duration_label: string | null;
  contract_duration: string | null;
  overtime_rate_per_minute: number | null;
  source_system: string | null;
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

type Draft = Partial<JobPrice>;

const money = (value: number) => `Rp${Number(value || 0).toLocaleString('id-ID')}`;
const durationLabel = (minutes: number) => `${Math.floor(minutes / 60)}j ${minutes % 60 ? `${minutes % 60}m` : ''}`.trim();
const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const categoryOptions = [
  ['logistik', 'Logistik'],
  ['renovasi', 'Konstruksi'],
  ['kebersihan', 'Kebersihan'],
  ['serabutan', 'Serabutan'],
] as const;
const unitOptions = ['day', 'hour', 'shift', 'sesi', 'kunjungan', 'paket', 'unit', 'mobil'];

export default function AdminPricingReview() {
  const [prices, setPrices] = useState<JobPrice[]>([]);
  const [audits, setAudits] = useState<AuditRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [activeOnly, setActiveOnly] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const load = async () => {
    setLoading(true);
    setMessage('');
    const [pricing, audit] = await Promise.all([
      supabase.rpc('admin_list_job_catalog'),
      supabase.from('job_prices_audit').select('*, job_prices(job_name)').eq('status', 'pending'),
    ]);
    if (pricing.error) setMessage(pricing.error.message);
    else setPrices((pricing.data ?? []) as JobPrice[]);
    if (!audit.error) setAudits((audit.data ?? []) as AuditRow[]);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return prices.filter((row) => {
      if (activeOnly && !row.is_active) return false;
      if (category !== 'all' && row.category_id !== category) return false;
      if (!q) return true;
      return [row.job_name, row.category_label, row.category_id, row.location_scope, row.description]
        .some((value) => String(value ?? '').toLowerCase().includes(q));
    });
  }, [prices, query, category, activeOnly]);

  const updateDraft = (id: string, field: keyof JobPrice, value: string | number | boolean | null) => {
    setDrafts((current) => ({ ...current, [id]: { ...current[id], [field]: value } }));
  };

  const save = async (row: JobPrice) => {
    const d = drafts[row.id] ?? {};
    const basePrice = Number(d.base_price ?? row.base_price);
    const minimumPrice = Number(d.minimum_price ?? row.minimum_price ?? basePrice);
    const duration = Number(d.duration_minutes ?? row.duration_minutes ?? 480);
    const overtime = Number(d.overtime_rate_per_minute ?? row.overtime_rate_per_minute ?? Math.ceil((basePrice / duration) * 1.5));
    const jobName = String(d.job_name ?? row.job_name).trim();
    const slug = slugify(String(d.slug ?? row.slug ?? jobName));
    setSaving(row.id);
    setMessage('');
    const { error } = await supabase.rpc('admin_set_job_catalog', {
      p_job_price_id: row.id,
      p_category_id: String(d.category_id ?? row.category_id),
      p_category_label: String(d.category_label ?? row.category_label ?? ''),
      p_job_name: jobName,
      p_slug: slug,
      p_description: String(d.description ?? row.description ?? ''),
      p_location_scope: String(d.location_scope ?? row.location_scope ?? ''),
      p_base_price: basePrice,
      p_minimum_price: minimumPrice,
      p_unit: String(d.unit ?? row.unit ?? 'day'),
      p_pay_unit: String(d.pay_unit ?? row.pay_unit ?? ''),
      p_duration_minutes: duration,
      p_duration_label: String(d.duration_label ?? row.duration_label ?? durationLabel(duration)),
      p_contract_duration: String(d.contract_duration ?? row.contract_duration ?? ''),
      p_overtime_rate_per_minute: overtime,
      p_source_system: String(d.source_system ?? row.source_system ?? ''),
      p_tier: Number(d.tier ?? row.tier ?? 1),
      p_is_active: Boolean(d.is_active ?? row.is_active),
    });
    setSaving(null);
    if (error) setMessage(`Gagal menyimpan ${row.job_name}: ${error.message}`);
    else {
      setMessage(`${jobName} berhasil di-apply ke katalog.`);
      await load();
      setDrafts((current) => { const next = { ...current }; delete next[row.id]; return next; });
    }
  };

  const approve = async (row: AuditRow) => {
    const current = prices.find((p) => p.id === row.job_price_id);
    if (!current) return;
    setSaving(row.id);
    const { error } = await supabase.rpc('admin_set_job_catalog', {
      p_job_price_id: current.id,
      p_category_id: current.category_id,
      p_category_label: current.category_label ?? current.category_id,
      p_job_name: current.job_name,
      p_slug: current.slug,
      p_description: current.description ?? '',
      p_location_scope: current.location_scope ?? '',
      p_base_price: row.proposed_price,
      p_minimum_price: Math.min(current.minimum_price, row.proposed_price),
      p_unit: current.unit,
      p_pay_unit: current.pay_unit ?? current.unit,
      p_duration_minutes: current.duration_minutes ?? 480,
      p_duration_label: current.duration_label ?? durationLabel(current.duration_minutes ?? 480),
      p_contract_duration: current.contract_duration ?? '',
      p_overtime_rate_per_minute: current.overtime_rate_per_minute ?? Math.ceil((row.proposed_price / (current.duration_minutes ?? 480)) * 1.5),
      p_source_system: current.source_system ?? '',
      p_tier: current.tier,
      p_is_active: current.is_active,
    });
    if (!error) await supabase.from('job_prices_audit').update({ status: 'approved', reviewed_at: new Date().toISOString() }).eq('id', row.id);
    setSaving(null);
    setMessage(error ? error.message : 'Usulan harga disetujui dan langsung di-apply.');
    await load();
  };

  const reject = async (row: AuditRow) => {
    setSaving(row.id);
    const { error } = await supabase.from('job_prices_audit').update({ status: 'rejected', reviewed_at: new Date().toISOString() }).eq('id', row.id);
    setSaving(null);
    setMessage(error ? error.message : 'Usulan harga ditolak.');
    await load();
  };

  if (loading) return <div className="p-6">Memuat katalog pekerjaan...</div>;

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-3 sm:p-5">
      <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-slate-600"><Sparkles className="h-3.5 w-3.5"/>Job Catalog</div>
            <h1 className="text-2xl font-black tracking-tight">Katalog Pekerjaan & Harga</h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-500">Edit langsung nama, kategori, upah, durasi, overtime, lokasi, kontrak, dan status. Tombol <b>Apply</b> menyimpan perubahan ke database dan menjadi konfigurasi yang dipakai engine pekerjaan.</p>
          </div>
          <button onClick={() => void load()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold"><RefreshCw className="h-4 w-4"/>Refresh</button>
        </div>

        <div className="mt-5 grid gap-2 md:grid-cols-[1fr_180px_auto]">
          <label className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari pekerjaan, lokasi, kategori..." className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-slate-400"/></label>
          <label className="relative"><Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm font-semibold"><option value="all">Semua kategori</option>{categoryOptions.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <button onClick={() => setActiveOnly((v) => !v)} className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold ring-1 ${activeOnly ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-700 ring-slate-200'}`}>{activeOnly ? <ToggleRight className="h-4 w-4"/> : <ToggleLeft className="h-4 w-4"/>}{activeOnly ? 'Aktif saja' : 'Semua status'}</button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500"><span>{filtered.length} ditampilkan</span><span>·</span><span>{prices.length} total katalog</span><span>·</span><span>{audits.length} usulan pending</span></div>
      </div>

      {message && <div className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white">{message}</div>}

      <section className="space-y-3">
        {filtered.map((row) => {
          const d = drafts[row.id] ?? {};
          const duration = Number(d.duration_minutes ?? row.duration_minutes ?? 480);
          const overtime = Number(d.overtime_rate_per_minute ?? row.overtime_rate_per_minute ?? Math.ceil((row.base_price / duration) * 1.5));
          const dirty = Object.keys(d).length > 0;
          const isExpanded = Boolean(expanded[row.id]);
          return (
            <article key={row.id} className={`overflow-hidden rounded-2xl bg-white ring-1 ${dirty ? 'ring-amber-300' : 'ring-slate-200'}`}>
              <div className="flex flex-col gap-3 p-4 lg:grid lg:grid-cols-[minmax(260px,1.5fr)_150px_150px_135px_130px_auto] lg:items-center">
                <div className="min-w-0">
                  <div className="flex items-center gap-2"><span className={`h-2 w-2 shrink-0 rounded-full ${row.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`}/><input value={d.job_name ?? row.job_name} onChange={(e) => updateDraft(row.id, 'job_name', e.target.value)} className="min-w-0 w-full rounded-lg border border-transparent px-1 py-1 text-sm font-black outline-none hover:border-slate-200 focus:border-slate-300"/></div>
                  <div className="mt-1 text-xs text-slate-500">{row.category_label ?? row.category_id} · {row.location_scope ?? 'Lokasi fleksibel'} · {row.source_system ?? '—'}</div>
                </div>
                <label className="text-[11px] font-bold text-slate-500">Upah<input type="number" min="1" value={d.base_price ?? row.base_price} onChange={(e) => updateDraft(row.id, 'base_price', Number(e.target.value))} className="mt-1 w-full rounded-lg border p-2 text-sm font-bold"/></label>
                <label className="text-[11px] font-bold text-slate-500">Minimum<input type="number" min="0" value={d.minimum_price ?? row.minimum_price ?? row.base_price} onChange={(e) => updateDraft(row.id, 'minimum_price', Number(e.target.value))} className="mt-1 w-full rounded-lg border p-2 text-sm font-bold"/></label>
                <label className="text-[11px] font-bold text-slate-500">Durasi (menit)<input type="number" min="1" value={d.duration_minutes ?? row.duration_minutes ?? 480} onChange={(e) => updateDraft(row.id, 'duration_minutes', Number(e.target.value))} className="mt-1 w-full rounded-lg border p-2 text-sm font-bold"/></label>
                <label className="text-[11px] font-bold text-slate-500">Overtime/menit<input type="number" min="0" value={d.overtime_rate_per_minute ?? row.overtime_rate_per_minute ?? overtime} onChange={(e) => updateDraft(row.id, 'overtime_rate_per_minute', Number(e.target.value))} className="mt-1 w-full rounded-lg border p-2 text-sm font-bold"/></label>
                <div className="flex gap-2 lg:justify-end"><button onClick={() => setExpanded((v) => ({ ...v, [row.id]: !isExpanded }))} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-bold">{isExpanded ? <ChevronUp className="h-4 w-4"/> : <ChevronDown className="h-4 w-4"/>}Detail</button><button disabled={saving === row.id || !dirty} onClick={() => void save(row)} className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"><Save className="h-4 w-4"/>{saving === row.id ? 'Apply...' : 'Apply'}</button></div>
              </div>

              {isExpanded && <div className="grid gap-4 border-t border-slate-100 bg-slate-50 p-4 md:grid-cols-2 xl:grid-cols-4">
                <label className="text-xs font-bold text-slate-600">Kategori<select value={d.category_id ?? row.category_id} onChange={(e) => updateDraft(row.id, 'category_id', e.target.value)} className="mt-1 w-full rounded-lg border bg-white p-2 text-sm"><option value="logistik">Logistik</option><option value="renovasi">Konstruksi</option><option value="kebersihan">Kebersihan</option><option value="serabutan">Serabutan</option></select></label>
                <label className="text-xs font-bold text-slate-600">Label kategori<input value={d.category_label ?? row.category_label ?? ''} onChange={(e) => updateDraft(row.id, 'category_label', e.target.value)} className="mt-1 w-full rounded-lg border bg-white p-2 text-sm"/></label>
                <label className="text-xs font-bold text-slate-600">Satuan sistem<select value={d.unit ?? row.unit} onChange={(e) => updateDraft(row.id, 'unit', e.target.value)} className="mt-1 w-full rounded-lg border bg-white p-2 text-sm">{unitOptions.map((u) => <option key={u} value={u}>{u}</option>)}</select></label>
                <label className="text-xs font-bold text-slate-600">Satuan upah<input value={d.pay_unit ?? row.pay_unit ?? ''} onChange={(e) => updateDraft(row.id, 'pay_unit', e.target.value)} className="mt-1 w-full rounded-lg border bg-white p-2 text-sm" placeholder="Per Hari"/></label>
                <label className="text-xs font-bold text-slate-600">Lokasi<input value={d.location_scope ?? row.location_scope ?? ''} onChange={(e) => updateDraft(row.id, 'location_scope', e.target.value)} className="mt-1 w-full rounded-lg border bg-white p-2 text-sm"/></label>
                <label className="text-xs font-bold text-slate-600">Durasi tampil<input value={d.duration_label ?? row.duration_label ?? durationLabel(duration)} onChange={(e) => updateDraft(row.id, 'duration_label', e.target.value)} className="mt-1 w-full rounded-lg border bg-white p-2 text-sm"/></label>
                <label className="text-xs font-bold text-slate-600">Durasi kontrak<input value={d.contract_duration ?? row.contract_duration ?? ''} onChange={(e) => updateDraft(row.id, 'contract_duration', e.target.value)} className="mt-1 w-full rounded-lg border bg-white p-2 text-sm"/></label>
                <label className="text-xs font-bold text-slate-600">Tier (1-4)<input type="number" min="1" max="4" value={d.tier ?? row.tier} onChange={(e) => updateDraft(row.id, 'tier', Number(e.target.value))} className="mt-1 w-full rounded-lg border bg-white p-2 text-sm"/></label>
                <label className="text-xs font-bold text-slate-600 md:col-span-2 xl:col-span-3">Deskripsi tugas<textarea rows={2} value={d.description ?? row.description ?? ''} onChange={(e) => updateDraft(row.id, 'description', e.target.value)} className="mt-1 w-full rounded-lg border bg-white p-2 text-sm"/></label>
                <label className="text-xs font-bold text-slate-600">Slug<input value={d.slug ?? row.slug} onChange={(e) => updateDraft(row.id, 'slug', slugify(e.target.value))} className="mt-1 w-full rounded-lg border bg-white p-2 text-sm font-mono"/></label>
                <label className="text-xs font-bold text-slate-600">Sumber<input value={d.source_system ?? row.source_system ?? ''} onChange={(e) => updateDraft(row.id, 'source_system', e.target.value)} className="mt-1 w-full rounded-lg border bg-white p-2 text-sm"/></label>
                <label className="flex items-end gap-2 rounded-lg border bg-white p-2 text-sm font-bold"><input type="checkbox" checked={Boolean(d.is_active ?? row.is_active)} onChange={(e) => updateDraft(row.id, 'is_active', e.target.checked)} className="h-4 w-4"/> Aktif dipakai employer</label>
                <div className="md:col-span-2 xl:col-span-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500"><span>Preview: <b>{money(Number(d.base_price ?? row.base_price))}</b> · {durationLabel(duration)} · {money(overtime)}/menit · {d.contract_duration ?? row.contract_duration ?? 'Tanpa kontrak khusus'}</span>{dirty && <span className="font-bold text-amber-700">Ada perubahan belum di-apply</span>}</div>
              </div>}
            </article>
          );
        })}
        {filtered.length === 0 && <div className="rounded-2xl bg-white p-10 text-center text-sm text-slate-500 ring-1 ring-slate-200">Tidak ada pekerjaan yang cocok dengan filter.</div>}
      </section>

      <section className="space-y-3 rounded-2xl bg-white p-4 ring-1 ring-slate-200 sm:p-5">
        <div className="flex items-center justify-between"><div><h2 className="font-black">Review Usulan Harga AI</h2><p className="text-xs text-slate-500">Approve langsung mengubah base price katalog.</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">{audits.length} pending</span></div>
        {audits.length === 0 ? <p className="py-4 text-sm text-slate-500">Tidak ada usulan pending.</p> : audits.map((row) => <div key={row.id} className="rounded-xl border p-4"><div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between"><div><b>{row.job_prices?.job_name ?? row.job_price_id}</b><div className="text-sm">{money(row.old_price)} → <b>{money(row.proposed_price)}</b></div><div className="mt-1 text-xs text-slate-500">{row.reasoning}</div></div><div className="flex gap-2"><button disabled={saving === row.id} onClick={() => void approve(row)} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"><Check className="h-4 w-4"/>Setujui & Apply</button><button disabled={saving === row.id} onClick={() => void reject(row)} className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-50"><X className="h-4 w-4"/>Tolak</button></div></div></div>)}
      </section>
    </div>
  );
}
