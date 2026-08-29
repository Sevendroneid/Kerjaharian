import { useState } from 'react';
import { X, Mail, Lock, User, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  mode: 'signin' | 'signup';
  onModeChange: (mode: 'signin' | 'signup') => void;
}

export function AuthModal({ open, mode, onClose, onModeChange }: AuthModalProps) {
  const { signIn, signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (mode === 'signup') {
      if (!fullName.trim()) {
        setError('Nama lengkap wajib diisi.');
        setLoading(false);
        return;
      }
      if (password.length < 6) {
        setError('Kata sandi minimal 6 karakter.');
        setLoading(false);
        return;
      }
      const { error } = await signUp(email.trim(), password, fullName.trim());
      if (error) setError(error);
    } else {
      const { error } = await signIn(email.trim(), password);
      if (error) setError(error);
    }
    setLoading(false);
  };

  const switchMode = (m: 'signin' | 'signup') => {
    setError('');
    onModeChange(m);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-pop animate-fade-up sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-slate-900">
            {mode === 'signin' ? 'Masuk' : 'Daftar Akun'}
          </h2>
          <button onClick={onClose} className="text-slate-400 transition hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-1.5 text-sm text-slate-500">
          {mode === 'signin'
            ? 'Masuk untuk mulai memesan atau menerima pekerjaan.'
            : 'Buat akun untuk bergabung dengan KerjaHarian.'}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="label">Nama Lengkap</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Agus Setiawan"
                  className="input pl-11"
                  autoComplete="name"
                />
              </div>
            </div>
          )}
          <div>
            <label className="label">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                className="input pl-11"
                autoComplete="email"
                required
              />
            </div>
          </div>
          <div>
            <label className="label">Kata Sandi</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                className="input pl-11"
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                required
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-error-50 px-4 py-3 text-sm font-semibold text-error-700 ring-1 ring-error-200">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : mode === 'signin' ? (
              'Masuk'
            ) : (
              'Daftar Sekarang'
            )}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-500">
          {mode === 'signin' ? 'Belum punya akun? ' : 'Sudah punya akun? '}
          <button
            onClick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')}
            className="font-semibold text-primary-600 hover:text-primary-700"
          >
            {mode === 'signin' ? 'Daftar di sini' : 'Masuk di sini'}
          </button>
        </p>
      </div>
    </div>
  );
}
