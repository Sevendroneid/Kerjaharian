import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function AdminPricingReview() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableError, setTableError] = useState(false);

  const loadPending = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('job_prices_audit')
      .select('*, job_prices(job_name)')
      .eq('status', 'pending');
    if (error) setTableError(true); else setRows(data ?? []);
    setLoading(false);
  };

  useEffect(() => { loadPending(); }, []);

  const approve = async (row: any) => {
    await supabase.from('job_prices').update({ base_price: row.proposed_price }).eq('id', row.job_price_id);
    await supabase.from('job_prices_audit').update({ status: 'approved' }).eq('id', row.id);
    loadPending();
  };

  const reject = async (row: any) => {
    await supabase.from('job_prices_audit').update({ status: 'rejected' }).eq('id', row.id);
    loadPending();
  };

  if (loading) return <div className="p-4">Memuat...</div>;
  if (tableError) return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-2">Panel Admin</h1>
      <p className="text-gray-500">Kamu berhasil masuk sebagai admin. Fitur review harga belum aktif karena database job_prices belum dibuat.</p>
    </div>
  );

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">Review Usulan Harga AI</h1>
      {rows.length === 0 && <p className="text-gray-500">Tidak ada usulan pending.</p>}
      {rows.map((row) => (
        <div key={row.id} className="border rounded-lg p-4">
          <p className="font-semibold">{row.job_prices?.job_name}</p>
          <p>Rp{row.old_price?.toLocaleString('id-ID')} → Rp{row.proposed_price?.toLocaleString('id-ID')}</p>
          <p className="text-sm text-gray-600">{row.reasoning}</p>
          <div className="flex gap-2 mt-2">
            <button onClick={() => approve(row)} className="bg-green-600 text-white px-3 py-1 rounded">Setujui</button>
            <button onClick={() => reject(row)} className="bg-red-500 text-white px-3 py-1 rounded">Tolak</button>
          </div>
        </div>
      ))}
    </div>
  );
}
