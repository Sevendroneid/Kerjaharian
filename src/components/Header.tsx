/* eslint-disable @typescript-eslint/no-unused-expressions */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Menu, X, LogOut, Loader2, MessageCircle, Wallet, ArrowDownToLine, AlertTriangle } from 'lucide-react';
import { Logo } from './Logo';
import { useAuth } from '@/lib/auth';
import { useSiteContent } from '@/lib/siteContent';
import { supabase } from '@/lib/supabase';
import type { View } from '@/lib/types';
import { formatIDR } from '@/lib/format';

interface HeaderProps { view: View; onNavigate: (view: View) => void; onAuthClick: (mode: 'signin'|'signup') => void; lang: 'id'|'en'; onLangChange: (lang:'id'|'en')=>void; }
const NAV_ITEMS_ID:[{id:View;label:string},{id:View;label:string},{id:View;label:string}]=[{id:'landing',label:'Beranda'},{id:'employer',label:'Pesan Tenaga Kerja'},{id:'worker',label:'Mitra Pekerja'}];
const NAV_ITEMS_EN:[{id:View;label:string},{id:View;label:string},{id:View;label:string}]=[{id:'landing',label:'Home'},{id:'employer',label:'Hire Workers'},{id:'worker',label:'Worker Network'}];

type Earnings = { available:number; pending:number; reserved:number; paid:number };

