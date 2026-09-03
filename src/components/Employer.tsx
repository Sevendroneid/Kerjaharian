import { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, MapPin, Wallet, Info, Trash2, Send, Briefcase, Loader2, Clock3 } from 'lucide-react';
import { CATEGORIES, CATEGORY_MAP } from '@/lib/data';
import type { CategoryId } from '@/lib/types';
import { formatIDR, MIN_WAGE_DAILY, timeAgo } from '@/lib/format';
import { calculateOrderPrice } from '@/utils/pricingEngine';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import type { I18n } from '@/lib/i18n';

interface EmployerProps {
  onAuthClick: (mode: 'signin' | 'signup') => void;
  initialCategory?: CategoryId | null;
  lang: 'id' | 'en';
  i18n: I18n;
}

interface JobPrice {
  id: string;
  category_id: string;
  job_name: string;
  base_price: number;
  duration_minutes: number | null;
  overtime_rate_per_minute: number | null;
}

interface OrderItem {
  id: string;
  status: string;
  total_price: number;
  created_at: string;
  job_prices?: { job_name: string } | null;
  order_locations?: Array<{ lat: number | null; lng: number | null }>;
}

function formatDuration(minutes: number | null, lang: 'id' | 'en') {
  if (!minutes || minutes <= 0) return lang === 'id' ? 'Durasi belum dikonfigurasi' : 'Duration not configured';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (lang === 'en') {
    return `${hours > 0 ? `${hours} hr${hours !== 1 ? 's' : ''}` : ''}${hours > 0 && mins > 0 ? ' ' : ''}${mins > 0 ? `${mins} min` : ''}`;
  }
  return `${hours > 0 ? `${hours} jam` : ''}${hours > 0 && mins > 0 ? ' ' : ''}${mins > 0 ? `${mins} menit` : ''}`;
}

