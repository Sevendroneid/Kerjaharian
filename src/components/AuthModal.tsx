import { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Step = 'phone' | 'otp' | 'profile';

function formatPhone(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  if (digits.startsWith('62')) return digits;
  return `62${digits}`;
}

export function AuthModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'mitra' | 'employer'>('employer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const handleSendOtp = async () => {
    if (!phone || phone.length < 9) return setError('Nomor WhatsApp tidak valid');
    setLoading(true);
    setError('');

    try {
      const cleanPhone = formatPhone(phone);
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-otp-fonnte`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal kirim OTP');

      // ✅ HAPUS: debug_otp tidak lagi dikirim dari Edge Function
      // setGeneratedOtp(data.debug_otp);  // BARIS INI DIHAPUS
      setStep('otp');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setLoading(true);
    setError('');
    const cleanPhone = formatPhone(phone);
    // ✅ DIUBAH: dari @kerjaharian.internal menjadi @kerjaharian.app
    const dummyEmail = `${cleanPhone}@kerjaharian.app`;
    const dummyPassword = `Pwd_${cleanPhone}_2026!`;

    try {
      // ===== TAMBAHAN BARU: VERIFIKASI OTP KE DATABASE =====
      const verifyResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-otp-fonnte`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: cleanPhone, code: otp }),
        }
      );
      const verifyData = await verifyResponse.json();

      // JIKA OTP TIDAK VALID → STOP DI SINI
      if (!verifyData.valid) {
        setError('Kode OTP salah atau kadaluarsa');
        setLoading(false);
        return; // LANGSUNG BERHENTI, TIDAK LANJUT LOGIN
      }

      // ===== PROSES LOGIN / DAFTAR =====
      let { error: authError } = await supabase.auth.signInWithPassword({
        email: dummyEmail,
        password: dummyPassword,
      });

      if (authError) {
        const { error: signUpError } = await supabase.auth.signUp({
          email: dummyEmail,
          password: dummyPassword,
        });
        if (signUpError) throw signUpError;
        
        await supabase.auth.signInWithPassword({
          email: dummyEmail,
          password: dummyPassword,
        });
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Autentikasi gagal');

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile) {
        setStep('profile');
      } else {
        onClose();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteProfile = async () => {
    setLoading(true);
    setError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Sesi habis');

      const cleanPhone = formatPhone(phone);
      // ✅ DIUBAH: HAPUS role admin otomatis
      // const finalRole = cleanPhone === '6282340871029' ? 'admin' : role;
      const finalRole = role; // SEMUA USER ROLE NYA SESUAI PILIHAN

      const { error: profileError } = await supabase.from('profiles').insert({
        id: user.id,
        full_name: fullName,
        role: finalRole,
        phone: `+${cleanPhone}`,
      });

      if (profileError) throw profileError;
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm relative shadow-xl">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-black"><X size={20} /></button>

        {step === 'phone' && (
          <>
            <h2 className="text-xl font-bold mb-1">Masuk KerjaHarian</h2>
            <p className="text-sm text-gray-500 mb-4">Masuk atau daftar instan via WhatsApp</p>
            <label className="text-xs font-semibold text-gray-600">Nomor WhatsApp</label>
            {/* ✅ DIUBAH: placeholder dari 082340871029 menjadi 08xxxxxxxxxx */}
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08xxxxxxxxxx"
              className="w-full border rounded-lg px-3 py-2 mt-1 mb-4 text-sm focus:outline-blue-600" />
            {error && <p className="text-red-500 text-xs mb-3">{error}</p>}
            <button onClick={handleSendOtp} disabled={loading} className="w-full bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700">
              {loading ? 'Mengirim OTP...' : 'Kirim Kode via WhatsApp'}
            </button>
          </>
        )}

        {step === 'otp' && (
          <>
            <h2 className="text-xl font-bold mb-1">Verifikasi Kode</h2>
            <p className="text-sm text-gray-500 mb-4">Masukkan 6 digit kode yang dikirim ke WA {phone}</p>
            <input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="123456" maxLength={6}
              className="w-full border rounded-lg px-3 py-2 mb-4 text-center text-lg tracking-widest font-mono" />
            {error && <p className="text-red-500 text-xs mb-3">{error}</p>}
            <button onClick={handleVerifyOtp} disabled={loading} className="w-full bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700">
              {loading ? 'Memverifikasi...' : 'Konfirmasi Kode'}
            </button>
          </>
        )}

        {step === 'profile' && (
          <>
            <h2 className="text-xl font-bold mb-1">Lengkapi Profil</h2>
            <p className="text-sm text-gray-500 mb-4">Satu langkah lagi untuk mulai</p>
            <label className="text-xs font-semibold text-gray-600">Nama Lengkap</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nama kamu"
              className="w-full border rounded-lg px-3 py-2 mt-1 mb-4 text-sm focus:outline-blue-600" />
            <label className="text-xs font-semibold text-gray-600">Daftar sebagai</label>
            <div className="flex gap-2 mt-1 mb-4">
              <button onClick={() => setRole('employer')} type="button"
                className={`flex-1 py-2 rounded-lg border text-sm font-medium ${role === 'employer' ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50'}`}>Employer</button>
              <button onClick={() => setRole('mitra')} type="button"
                className={`flex-1 py-2 rounded-lg border text-sm font-medium ${role === 'mitra' ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50'}`}>Mitra Pekerja</button>
            </div>
            {error && <p className="text-red-500 text-xs mb-3">{error}</p>}
            <button onClick={handleCompleteProfile} disabled={loading || !fullName} className="w-full bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700">
              {loading ? 'Menyimpan...' : 'Selesai & Masuk'}
            </button>
          </>
        )}
      </div>
    </div>
  );
            }
