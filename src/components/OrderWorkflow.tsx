import React, { useState } from 'react';
import { CheckCircle2, Clock3, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface OrderWorkflowProps {
  order: {
    id: string;
    status: 'open' | 'assigned' | 'Pending' | 'Accepted' | 'In-Progress' | 'completed' | 'Completed' | 'cancelled';
  };
  userRole: 'worker' | 'employer' | 'admin';
}

/**
 * Legacy order status controls.
 * Timer, completion decisions, and minute-based overtime are intentionally
 * handled by JobTimer + server RPCs, not by the old hour-extension UI.
 */
export function OrderWorkflow({ order, userRole }: OrderWorkflowProps) {
  const [status, setStatus] = useState(order.status);
  const [loading, setLoading] = useState(false);

  const updateStatus = async (newStatus: 'Accepted' | 'In-Progress' | 'Completed') => {
    setLoading(true);
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', order.id);

    if (error) {
      alert('Gagal memperbarui status: ' + error.message);
    } else {
      setStatus(newStatus);
    }
    setLoading(false);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <span className="font-bold text-slate-700">Status Pesanan</span>
          <p className="mt-1 text-xs text-slate-500">Timer dan lembur per menit dikelola oleh server.</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          {status}
        </span>
      </div>

      <div className="flex gap-2 border-t pt-3">
        {userRole === 'employer' && (status === 'open' || status === 'Pending') && (
          <button
            disabled={loading}
            onClick={() => updateStatus('Accepted')}
            className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : 'Terima Order'}
          </button>
        )}

        {userRole === 'worker' && (status === 'assigned' || status === 'Accepted') && (
          <div className="flex-1 rounded-lg bg-slate-50 p-2 text-center text-xs font-semibold text-slate-500">
            <Clock3 className="mx-auto mb-1 h-4 w-4" />
            Menunggu timer dimulai oleh pemberi kerja
          </div>
        )}

        {userRole === 'employer' && status === 'In-Progress' && (
          <div className="flex-1 rounded-lg bg-emerald-50 p-2 text-center text-xs font-semibold text-emerald-700">
            <CheckCircle2 className="mx-auto mb-1 h-4 w-4" />
            Gunakan JobTimer untuk Selesai / Lanjutkan dan lembur per menit.
          </div>
        )}
      </div>
    </div>
  );
}