export function Employer({ onAuthClick, initialCategory, lang, i18n }: EmployerProps) {
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
  const selectedCat = CATEGORY_MAP[category];
  const pricing = calculateOrderPrice({ wageAmount: wageNum, nightShift, needsTools });
  const { nightShiftAdd, baseWage, platformFee, insurance, totalPrice } = pricing;

  const fetchJobPrices = useCallback(async () => {
    const { data, error } = await supabase
      .from('job_prices')
      .select('id, category_id, job_name, base_price, duration_minutes, overtime_rate_per_minute')
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
      .select('*, job_prices(job_name), order_locations(lat, lng)')
      .eq('employer_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);
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
      setError(lang === 'id' ? 'Pilih jenis pekerjaan terlebih dahulu.' : 'Please select job type first.');
      return;
    }

    if (!selectedJobPrice.duration_minutes || selectedJobPrice.duration_minutes <= 0) {
      setError(lang === 'id' ? 'Durasi pekerjaan belum dikonfigurasi untuk jenis pekerjaan ini.' : 'Job duration is not configured for this job type.');
      return;
    }

    // Lightweight validation - NO KTP requirement
    const { count } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('employer_id', user.id)
      .in('status', ['open', 'assigned']);

    if ((count ?? 0) >= 5) {
      setError(lang === 'id' ? 'Maksimal 5 pesanan aktif.' : 'Maximum 5 active jobs.');
      return;
    }

    if (!location.trim()) {
      setError(lang === 'id' ? 'Lokasi pengerjaan wajib diisi.' : 'Job location is required.');
      return;
    }

    if (wageNum < floorPrice) {
      setError(
        lang === 'id'
          ? `Upah minimum ${formatIDR(floorPrice)}.`
          : `Minimum wage ${formatIDR(floorPrice)}.`
      );
      return;
    }

    setSubmitting(true);
    const { data: orderData, error: orderError } = await supabase.from('orders').insert({
      employer_id: user.id,
      worker_id: null,
      job_price_id: selectedJobPrice.id,
      status: 'open', // INSTANT PUBLISHING - NO PENDING_PAYMENT
      hours: Math.ceil(selectedJobPrice.duration_minutes / 60),
      wage: wageNum,
      total: totalPrice,
      night_shift: nightShift,
      // Informational suggestion only. Never used as a requirement or price modifier.
      needs_tools: needsTools,
      title: title || selectedJobPrice.job_name,
      location,
    }).select().single();

    if (orderError) {
      setError(orderError.message);
      setSubmitting(false);
      return;
    }

    // Geocoding (non-blocking)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          location.trim()
        )}&countrycodes=id&limit=1`,
        { signal: controller.signal }
      );

      clearTimeout(timeoutId);

      if (geoRes.ok) {
        const geoData = await geoRes.json();
        if (geoData && geoData.length > 0) {
          const lat = parseFloat(geoData[0].lat);
          const lng = parseFloat(geoData[0].lon);
          await supabase.from('order_locations').insert([{ order_id: orderData.id, lat, lng }]);
        }
      }
    } catch (err) {
      console.warn('Geocoding failed (non-blocking):', err);
    }

    setOrders((prev) => [{ ...orderData, order_locations: [{ lat: null, lng: null }] } as OrderItem, ...prev]);
    setTitle('');
    setLocation('');
    setWage('');
    setSuccess(true);
    setSubmitting(false);
    setTimeout(() => setSuccess(false), 5000);
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
            {lang === 'id' ? 'Pemberi Kerja' : 'Employer'}
          </div>
          <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            {lang === 'id' ? 'Pesan Tenaga Kerja Terampil' : 'Hire Skilled Workers'}
          </h1>
          <p className="mt-2 max-w-xl text-slate-500">
            {lang === 'id'
              ? 'Pilih jenis pekerjaan, harga dan durasi deal muncul otomatis. Publikasikan langsung!'
              : 'Select a job type; deal price and duration appear automatically. Publish instantly!'}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <form onSubmit={handleSubmit} className="card p-6 sm:p-8">
              <h2 className="font-display text-lg font-bold text-slate-900">
                {lang === 'id' ? '1. Pilih Kategori' : '1. Select Category'}
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`flex items-center gap-3 rounded-lg border-2 px-4 py-3 transition ${
                      category === cat.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-slate-200 bg-white hover:border-primary-300'
                    }`}
                  >
                    <cat.icon className="h-5 w-5" />
                    <div className="text-left">
                      <p className="text-sm font-semibold text-slate-900">{cat.label}</p>
                    </div>
                  </button>
                ))}
              </div>

              <h2 className="mt-8 font-display text-lg font-bold text-slate-900">
                {lang === 'id' ? '2. Detail Pekerjaan' : '2. Job Details'}
              </h2>
              <div className="mt-4 space-y-4">
                <div>
                  <label className="label">
                    {lang === 'id' ? 'Jenis Pekerjaan' : 'Job Type'}
                  </label>
                  {jobPrices.length === 0 ? (
                    <p className="text-xs text-slate-400">
                      {lang === 'id' ? 'Belum ada jenis pekerjaan.' : 'No job types available.'}
                    </p>
                  ) : (
                    <select
                      value={selectedJobPriceId || ''}
                      onChange={(e) => setSelectedJobPriceId(e.target.value || null)}
                      className="input"
                    >
                      <option value="">
                        {lang === 'id' ? 'Pilih jenis...' : 'Select type...'}
                      </option>
                      {jobPrices.map((jp) => (
                        <option key={jp.id} value={jp.id}>
                          {jp.job_name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {selectedJobPrice && (
                  <div className="rounded-xl border border-primary-100 bg-primary-50/70 p-4">
                    <div className="flex items-start gap-3">
                      <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-primary-600" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">
                          {lang === 'id' ? 'Ketentuan Deal' : 'Deal Terms'}
                        </p>
                        <div className="mt-2 grid gap-2 sm:grid-cols-2">
                          <div>
                            <p className="text-xs text-slate-500">{lang === 'id' ? 'Durasi' : 'Duration'}</p>
                            <p className="font-display text-base font-bold text-slate-900">
                              {formatDuration(selectedJobPrice.duration_minutes, lang)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">{lang === 'id' ? 'Tarif lembur' : 'Overtime rate'}</p>
                            <p className="font-display text-base font-bold text-slate-900">
                              {selectedJobPrice.overtime_rate_per_minute && selectedJobPrice.overtime_rate_per_minute > 0
                                ? `${formatIDR(selectedJobPrice.overtime_rate_per_minute)}/${lang === 'id' ? 'menit' : 'min'}`
                                : lang === 'id' ? 'Belum dikonfigurasi' : 'Not configured'}
                            </p>
                          </div>
                        </div>
                        <p className="mt-3 text-xs leading-5 text-slate-600">
                          {lang === 'id'
                            ? 'Jika selesai sebelum durasi berakhir, deal tetap dibayar sesuai upah pokok. Jika dilanjutkan melewati durasi, lembur mulai dihitung per menit setelah waktu deal berakhir.'
                            : 'If finished before the deal duration ends, the base wage remains payable. If continued past the duration, overtime starts counting per minute after the deal ends.'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="label">{lang === 'id' ? 'Detail (opsional)' : 'Details (optional)'}</label>
                  <textarea
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    rows={3}
                    placeholder={selectedCat?.examples[0] || ''}
                    className="input"
                  />
                </div>

                <div>
                  <label className="label">{lang === 'id' ? 'Lokasi Pengerjaan' : 'Job Location'}</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder={lang === 'id' ? 'Contoh: Jl. Sudirman, Jakarta' : 'e.g. Jl. Sudirman, Jakarta'}
                      className="input pl-10"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setNightShift(!nightShift)}
                    className={`flex-1 rounded-lg border-2 px-4 py-2.5 text-sm font-semibold ${
                      nightShift ? 'border-primary-500 bg-primary-50' : 'border-slate-200 bg-white'
                    }`}
                  >
                    {lang === 'id' ? '🌙 Shift Malam (mulai 21:00)' : '🌙 Night Shift (starts 21:00)'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setNeedsTools(!needsTools)}
                    className={`flex-1 rounded-lg border-2 px-4 py-2.5 text-sm font-semibold ${
                      needsTools ? 'border-primary-500 bg-primary-50' : 'border-slate-200 bg-white'
                    }`}
                    aria-pressed={needsTools}
                  >
                    {lang === 'id' ? '🔧 Saran: Bawa Alat' : '🔧 Suggest: Bring Tools'}
                  </button>
                </div>
                <p className="text-xs leading-5 text-slate-500">
                  {lang === 'id'
                    ? 'Saran alat kerja hanya informasi dari employer. Tidak wajib, tidak memblokir pekerja, dan tidak menambah biaya.'
                    : 'The tool option is employer information only. It is never required, never blocks workers, and adds no charge.'}
                </p>

                <div>
                  <label className="label">
                    {lang === 'id' ? `Upah (min ${formatIDR(floorPrice)})` : `Wage (min ${formatIDR(floorPrice)})`}
                  </label>
                  <div className="relative">
                    <Wallet className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={wage ? `Rp ${parseInt(wage.replace(/[^0-9]/g, ''), 10).toLocaleString('id-ID')}` : ''}
                      onChange={(e) => setWage(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder={`Rp ${formatIDR(floorPrice)}`}
                      className="input pl-10"
                    />
                  </div>
                </div>
              </div>

              <h2 className="mt-8 font-display text-lg font-bold text-slate-900">
                {lang === 'id' ? '3. Ringkasan Biaya' : '3. Price Summary'}
              </h2>
              <div className="mt-4 rounded-xl bg-slate-50 p-5 ring-1 ring-slate-200">
                <SummaryRow label={lang === 'id' ? 'Durasi Deal' : 'Deal Duration'} value={formatDuration(selectedJobPrice?.duration_minutes ?? null, lang)} />
                <SummaryRow label={lang === 'id' ? 'Upah Pokok' : 'Base Wage'} value={formatIDR(baseWage)} />
                {nightShift && (
                  <SummaryRow
                    label={lang === 'id' ? 'Shift Malam (+20%)' : 'Night Shift (+20%)'}
                    value={formatIDR(nightShiftAdd)}
                  />
                )}
                <SummaryRow
                  label={lang === 'id' ? 'Biaya Platform & Asuransi' : 'Fee & Insurance'}
                  value={formatIDR(platformFee + insurance.microInsurance)}
                  muted
                />
                <div className="my-3 border-t border-dashed border-slate-300" />
                <div className="flex justify-between">
                  <span className="font-display font-bold">{lang === 'id' ? 'Total' : 'Total'}</span>
                  <span className="font-display text-xl font-extrabold text-primary-700">
                    {formatIDR(totalPrice)}
                  </span>
                </div>
              </div>

              {error && (
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-error-50 px-4 py-3 text-sm font-semibold text-error-700">
                  <Info className="h-4 w-4" />
                  {error}
                </div>
              )}
              {success && (
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-success-50 px-4 py-3 text-sm font-semibold text-success-700">
                  <CheckCircle2 className="h-4 w-4" />
                  {lang === 'id'
                    ? 'Pesanan berhasil dipublikasikan! Pekerja akan segera menghubungi Anda.'
                    : 'Job published successfully! Workers will contact you soon.'}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || authLoading}
                className="btn-primary mt-6 flex w-full items-center justify-center gap-2"
              >
                {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                {submitting
                  ? lang === 'id' ? 'Mempublikasikan...' : 'Publishing...'
                  : lang === 'id' ? 'Publikasikan Pesanan' : 'Publish Job'}
              </button>
            </form>
          </div>

          <div className="lg:col-span-2">
            <div className="card p-6 sm:p-8">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-bold text-slate-900">
                  {lang === 'id' ? 'Pesanan Saya' : 'My Orders'}
                </h2>
                {loadingOrders && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
              </div>
              <div className="mt-4 space-y-3">
                {!user ? (
                  <p className="text-sm text-slate-500">
                    {lang === 'id' ? 'Login untuk melihat pesanan Anda.' : 'Sign in to view your orders.'}
                  </p>
                ) : orders.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    {lang === 'id' ? 'Belum ada pesanan.' : 'No orders yet.'}
                  </p>
                ) : (
                  orders.map((order) => (
                    <div key={order.id} className="rounded-xl border border-slate-200 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900">
                            {order.job_prices?.job_name || 'Pekerjaan'}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">{timeAgo(order.created_at, lang)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDelete(order.id)}
                          className="rounded-lg p-2 text-slate-400 hover:bg-error-50 hover:text-error-600"
                          aria-label={lang === 'id' ? 'Hapus pesanan' : 'Delete order'}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-sm">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">
                          {order.status}
                        </span>
                        <span className="font-bold text-primary-700">{formatIDR(order.total_price)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5 text-sm">
      <span className={muted ? 'text-slate-500' : 'text-slate-700'}>{label}</span>
      <span className={muted ? 'font-medium text-slate-600' : 'font-semibold text-slate-900'}>{value}</span>
    </div>
  );
}
