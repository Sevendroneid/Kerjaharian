import { ShieldCheck } from 'lucide-react';

interface AdminLoginProps { onClose: () => void; onSuccess: () => void; }

// TEMPORARY OWNER-ONLY INSPECTION MODE on the hidden /rahasia route.
// No OTP request is made, so inspecting the Admin panel does not consume OTP credits.
export default function AdminLogin({ onClose, onSuccess }: AdminLoginProps) {
  return <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
      <div className="flex items-center gap-3 mb-5"><div className="rounded-xl bg-slate-900 text-white p-2.5"><ShieldCheck size={22}/></div><div><h2 className="text-xl font-bold">Admin Preview</h2><p className="text-xs text-slate-500">KerjaHarian Control Center</p></div></div>
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"><b>Mode inspeksi sementara.</b><p className="mt-1 text-xs">Tidak ada OTP WhatsApp yang dikirim. Gunakan hanya untuk melihat isi panel Admin sebelum autentikasi produksi dipasang kembali.</p></div>
      <button onClick={onSuccess} className="w-full mt-4 bg-slate-900 text-white rounded-xl py-3 text-sm font-semibold">Masuk Admin Panel</button>
      <button onClick={onClose} className="w-full mt-2 text-xs text-slate-500 py-2">Kembali</button>
    </div>
  </div>;
}
