import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, Briefcase, CheckCircle2, Clock3, ShieldCheck, Wallet } from 'lucide-react';
import { Employer } from '@/components/Employer';
import { CATEGORIES } from '@/lib/data';
import { formatIDR } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { CategoryId } from '@/lib/types';
import type { I18n } from '@/lib/i18n';

interface EmployerEntryProps {
  onAuthClick: (mode: 'signin' | 'signup') => void;
  initialCategory?: CategoryId | null;
  lang: 'id' | 'en';
  i18n: I18n;
}

interface WalletState { available_balance: number; reserved_balance: number; total_balance: number }
interface OrderItem { id: string; status: string; total_price: number; created_at: string; title?: string | null }

const activeStatuses = ['open', 'assigned', 'accepted', 'in_progress', 'working'];

export function EmployerEntry({ onAuthClick, initialCategory, lang, i18n }: EmployerEntryProps) {
  const { user, profile } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | null>(initialCategory ?? null);
  const [showOrderForm, setShowOrderForm] = useState(Boolean(initialCategory));
  const [wallet, setWallet] = useState<WalletState | null>(null);
  const [orders, setOrders] = useState<OrderItem[]>([]);

  const loadDashboard = useCallback(async () => {
    if (!user || profile?.role !== 'employer') return;
    const [{ data: walletData }, { data: orderData }] = await Promise.all([
      supabase.rpc('get_employer_wallet'),
      supabase.from('orders').select('id,status,total_price,created_at,title').eq('employer_id', user.id).order('created_at', { ascending: false }).limit(5),
    ]);
    if (walletData?.[0]) setWallet(walletData[0] as WalletState);
    if (orderData) setOrders(orderData as OrderItem[]);
  }, [user, profile?.role]);

  useEffect(() => { void loadDashboard(); }, [loadDashboard]);
  useEffect(() => {
    if (initialCategory) {
      setSelectedCategory(initialCategory);
      setShowOrderForm(true);
    }
  }, [initialCategory]);

  if (showOrderForm) {
    return <Employer onAuthClick={onAuthClick} initialCategory={selectedCategory} lang={lang} i18n={i18n} />;
  }

  const verified = profile?.kyc_verified;
  const activeOrders = orders.filter(order => activeStatuses.includes(order.status));

  const chooseCategory = (category: CategoryId) => {
    setSelectedCategory(category);
    setShowOrderForm(true);
  };

  return <div className="bg-slate-50 pb-20 pt-6 sm:pt-8">
    <div className="container-app">
      <div className="mx-auto max-w-5xl">
        <div className="mb-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-7">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
            <Briefcase className="h-3.5 w-3.5" /> {lang === 'id' ? 'Pemesan' : 'Customer'}
          </div>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            {lang === 'id' ? 'Butuh pekerja untuk apa hari ini?' : 'What do you need a worker for today?'}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
            {lang === 'id'
              ? 'Pilih kebutuhan Anda. KerjaHarian akan membantu mencari pekerja yang tersedia di sekitar lokasi pekerjaan.'
              : 'Choose what you need. KerjaHarian helps find available workers around the job location.'}
          </p>
        </div>

        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          <div className="card flex items-center gap-3 p-4">
            <div className="rounded-xl bg-primary-50 p-2"><Wallet className="h-5 w-5 text-primary-600" /></div>
            <div><p className="text-xs font-bold uppercase text-slate-500">{lang === 'id' ? 'Saldo tersedia' : 'Available balance'}</p><p className="font-extrabold text-slate-900">{formatIDR(wallet?.available_balance ?? 0)}</p></div>
          </div>
          <div className="card flex items-center gap-3 p-4">
            <div className="rounded-xl bg-primary-50 p-2"><ShieldCheck className="h-5 w-5 text-primary-600" /></div>
            <div><p className="text-xs font-bold uppercase text-slate-500">KYC</p><p className="font-extrabold text-slate-900">{verified ? (lang === 'id' ? 'Terverifikasi' : 'Verified') : (lang === 'id' ? 'Belum terverifikasi' : 'Not verified')}</p></div>
          </div>
          <div className="card flex items-center gap-3 p-4">
            <div className="rounded-xl bg-primary-50 p-2"><Clock3 className="h-5 w-5 text-primary-600" /></div>
            <div><p className="text-xs font-bold uppercase text-slate-500">{lang === 'id' ? 'Sedang berjalan' : 'In progress'}</p><p className="font-extrabold text-slate-900">{activeOrders.length} {lang === 'id' ? 'pekerjaan' : 'jobs'}</p></div>
          </div>
        </div>

        <section aria-labelledby="job-needs-heading">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h2 id="job-needs-heading" className="text-xl font-extrabold text-slate-900">{lang === 'id' ? 'Pilih kebutuhan' : 'Choose a need'}</h2>
              <p className="mt-1 text-sm text-slate-500">{lang === 'id' ? 'Tidak perlu top-up untuk masuk. Top-up hanya muncul saat saldo kurang dari total pekerjaan.' : 'No top-up is needed to enter. Top-up appears only when your balance is below the job total.'}</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {CATEGORIES.map(category => {
              const Icon = category.icon;
              return <button
                key={category.id}
                type="button"
                onClick={() => chooseCategory(category.id)}
                className="group rounded-2xl border-2 border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary-400 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="rounded-xl bg-primary-50 p-3"><Icon className="h-6 w-6 text-primary-600" /></div>
                  <ArrowRight className="mt-2 h-5 w-5 text-slate-300 transition group-hover:translate-x-1 group-hover:text-primary-500" />
                </div>
                <h3 className="mt-4 font-extrabold text-slate-900">{category.label}</h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">{category.examples?.[0] ?? (lang === 'id' ? 'Pilih pekerjaan yang Anda butuhkan.' : 'Choose the job you need.')}</p>
              </button>;
            })}
          </div>
        </section>

        {activeOrders.length > 0 && <section className="mt-7 card p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div><h2 className="font-extrabold text-slate-900">{lang === 'id' ? 'Pekerjaan yang sedang berjalan' : 'Jobs in progress'}</h2><p className="mt-1 text-xs text-slate-500">{lang === 'id' ? 'Pantau status pekerjaan Anda.' : 'Track your active jobs.'}</p></div>
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          </div>
          <div className="mt-4 space-y-3">
            {activeOrders.map(order => <div key={order.id} className="flex items-center justify-between rounded-xl border bg-white p-4">
              <div><p className="font-semibold text-slate-900">{order.title || (lang === 'id' ? 'Pekerjaan' : 'Job')}</p><p className="text-xs text-slate-500">{order.status}</p></div>
              <p className="text-sm font-extrabold text-slate-900">{formatIDR(order.total_price)}</p>
            </div>)}
          </div>
        </section>}
      </div>
    </div>
  </div>;
}
