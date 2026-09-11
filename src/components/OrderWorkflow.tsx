import React from 'react';
import { Clock3, ShieldCheck } from 'lucide-react';

interface OrderWorkflowProps {
  order: {
    id: string;
    status: 'open' | 'assigned' | 'Pending' | 'Accepted' | 'In-Progress' | 'completed' | 'Completed' | 'cancelled';
  };
  userRole: 'worker' | 'employer' | 'admin';
}

/**
 * Legacy display-only order status component.
 * Transactional state must be changed through the guarded marketplace RPCs
 * (dispatch, check-in, completion, rematch/cancellation, overtime), never by
 * directly updating orders.status from the client.
 */
export function OrderWorkflow({ order, userRole }: OrderWorkflowProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <span className="font-bold text-slate-700">Status Pesanan</span>
          <p className="mt-1 text-xs text-slate-500">Status transaksi dikelola oleh server.</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          {order.status}
        </span>
      </div>

      <div className="flex gap-2 border-t pt-3">
        {userRole === 'worker' && (order.status === 'assigned' || order.status === 'Accepted') && (
          <div className="flex-1 rounded-lg bg-slate-50 p-3 text-center text-xs font-semibold text-slate-500">
            <Clock3 className="mx-auto mb-1 h-4 w-4" />
            Check-in dan mulai kerja mengikuti alur pekerjaan yang tervalidasi server.
          </div>
        )}

        {(userRole === 'employer' || userRole === 'admin') && order.status === 'In-Progress' && (
          <div className="flex-1 rounded-lg bg-emerald-50 p-3 text-center text-xs font-semibold text-emerald-700">
            <ShieldCheck className="mx-auto mb-1 h-4 w-4" />
            Gunakan kontrol pekerjaan resmi untuk menyelesaikan pekerjaan atau meminta perpanjangan.
          </div>
        )}
      </div>
    </div>
  );
}
