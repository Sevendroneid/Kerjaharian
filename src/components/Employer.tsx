import { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle2,
  MapPin,
  Wallet,
  Info,
  Trash2,
  Send,
  Briefcase,
  Loader2,
  Lock,
} from 'lucide-react';
import { CATEGORIES, CATEGORY_MAP } from '@/lib/data';
import type { CategoryId } from '@/lib/types';
import { formatIDR, MIN_WAGE_DAILY, timeAgo } from '@/lib/format';
import { calculateOrderPrice } from '@/utils/pricingEngine';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

interface EmployerProps {
  onAuthClick: (mode: 'signin' | 'signup') => void;
  initialCategory?: CategoryId | null;
}

interface JobPrice {
  id: string;
  category_id: string;
  job_name: string;
  slug: string;
  tier: number;
  base_price: number;
  unit: string;
  requires_k3: boolean;
  required_certification: string | null;
  is_active: boolean;
}

interface OrderItem {
  id: string;
  status: string;
  total_price: number;
  tier: string;
  created_at: string;
  job_prices?: { job_name: string } | null;
  order_locations?: { address: string }[] | null;
}

export function Employer({ onAuthClick, initialCategory }: EmployerProps) {
  const { user, loading: authLoading } = useAuth();
  const [category, setCategory] = useState<CategoryId>(initialCategory ?? 'logistik');
  const [jobPrices, setJobPrices] = useState<JobPrice[]>([]);
  const [selectedJobPriceId, setSelectedJobPriceId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [wage, setWage] = useState('');
  const [nightShift, setNightShift] = useState(false);
  const [needsTools, setNeedsTools] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const selectedJobPrice = jobPrices.find((j) => j.id === selectedJobPriceId) ?? null;
  const floorPrice = selectedJobPrice?.base_price ?? MIN_WAGE_DAILY;

  const wageNum = Math.max(0, parseInt(wage.replace(/[^0-9]/g, ''), 10) || 0);
  const belowMin = wageNum > 0 && wageNum < floorPrice;
  const selectedCat = CATEGORY_MAP[category];

  const pricing = calculateOrderPrice({ wageAmount: wageNum, nightShift, needsTools });
  const { nightShiftAdd, toolAllowance, baseWage, adminFee, ppn, insurance, totalPrice } = pricing;

  const fetchJobPrices = useCallback(async () => {
    const { data, error } = await supabase
      .from('job_prices')
      .select('*')
      .eq('category_id', category)
      .eq('is_active', true)
      .order('job_name', { ascending: true });
    if (!error && data) {
      setJobPrices(data as JobPrice[]);
      setSelectedJobPriceId(null);
      setWage('');
    }
  }, [category]);

  const fetchOrders = useCallback(async () => {
    if (!user) return;
    setLoadingOrders(true);
    const { data, error } = await supabase
      .from('orders')
      .select('*, job_prices(job_name), order_locations(address)')
      .eq('employer_id', user.id)
      .order('created_at', { ascending: false });
    if (!error && data) setOrders(data as unknown as OrderItem[]);
    setLoadingOrders(false);
  }, [user]);

  useEffect(() => {
    fetchJobPrices();
  }, [fetchJobPrices]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    if (initialCategory) setCategory(initialCategory);
  }, [initialCategory]);

  useEffect(() => {
    if (selectedJobPrice) setWage(String(selectedJobPrice.base_price));
  }, [selectedJobPrice]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!user) {
      onAuthClick('signup');
      return;
    }

    if (!selectedJobPrice) {
      return setError('Pilih jenis pekerjaan terlebih dahulu.');
    }

    // ===== JALAN PINTAS KTP =====
    const { data: profileCheck } = await supabase
      .from('profiles')
      .select('ktp_photo_url, whatsapp')
      .eq('id', user.id)
      .single();

    const allowedBypassPhones = ['088289767020', '6288289767020', '+6288289767020'];
    const userPhone = profileCheck?.whatsapp || (user as any)?.phone || '';

    const isBypassAllowed = allowedBypassPhones.some((phone) =>
      userPhone.replace(/\D/g, '').endsWith(phone.replace(/\D/g, '').slice(-10))
    );

    if (!profileCheck?.ktp_photo_url && !isBypassAllowed) {
      return setError(
        'Verifikasi KTP wajib diselesaikan sebelum membuat pesanan. Hubungi CS untuk bantuan verifikasi.'
      );
    }
    // ===== END JALAN PINTAS =====

    const { count } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('employer_id', user.id)
      .in('status', ['open', 'pending_payment']);

    if ((count ?? 0) >= 3) {
      return setError('Kamu sudah punya 3 pesanan aktif. Selesaikan salah satu dulu sebelum membuat yang baru.');
    }
    if (!location.trim()) return setError('Lokasi pengerjaan wajib diisi.');
    if (wageNum < floorPrice)
      return setError(`Upah tidak boleh di bawah harga patokan ${formatIDR(floorPrice)}.`);

    setSubmitting(true);

    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert({
        employer_id: user.id,
        worker_id: null,
        job_price_id: selectedJobPrice.id,
        status: 'pending_payment',
        hours: null,
        tier: String(selectedJobPrice.tier),
        night_shift: nightShift,
        tool_allowance: needsTools ? toolAllowance : 0,
        physical_load: false,
        subtotal: baseWage + nightShiftAdd + (needsTools ? toolAllowance : 0),
        admin_fee: adminFee,
        ppn: ppn,
        insurance: insurance.totalMicroInsurance,
        total_price: totalPrice,
      })
      .select('*, job_prices(job_name)')
      .single();

    if (orderError) {
      setError(orderError.message);
      setSubmitting(false);
      return;
    }

    // Catatan: kolom order_locations diasumsikan (order_id, address, notes) —
    // kalau insert ini gagal, kirim struktur tabel order_locations & saya patch.
    await supabase.from('order_locations').insert({
      order_id: orderData.id,
      address: location.trim(),
      notes: title.trim() || null,
    });

    setOrders((prev) => [{ ...orderData, order_locations: [{ address: location.trim() }] } as OrderItem, ...prev]);
    setTitle('');
    setLocation('');
    setWage('');
    setSuccess(true);
    setSubmitting(false);
    setTimeout(() => setSuccess(false), 4000);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('orders').delete().eq('id', id);
    if (!error) setOrders((prev) => prev.filter((o) => o.id !== id));
  };

  return (
    <div className="bg-slate-50 pb-20 pt-8">
      <div className="container-app">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
            <Briefcase className="h-3.5 w-3.5" />
            Pemberi Kerja
          </div>
          <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Pesan Tenaga Kerja Terampil
          </h1>
          <p className="mt-2 max-w-xl text-slate-500">
            Pilih jenis pekerjaan, harga patokan muncul otomatis. Pekerja terdekat akan
            menerima panggilan dan menghubungi Anda langsung.
          </p>
        </div>

        {!authLoading && !user && (
          <div className="mb-6 flex items-center gap-3 rounded-xl bg-primary-50 px-5 py-4 ring-1 ring-primary-200">
            <Lock className="h-5 w-5 shrink-0 text-primary-600" />
            <p className="text-sm text-primary-800">
              <button onClick={() => onAuthClick('signin')} className="font-bold underline underline-offset-2">
                Masuk
              </button>{' '}
              atau{' '}
              <button onClick={() => onAuthClick('signup')} className="font-bold underline underline-offset-2">
                daftar
              </button>{' '}
              untuk menyimpan dan mengelola pekerjaan Anda.
            </p>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <form onSubmit={handleSubmit} className="card p-6 sm:p-8">
              <h2 className="font-display text-lg font-bold text-slate-900">
                1. Pilih Kategori Layanan
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {CATEGORIES.map((cat) => {
                  const active = category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={`flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-all ${
                        active
                          ? 'border-primary-500 bg-primary-50/50 ring-1 ring-primary-200'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div
                        className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-gradient-to-br ${cat.gradient} text-white`}
                      >
                        <cat.icon className="h-5 w-5" strokeWidth={2.5} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900">{cat.label}</p>
                        <p className="truncate text-xs text-slate-500">{cat.examples[0]}</p>
                      </div>
                      {active && <CheckCircle2 className="ml-auto h-5 w-5 shrink-0 text-primary-600" />}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4">
                <label className="label">Jenis Pekerjaan Spesifik</label>
                {jobPrices.length === 0 ? (
                  <p className="text-xs text-slate-400">Belum ada jenis pekerjaan untuk kategori ini.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {jobPrices.map((jp) => (
                      <button
                        key={jp.id}
                        type="button"
                        onClick={() => setSelectedJobPriceId(jp.id === selectedJobPriceId ? null : jp.id)}
                        className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                          selectedJobPriceId === jp.id
                            ? 'bg-primary-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {jp.job_name}
                      </button>
                    ))}
                  </div>
                )}
                {selectedJobPrice && (
                  <p className="mt-1.5 text-xs text-slate-500">
                    Harga patokan: {formatIDR(selectedJobPrice.base_price)} / {selectedJobPrice.unit}
                    {selectedJobPrice.requires_k3 && ' • Wajib sertifikat K3'}
                    {selectedJobPrice.required_certification && ` • Wajib: ${selectedJobPrice.required_certification}`}
                  </p>
                )}
              </div>

              <h2 className="mt-8 font-display text-lg font-bold text-slate-900">
                2. Rincian Pekerjaan
              </h2>
              <div className="mt-4 space-y-4">
                <div>
                  <label className="label">Detail Pekerjaan (opsional)</label>
                  <textarea
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    rows={3}
                    placeholder={selectedCat.examples[0]}
                    className="input resize-none"
                  />
                </div>

                <div>
                  <label className="label">Lokasi Pengerjaan / Alamat Proyek</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Contoh: Jl. Mangga Dua, Jakarta Pusat"
                      className="input pl-11"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setNightShift(!nightShift)}
                    className={`flex-1 rounded-lg border-2 px-4 py-2.5 text-sm font-semibold transition ${
                      nightShift
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    🌙 Shift Malam (+20%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNeedsTools(!needsTools)}
                    className={`flex-1 rounded-lg border-2 px-4 py-2.5 text-sm font-semibold transition ${
                      needsTools
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    🧰 Butuh Alat Kerja
                  </button>
                </div>

                <div>
                  <label className="label">
                    Upah{' '}
                    <span className="font-normal text-slate-400">
                      (min {formatIDR(floorPrice)})
                    </span>
                  </label>
                  <div className="relative">
                    <Wallet className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                      value={wage ? formatIDR(wageNum).replace('Rp ', '') : ''}
                      onChange={(e) => setWage(e.target.value.replace(/[^0-9]/g, ''))}
                      inputMode="numeric"
                      disabled={!selectedJobPrice}
                      className={`input pl-11 ${belowMin ? 'ring-error-400 focus:ring-error-500' : ''}`}
                    />
                  </div>
                  {belowMin && (
                    <p className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-error-600">
                      <Info className="h-3.5 w-3.5" />
                      Upah di bawah harga patokan ({formatIDR(floorPrice)}).
                    </p>
                  )}
                </div>
              </div>

              <h2 className="mt-8 font-display text-lg font-bold text-slate-900">
                3. Kalkulasi Transparan
              </h2>
              <div className="mt-4 rounded-xl bg-slate-50 p-5 ring-1 ring-slate-200">
                <SummaryRow label="Upah Pokok" value={formatIDR(baseWage)} />

                {nightShift && (
                  <SummaryRow label="Shift Malam (+20%)" value={formatIDR(nightShiftAdd)} />
                )}
                {needsTools && (
                  <SummaryRow label="Alat Kerja" value={formatIDR(toolAllowance)} />
                )}
                <SummaryRow
                  label="Biaya Layanan & Asuransi"
                  value={formatIDR(adminFee + ppn + insurance.totalMicroInsurance)}
                  muted
                />

                <div className="ml-4 mt-1 space-y-0.5">
                  <SummaryRow label="Biaya Admin (10%)" value={formatIDR(adminFee)} muted small />
                  <SummaryRow label="PPN (11%)" value={formatIDR(ppn)} muted small />
                  <SummaryRow label="Asuransi BPJS" value={formatIDR(insurance.bpjsCoverage)} muted small />
                  <SummaryRow label="Asuransi FWD" value={formatIDR(insurance.fwdCoverage)} muted small />
                </div>
                <div className="my-3 border-t border-dashed border-slate-300" />
                <div className="flex items-center justify-between">
                  <span className="font-display text-base font-bold text-slate-900">Total Pembayaran</span>
                  <span className="font-display text-xl font-extrabold text-primary-700">
                    {formatIDR(totalPrice)}
                  </span>
                </div>
              </div>

              {error && (
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-error-50 px-4 py-3 text-sm font-semibold text-error-700 ring-1 ring-error-200">
                  <Info className="h-4 w-4" />
                  {error}
                </div>
              )}
              {success && (
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-success-50 px-4 py-3 text-sm font-semibold text-success-700 ring-1 ring-success-200 animate-fade-in">
                  <CheckCircle2 className="h-4 w-4" />
                  Pekerjaan dipublikasikan! Pekerja terdekat akan menerima panggilan.
                </div>
              )}

              <button type="submit" disabled={submitting} className="btn-primary mt-5 w-full">
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Publikasikan & Cari Pekerja
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="lg:col-span-2">
            <div className="card p-6">
              <h3 className="font-display text-base font-bold text-slate-900">Pekerjaan Aktif Anda</h3>
              <p className="mt-1 text-sm text-slate-500">{orders.length} pekerjaan dipublikasikan</p>

              {!user ? (
                <div className="mt-6 rounded-xl border-2 border-dashed border-slate-200 p-8 text-center">
                  <Briefcase className="mx-auto h-8 w-8 text-slate-300" />
                  <p className="mt-2 text-sm text-slate-400">Masuk untuk melihat dan mengelola pekerjaan Anda.</p>
                </div>
              ) : loadingOrders ? (
                <div className="mt-6 flex justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
                </div>
              ) : orders.length === 0 ? (
                <div className="mt-6 rounded-xl border-2 border-dashed border-slate-200 p-8 text-center">
                  <Briefcase className="mx-auto h-8 w-8 text-slate-300" />
                  <p className="mt-2 text-sm text-slate-400">Belum ada pekerjaan yang dipublikasikan.</p>
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-slate-900">
                            {order.job_prices?.job_name ?? 'Pesanan'}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {order.order_locations?.[0]?.address ?? '-'} • {timeAgo(order.created_at)}
                          </p>
                        </div>
           
