import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, Briefcase, CheckCircle2, Clock3, PlusCircle, ShieldCheck, Wallet } from 'lucide-react';
import { Employer } from '@/components/Employer';
import { CATEGORIES } from '@/lib/data';
import { formatIDR } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { CategoryId } from '@/lib/types';
import type { I18n } from '@/lib/i18n';
interface EmployerEntryProps { onAuthClick:(mode:'signin'|'signup')=>void; initialCategory?:CategoryId|null; lang:'id'|'en'; i18n:I18n }
interface WalletState { available_balance:number; reserved_balance:number; total_balance:number }
interface OrderItem { id:string; status:string; total_price:number; created_at:string; title?:string|null }
const activeStatuses=['open','assigned','accepted','in_progress','working'];

export function EmployerEntry({onAuthClick,initialCategory,lang,i18n:_i18n}:EmployerEntryProps){
 const {user,profile}=useAuth();
 const [selectedCategory,setSelectedCategory]=useState<CategoryId|null>(initialCategory??null);
 const [showOrderForm,setShowOrderForm]=useState(false);
 const [openTopup,setOpenTopup]=useState(false);
 const [wallet,setWallet]=useState<WalletState|null>(null);
 const [orders,setOrders]=useState<OrderItem[]>([]);
 const loadDashboard=useCallback(async()=>{
  if(!user||profile?.role!=='employer')return;
  const [{data:walletData},{data:orderData}]=await Promise.all([
   supabase.rpc('get_employer_wallet'),
   supabase.from('orders').select('id,status,total_price,created_at,title').eq('employer_id',user.id).order('created_at',{ascending:false}).limit(10)
  ]);
  if(walletData?.[0])setWallet(walletData[0] as WalletState);
  if(orderData)setOrders(orderData as OrderItem[]);
 },[user,profile?.role]);
 useEffect(()=>{void loadDashboard()},[loadDashboard]);
 useEffect(()=>{if(initialCategory)setSelectedCategory(initialCategory)},[initialCategory]);
 if(showOrderForm)return <Employer onAuthClick={onAuthClick} initialCategory={selectedCategory} initialTopupOpen={openTopup} lang={lang} i18n={_i18n}/>;
 const activeOrders=orders.filter(o=>activeStatuses.includes(o.status));
 const chooseCategory=(category:CategoryId)=>{setSelectedCategory(category);setOpenTopup(false);setShowOrderForm(true)};
 const startTopup=()=>{setOpenTopup(true);setShowOrderForm(true)};
 return <div className="bg-slate-50 pb-20 pt-6 sm:pt-8"><div className="container-app"><div className="mx-auto max-w-5xl">
  <div className="mb-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-7">
   <div className="inline-flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700"><Briefcase className="h-3.5 w-3.5"/>{lang==='id'?'Panel Employer':'Employer Panel'}</div>
   <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">{lang==='id'?'Kelola pekerjaan Anda':'Manage your jobs'}</h1>
   <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{lang==='id'?'Setelah KYC disetujui, urutan kerja Anda adalah: cek order → top up → pilih dan buat order.':'After KYC approval: check orders → top up → choose and create an order.'}</p>
  </div>
  <div className="mb-5 grid gap-3 sm:grid-cols-3">
   <div className="card flex items-center gap-3 p-4"><div className="rounded-xl bg-primary-50 p-2"><Clock3 className="h-5 w-5 text-primary-600"/></div><div><p className="text-xs font-bold uppercase text-slate-500">1. {lang==='id'?'Cek Order':'Check Orders'}</p><p className="font-extrabold text-slate-900">{activeOrders.length} {lang==='id'?'aktif':'active'}</p></div></div>
   <div className="card flex items-center gap-3 p-4"><div className="rounded-xl bg-primary-50 p-2"><Wallet className="h-5 w-5 text-primary-600"/></div><div><p className="text-xs font-bold uppercase text-slate-500">2. {lang==='id'?'Top Up':'Top Up'}</p><p className="font-extrabold text-slate-900">{formatIDR(wallet?.available_balance??0)}</p></div></div>
   <div className="card flex items-center gap-3 p-4"><div className="rounded-xl bg-primary-50 p-2"><ShieldCheck className="h-5 w-5 text-primary-600"/></div><div><p className="text-xs font-bold uppercase text-slate-500">KYC</p><p className="font-extrabold text-slate-900">{profile?.kyc_verified?(lang==='id'?'Terverifikasi':'Verified'):(lang==='id'?'Menunggu':'Pending')}</p></div></div>
  </div>
  <section className="card p-5 sm:p-6"><div className="flex items-start justify-between gap-4"><div><h2 className="font-extrabold text-slate-900">1. {lang==='id'?'Cek Order':'Check Orders'}</h2><p className="mt-1 text-sm text-slate-500">{lang==='id'?'Pantau pekerjaan yang sudah dibuat sebelum membuat order baru.':'Review existing jobs before creating a new order.'}</p></div><CheckCircle2 className="h-5 w-5 text-green-600"/></div>
   <div className="mt-4 space-y-3">{orders.length?orders.map(order=><div key={order.id} className="flex items-center justify-between rounded-xl border bg-white p-4"><div><p className="font-semibold text-slate-900">{order.title||'Pekerjaan'}</p><p className="text-xs text-slate-500">{order.status}</p></div><p className="text-sm font-extrabold text-slate-900">{formatIDR(order.total_price)}</p></div>):<p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">{lang==='id'?'Belum ada order. Anda dapat membuat order setelah tahap saldo.':'No orders yet. You can create one after the balance step.'}</p>}</div>
  </section>
  <section className="mt-4 card p-5 sm:p-6"><div className="flex items-start justify-between gap-4"><div><h2 className="font-extrabold text-slate-900">2. {lang==='id'?'Top Up':'Top Up'}</h2><p className="mt-1 text-sm text-slate-500">{lang==='id'?'Isi saldo sekarang. Pembayaran dilakukan melalui Midtrans sebelum masuk ke pemilihan order.':'Add balance now. Payment is handled by Midtrans before choosing an order.'}</p></div><Wallet className="h-5 w-5 text-primary-600"/></div><div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-4"><div><p className="text-xs font-bold uppercase text-slate-500">{lang==='id'?'Saldo tersedia':'Available balance'}</p><p className="text-2xl font-extrabold">{formatIDR(wallet?.available_balance??0)}</p></div><button type="button" onClick={startTopup} className="btn-primary flex items-center gap-2"><PlusCircle className="h-4 w-4"/>{lang==='id'?'Top Up Sekarang':'Top Up Now'}</button></div></section>
  <section className="mt-4 card p-5 sm:p-6"><h2 className="font-extrabold text-slate-900">3. {lang==='id'?'Pilih / Buat Order':'Choose / Create Order'}</h2><p className="mt-1 text-sm text-slate-500">{lang==='id'?'Setelah tahap saldo, pilih kategori pekerjaan, lihat total final, lalu buat order.':'After the balance step, choose a job category, review the final total, then create the order.'}</p><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{CATEGORIES.map(category=>{const Icon=category.icon;return <button key={category.id} type="button" onClick={()=>chooseCategory(category.id)} className="group rounded-2xl border-2 border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary-400 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"><div className="flex items-start justify-between gap-3"><div className="rounded-xl bg-primary-50 p-3"><Icon className="h-6 w-6 text-primary-600"/></div><ArrowRight className="mt-2 h-5 w-5 text-slate-300 transition group-hover:translate-x-1 group-hover:text-primary-500"/></div><h3 className="mt-4 font-extrabold text-slate-900">{category.label}</h3><p className="mt-1 text-xs leading-5 text-slate-500">{category.examples?.[0]??'Pilih pekerjaan yang Anda butuhkan.'}</p></button>})}</div></section>
 </div></div></div>;
}
