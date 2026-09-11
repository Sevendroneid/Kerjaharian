import { Component, type ErrorInfo, type ReactNode } from 'react';
interface Props { children: ReactNode; }
interface State { hasError: boolean; message: string; }
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };
  static getDerivedStateFromError(error: unknown): State { return { hasError: true, message: error instanceof Error ? error.message : 'Kesalahan aplikasi tidak diketahui.' }; }
  componentDidCatch(error: unknown, info: ErrorInfo) { console.error('KerjaHarian runtime error:', error, info.componentStack); }
  render() {
    if (!this.state.hasError) return this.props.children;
    const en = typeof window !== 'undefined' && localStorage.getItem('kerjaharian_lang') === 'en';
    return <div className="min-h-screen bg-slate-50 px-6 py-16"><div className="mx-auto max-w-lg rounded-2xl bg-white p-6 shadow-sm ring-1 ring-error-200">
      <h1 className="text-xl font-extrabold text-slate-900">{en ? 'Something went wrong' : 'Aplikasi mengalami kendala'}</h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">{en ? 'The page is protected from a blank screen. Please reload the application after the issue is resolved.' : 'Halaman tetap aman dan tidak lagi menjadi layar putih. Silakan muat ulang aplikasi setelah perbaikan.'}</p>
      <details className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-600"><summary className="cursor-pointer font-semibold">{en ? 'Technical details' : 'Detail teknis'}</summary><pre className="mt-2 whitespace-pre-wrap break-words">{this.state.message}</pre></details>
      <button type="button" onClick={() => window.location.reload()} className="btn-primary mt-5 w-full">{en ? 'Reload' : 'Muat Ulang'}</button>
    </div></div>;
  }
}
