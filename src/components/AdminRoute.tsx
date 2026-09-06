import { ReactNode } from 'react';
import { useAuth } from '@/lib/auth';

export default function AdminRoute({ children }: { children: ReactNode }) {
  const { user, profile, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-slate-50 grid place-items-center text-sm font-semibold text-slate-600">Memverifikasi sesi Admin...</div>;
  if (!user || profile?.role !== 'admin') return <div className="min-h-screen bg-slate-50 grid place-items-center p-6"><div className="max-w-md rounded-2xl bg-white p-6 text-center ring-1 ring-slate-200"><h1 className="text-lg font-extrabold">Akses Admin ditolak</h1><p className="mt-2 text-sm text-slate-500">Login Admin diperlukan untuk membuka Control Center.</p></div></div>;
  return <>{children}</>;
}
