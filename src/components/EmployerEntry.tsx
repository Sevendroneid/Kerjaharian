import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, Briefcase, CheckCircle2, Clock3, ShieldCheck, Wallet } from 'lucide-react';
import { Employer } from '@/components/Employer';
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

export function EmployerEntry({ onAuthClick, initialCategory, lang, i18n }: EmployerEntryProps) {
  const { user, profile } = useAuth();
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
  useEffect(() => { if (initialCategory) setShowOrderForm(true); }, [initialCategory]);

  if (showOrderForm) {
    return <Employer onAuthClick={onAuthClick} initialCategory={initialCategory} lang={lang} i18n={i18n} />;
  }

  const verified = profile?.kyc_verified;
  const activeOrders = orders.filter(order => !['completed', 'cancelled', 'refunded', 'partial_refund'].includes(order.status));

  return <div className="bg-slate-50 pb-20 pt-8">
    <div className="container-app">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 rounded-2xl bg-white p-6 ring-1 ring-slate-200">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
            <Briefcase className="h-3.5 w-3.5" /> {lang === 'id' ? 'Mitra' : 'Employer'}
          </div>
          <h1 className="mt-3 text-3xl font-extrabold text-slate-900">
            {lang === 'id' ? 'Selamat datang di KerjaHarian' : 'Welcome to KerjaHarian'}
          </h1>
          <p className="mt-2 max-w-2xl text-slate-500">
            {lang === 'id'
              ? 'Pilih pekerjaan terlebih dahulu. Total biaya final akan terlihat sebelum Order. Anda tidak perlu top-up hanya untuk masuk atau membuat akun.'
              : 'Choose a job first. The final total is shown before Order. You do not need to top up just to sign in or create an account.'}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="card p-5">
            <Wallet className="h-5 w-5 text-primary-600" />
            <p className="mt-3 text-xs font-bold uppercase text-slate-500">{lang === 'id' ? 'Saldo tersedia' : 'Available balance'}</p>
            <p className="mt-1 text-2xl font-extrabold text-slate-900">{formatIDR(wallet?.available_balance ?? 0)}</p>
            <p className="mt-1 text-xs text-slate-500">{lang === 'id' ? 'Tidak perlu diisi sekarang.' : 'No top-up required now.'}</p>
          </div>
          <div className="card p-5">
            <ShieldCheck className="h-5 w-5 text-primary-600" />
            <p className="mt-3 text-xs font-bold uppercase text-slate-500">KYC</p>
            <p className="mt-1 text-lg font-extrabold text-slate-900">{verified ? (lang === 'id' ? 'Terverifikasi' : 'Verified') : (lang === 'id' ? 'Menunggu verifikasi' : 'Verification required')}</p>
            <p className="mt-1 text-xs text-slate-500">{verified ? (lang === 'id' ? 'Siap memilih pekerjaan.' : 'Ready to choose a job.') : (lang === 'id' ? 'KTP + selfie harus disetujui admin sebelum Order.' : 'KTP + selfie must be approved before Order.')}</p>
          </div>
          <div className="card p-5">
            <Clock3 className="h-5 w-5 text-primary-600" />
            <p className="mt-3 text-xs font-bold uppercase text-slate-500">{lang === 'id' ? 'Pekerjaan aktif' : 'Active jobs'}</p>
            <p className="mt-1 text-2xl font-extrabold text-slate-900">{activeOrders.length}</p>
            <p className="mt-1 text-xs text-slate-500">{lang === 'id' ? 'Order yang sedang berjalan.' : 'Orders currently in progress.'}</p>
          </div>
        </div>

        <div className="mt-6 card p-6">
          <h2 className="text-xl font-extrabold text-slate-900">{lang === 'id' ? 'Belum ada yang perlu dibayar' : 'Nothing to pay yet'}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {lang === 'id'
              ? 'Saat Anda memilih jenis pekerjaan, KerjaHarian akan menghitung total final. Jika saldo belum cukup, barulah pilihan Top Up ditawarkan sebesar kekurangannya. Dana baru dikunci setelah Order berhasil dibuat.'
              : 'After you choose a job, KerjaHarian calculates the final total. If the balance is insufficient, Top Up is offered only for the shortfall. Funds are reserved only after the Order is created successfully.'}
          </p>
          <button type="button" onClick={() => setShowOrderForm(true)} className="btn-primary mt-5 inline-flex items-center gap-2">
            {lang === 'id' ? 'Mulai pilih pekerjaan' : 'Choose a job'}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        {activeOrders.length > 0 && <div className="mt-6 card p-6">
          <h2 className="font-bold">{lang === 'id' ? 'Pesanan terbaru' : 'Recent orders'}</h2>
          <div className="mt-4 space-y-3">
            {activeOrders.map(order => <div key={order.id} className="flex items-center justify-between rounded-xl border p-4">
              <div><p className="font-semibold text-slate-900">{order.title || (lang === 'id' ? 'Pekerjaan' : 'Job')}</p><p className="text-xs text-slate-500">{order.status}</p></div>
              <div className="flex items-center gap-2 text-sm font-bold"><CheckCircle2 className="h-4 w-4 text-green-600" />{formatIDR(order.total_price)}</div>
            </div>)}
          </div>
        </div>}
      </div>
    </div>
  </div>;
}
