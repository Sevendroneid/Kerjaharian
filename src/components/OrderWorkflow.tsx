import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { calculateOrderPrice } from '../utils/pricingEngine';

interface OrderWorkflowProps {
  order: {
    id: string;
    status: 'Pending' | 'Accepted' | 'In-Progress' | 'Completed';
    hours: number;
    tier: string;
    night_shift: boolean;
    tool_allowance: number;
    physical_load: boolean;
    job: {
      base_price_4h: number;
      hourly_rate: number;
    };
  };
  userRole: 'worker' | 'employer' | 'admin';
}

export function OrderWorkflow({ order, userRole }: OrderWorkflowProps) {
  const [status, setStatus] = useState(order.status);
  const [loading, setLoading] = useState(false);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [extraHours, setExtraHours] = useState(2);

  const updateStatus = async (newStatus: any) => {
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

  const handleExtendShift = async () => {
    setLoading(true);
    const totalHours = order.hours + extraHours;
    
    // Hitung ulang harga menggunakan Pricing Engine Batch 1
    const newPrice = calculateOrderPrice({
      base4h: order.job.base_price_4h,
      hourlyRate: order.job.hourly_rate,
      hours: totalHours,
      nightShift: order.night_shift,
      toolAllowance: order.tool_allowance,
      physicalLoad: order.physical_load,
      adminPercent: 0.10,
      vatPercent: 0.11,
      insuranceFee: 1000,
    });

    const { error } = await supabase
      .from('orders')
      .update({
        hours: totalHours,
        subtotal: newPrice.baseWage,
        admin_fee: newPrice.adminFee,
        ppn: newPrice.ppn,
        total_price: newPrice.totalPrice,
      })
      .eq('id', order.id);

    if (error) {
      alert('Gagal memperpanjang shift: ' + error.message);
    } else {
      alert(`Shift berhasil diperpanjang ${extraHours} jam! Total tagihan diperbarui.`);
      setShowExtendModal(false);
      window.location.reload();
    }
    setLoading(false);
  };

  return (
    <div className="bg-white p-5 rounded-xl shadow-md border space-y-4">
      <div className="flex justify-between items-center">
        <span className="font-bold text-gray-700">Status Pesanan:</span>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
          status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
          status === 'Accepted' ? 'bg-blue-100 text-blue-800' :
          status === 'In-Progress' ? 'bg-purple-100 text-purple-800' :
          'bg-green-100 text-green-800'
        }`}>
          {status}
        </span>
      </div>

      <div className="flex gap-2 pt-2 border-t">
        {userRole === 'employer' && status === 'Pending' && (
          <button
            disabled={loading}
            onClick={() => updateStatus('Accepted')}
            className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-blue-700"
          >
            Terima Order (Accepted)
          </button>
        )}

        {userRole === 'worker' && status === 'Accepted' && (
          <button
            disabled={loading}
            onClick={() => updateStatus('In-Progress')}
            className="flex-1 bg-purple-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-purple-700"
          >
            Mulai Kerja (In-Progress)
          </button>
        )}

        {status === 'In-Progress' && (
          <>
            <button
              onClick={() => setShowExtendModal(true)}
              className="flex-1 bg-amber-500 text-white py-2 rounded-lg text-sm font-semibold hover:bg-amber-600"
            >
              Perpanjang Shift
            </button>
            <button
              disabled={loading}
              onClick={() => updateStatus('Completed')}
              className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-green-700"
            >
              Selesaikan Pesanan
            </button>
          </>
        )}
      </div>

      {/* Modal Perpanjang Shift & Rekalkulasi Otomatis */}
      {showExtendModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full space-y-4">
            <h3 className="font-bold text-lg text-gray-800">Perpanjang Durasi Shift</h3>
            <p className="text-sm text-gray-600">Pilih tambahan jam kerja. Pricing Engine akan otomatis menghitung tarif proporsionalnya.</p>
            <select
              value={extraHours}
              onChange={(e) => setExtraHours(Number(e.target.value))}
              className="w-full border p-2 rounded-lg text-sm"
            >
              <option value={1}>Tambah 1 Jam</option>
              <option value={2}>Tambah 2 Jam</option>
              <option value={4}>Tambah 4 Jam</option>
            </select>
            <div className="flex gap-2">
              <button
                onClick={() => setShowExtendModal(false)}
                className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg text-sm font-semibold"
              >
                Batal
              </button>
              <button
                disabled={loading}
                onClick={handleExtendShift}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-green-700"
              >
                Konfirmasi & Hitung Ulang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
      }
        
