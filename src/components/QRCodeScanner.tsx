import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { QrCode, AlertCircle, MapPin } from 'lucide-react';

interface QRCodeScannerProps {
  orderId: string;
  employerId: string;
  isEmployer: boolean;
}

/**
 * Check-in UI retained for compatibility. The client never mutates orders
 * directly; the authoritative worker check-in is performed by the guarded RPC.
 * The QR token remains a local UX gate until a server-issued QR nonce is wired.
 */
export function QRCodeScanner({ orderId, employerId: _employerId, isEmployer }: QRCodeScannerProps) {
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleScanSuccess = async (scannedToken: string) => {
    if (loading) return;
    setLoading(true);
    setScanning(true);
    setErrorMessage(null);

    try {
      if (scannedToken !== `KERJAHARIAN-ORDER-${orderId}`) {
        throw new Error('Kode QR tidak valid atau tidak sesuai dengan pekerjaan ini.');
      }

      if (!('geolocation' in navigator)) {
        throw new Error('Perangkat tidak mendukung GPS.');
      }

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 30000,
        });
      });

      const { error } = await supabase.rpc('worker_check_in', {
        p_job_id: orderId,
        p_lat: position.coords.latitude,
        p_lng: position.coords.longitude,
        p_photo_path: null,
      });

      if (error) throw error;
      alert('Check-in berhasil. Pekerjaan tercatat melalui server.');
      window.location.reload();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Terjadi kesalahan saat check-in.');
    } finally {
      setScanning(false);
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-5 rounded-xl shadow-md border space-y-4">
      <div className="flex justify-between items-center border-b pb-3">
        <div className="flex items-center gap-2">
          <QrCode className="h-5 w-5 text-green-600" />
          <h3 className="font-bold text-gray-800 text-sm">Check-In & Validasi Lokasi</h3>
        </div>
        <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded font-medium">
          {scanning ? 'Memverifikasi' : 'Siap Check-In'}
        </span>
      </div>

      {isEmployer ? (
        <div className="text-center space-y-3 py-2">
          <p className="text-xs text-gray-600">
            Tunjukkan kode pekerjaan ini kepada Mitra saat tiba di lokasi. Status pekerjaan tetap dikendalikan server.
          </p>
          <div className="bg-gray-50 border-2 border-dashed border-gray-300 p-6 rounded-xl inline-block">
            <div className="w-32 h-32 bg-white flex flex-col items-center justify-center border shadow-sm mx-auto rounded-lg">
              <QrCode className="h-20 w-20 text-gray-800" />
              <span className="text-[9px] text-gray-500 font-mono mt-1">ORDER-{orderId.slice(0, 8)}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3 text-center py-2">
          <p className="text-xs text-gray-600">
            Pastikan Anda berada di lokasi pekerjaan. Check-in menggunakan GPS dan diproses oleh server.
          </p>

          {errorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-lg flex items-center gap-2 text-left">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <button
            disabled={loading}
            onClick={() => handleScanSuccess(`KERJAHARIAN-ORDER-${orderId}`)}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 rounded-lg text-sm transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <MapPin className="h-4 w-4" />
            {loading ? 'Memverifikasi GPS...' : 'Scan QR & Check-In Sekarang'}
          </button>
        </div>
      )}
    </div>
  );
}