export function Header({view,onNavigate,onAuthClick,lang,onLangChange}:HeaderProps){
  const {user,profile,loading,signOut}=useAuth();
  const text=useSiteContent(lang);
  const [scrolled,setScrolled]=useState(false);
  const [mobileOpen,setMobileOpen]=useState(false);
  const [earnings,setEarnings]=useState<Earnings|null>(null);
  const [withdrawOpen,setWithdrawOpen]=useState(false);
  const [withdrawAmount,setWithdrawAmount]=useState('');
  const [withdrawMethod,setWithdrawMethod]=useState('bank_transfer');
  const [destinationName,setDestinationName]=useState('');
  const [destinationAccount,setDestinationAccount]=useState('');
  const [withdrawBusy,setWithdrawBusy]=useState(false);
  const [withdrawError,setWithdrawError]=useState('');
  const [withdrawSuccess,setWithdrawSuccess]=useState('');
  const navItems=useMemo(()=>lang==='id'?NAV_ITEMS_ID:NAV_ITEMS_EN,[lang]);
  useEffect(()=>{const f=()=>setScrolled(window.scrollY>8);f();window.addEventListener('scroll',f,{passive:true});return()=>window.removeEventListener('scroll',f)},[]);
  const go=useCallback((v:View)=>{onNavigate(v);setMobileOpen(false)},[onNavigate]);
  const wa=text('contact.whatsapp','6288289767019');

  const loadEarnings=useCallback(async()=>{
    if(!user || profile?.role!=='worker'){setEarnings(null);return;}
    const {data,error}=await supabase.rpc('get_worker_earnings');
    if(!error && data?.[0]) setEarnings(data[0] as Earnings);
  },[user,profile?.role]);
  useEffect(()=>{void loadEarnings()},[loadEarnings]);

  const submitWithdrawal=async()=>{
    setWithdrawError('');setWithdrawSuccess('');
    const amount=Number(withdrawAmount.replace(/[^0-9]/g,''));
    if(!Number.isInteger(amount)||amount<=0){setWithdrawError(lang==='id'?'Nominal penarikan tidak valid.':'Invalid withdrawal amount.');return;}
    if(earnings && amount>earnings.available){setWithdrawError(lang==='id'?'Saldo yang dapat ditarik tidak mencukupi.':'Insufficient available balance.');return;}
    setWithdrawBusy(true);
    const {error}=await supabase.rpc('request_worker_withdrawal',{p_amount:amount,p_payout_method:withdrawMethod,p_destination_name:destinationName,p_destination_account:destinationAccount});
    if(error){setWithdrawError(error.message)}else{setWithdrawSuccess(lang==='id'?'Permintaan pencairan berhasil dibuat.':'Withdrawal request created.');setWithdrawAmount('');setDestinationName('');setDestinationAccount('');await loadEarnings();}
    setWithdrawBusy(false);
  };

  return <header className={`sticky top-0 z-50 transition-all duration-300 ${scrolled?'bg-white/85 backdrop-blur-xl shadow-soft ring-1 ring-slate-200/60':'bg-transparent'}`}><div className="container-app"><div className="flex h-16 items-center justify-between">
    <button onClick={()=>go('landing')} className="flex items-center gap-2 transition hover:opacity-80"><Logo/><span className="hidden rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-800 sm:inline-block">{text('site.badge','KerjaHarian')}</span></button>
    <nav className="hidden items-center gap-1 md:flex">{navItems.map(item=><button key={item.id} onClick={()=>go(item.id)} className={`rounded-lg px-3.5 py-2 text-sm font-semibold ${view===item.id?'bg-primary-50 text-primary-700':'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>{text(item.id==='landing'?'nav.home':item.id==='employer'?'nav.employer':'nav.worker',item.label)}</button>)}</nav>
    <div className="hidden items-center gap-2 md:flex">
      {user&&profile?.role==='worker'&&earnings&&<div className="flex items-center gap-2 rounded-lg bg-accent-50 px-2.5 py-1.5 ring-1 ring-accent-200"><Wallet className="h-4 w-4 text-accent-700"/><div className="leading-tight"><p className="text-[10px] font-semibold uppercase tracking-wide text-accent-700">{lang==='id'?'Penghasilan':'Earnings'}</p><p className="text-xs font-extrabold text-slate-900">{formatIDR(earnings.available)}</p></div><button onClick={()=>{setWithdrawError('');setWithdrawSuccess('');setWithdrawOpen(true)}} className="ml-1 rounded-md bg-accent-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-accent-700">{lang==='id'?'Tarik':'Withdraw'}</button></div>}
      <button onClick={()=>onLangChange(lang==='id'?'en':'id')} className="rounded-lg border bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700">{lang==='id'?'🇮🇩 ID':'🇬🇧 EN'}</button>
      <a href={`https://wa.me/${wa.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white"><MessageCircle className="h-3.5 w-3.5"/>{text('nav.cs',lang==='id'?'CS WA':'CS Chat')}</a>
      {loading?<Loader2 className="h-5 w-5 animate-spin text-slate-400"/>:user?<div className="ml-2 flex items-center gap-2"><div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2"><div className="grid h-7 w-7 place-items-center rounded-full bg-primary-600 text-xs font-bold text-white">{profile?.full_name?.charAt(0).toUpperCase()??'U'}</div><span className="text-sm font-semibold text-slate-700">{profile?.full_name?.split(' ')[0]??'Pengguna'}</span></div><button onClick={signOut} className="grid h-10 w-10 place-items-center rounded-lg text-slate-500 ring-1 ring-slate-200 hover:bg-error-50 hover:text-error-500" aria-label="Logout"><LogOut className="h-4 w-4"/></button></div>:<div className="ml-2 flex gap-2"><button onClick={()=>onAuthClick('signin')} className="btn-ghost text-sm">{lang==='id'?'Masuk':'Sign In'}</button><button onClick={()=>onAuthClick('signup')} className="btn-primary text-sm">{lang==='id'?'Daftar':'Sign Up'}</button></div>}
    </div>
    <button onClick={()=>setMobileOpen(o=>!o)} className="grid h-10 w-10 place-items-center rounded-lg text-slate-700 ring-1 ring-slate-200 md:hidden">{mobileOpen?<X className="h-5 w-5"/>:<Menu className="h-5 w-5"/>}</button>
  </div>
  {mobileOpen&&<div className="space-y-2 border-t border-slate-200 py-3 md:hidden"><nav className="flex flex-col gap-1">{navItems.map(item=><button key={item.id} onClick={()=>go(item.id)} className="rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-slate-600 hover:bg-slate-100">{text(item.id==='landing'?'nav.home':item.id==='employer'?'nav.employer':'nav.worker',item.label)}</button>)}</nav>{user&&profile?.role==='worker'&&earnings&&<div className="rounded-xl bg-accent-50 p-3 ring-1 ring-accent-200"><div className="flex items-center justify-between"><div><p className="text-[10px] font-semibold uppercase text-accent-700">{lang==='id'?'Penghasilan tersedia':'Available earnings'}</p><p className="text-lg font-extrabold text-slate-900">{formatIDR(earnings.available)}</p></div><button onClick={()=>setWithdrawOpen(true)} className="btn-primary text-xs"><ArrowDownToLine className="h-4 w-4"/>{lang==='id'?'Tarik':'Withdraw'}</button></div></div>}<div className="border-t border-slate-100 pt-2"><a href={`https://wa.me/${wa.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer" className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-green-600 py-2 text-xs font-semibold text-white"><MessageCircle className="h-3.5 w-3.5"/>{text('nav.cs',lang==='id'?'CS':'Chat')}</a></div>{user&&<button onClick={signOut} className="btn-ghost w-full justify-center text-error-600"><LogOut className="h-4 w-4"/>Logout</button>}</div>}
  </div></header>
  {withdrawOpen&&<div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/50 p-4" onClick={()=>!withdrawBusy&&setWithdrawOpen(false)}><div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl" onClick={e=>e.stopPropagation()}><div className="flex items-start justify-between gap-3"><div><h2 className="font-display text-lg font-extrabold text-slate-900">{lang==='id'?'Tarik Penghasilan':'Withdraw Earnings'}</h2><p className="mt-1 text-xs text-slate-500">{lang==='id'?'Tersedia':'Available'}: <strong>{formatIDR(earnings?.available??0)}</strong></p></div><button onClick={()=>!withdrawBusy&&setWithdrawOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5"/></button></div>{withdrawError&&<div className="mt-4 flex gap-2 rounded-lg bg-error-50 p-3 text-xs font-semibold text-error-700"><AlertTriangle className="h-4 w-4 shrink-0"/>{withdrawError}</div>}{withdrawSuccess&&<div className="mt-4 rounded-lg bg-success-50 p-3 text-xs font-semibold text-success-700">{withdrawSuccess}</div>}<div className="mt-4 space-y-3"><div><label className="label">{lang==='id'?'Nominal':'Amount'}</label><input className="input" inputMode="numeric" value={withdrawAmount} onChange={e=>setWithdrawAmount(e.target.value)} placeholder="100000"/></div><div><label className="label">{lang==='id'?'Metode pencairan':'Payout method'}</label><select className="input" value={withdrawMethod} onChange={e=>setWithdrawMethod(e.target.value)}><option value="bank_transfer">Bank Transfer</option><option value="ewallet">E-Wallet</option><option value="cash">Cash</option></select></div><div><label className="label">{lang==='id'?'Nama penerima':'Recipient name'}</label><input className="input" value={destinationName} onChange={e=>setDestinationName(e.target.value)} /></div><div><label className="label">{lang==='id'?'Nomor rekening / tujuan':'Account / destination'}</label><input className="input" value={destinationAccount} onChange={e=>setDestinationAccount(e.target.value)} /></div><button disabled={withdrawBusy} onClick={submitWithdrawal} className="btn-primary w-full">{withdrawBusy?<Loader2 className="h-4 w-4 animate-spin"/>:<ArrowDownToLine className="h-4 w-4"/>}{withdrawBusy?(lang==='id'?'Memproses…':'Processing…'):(lang==='id'?'Ajukan Pencairan':'Request Withdrawal')}</button></div></div></div>}
}
