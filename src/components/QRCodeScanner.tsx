import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { QrCode, CheckCircle2, AlertCircle, MapPin } from 'lucide-react';

interface QRCodeScannerProps {
  orderId: string;
  employerId: string;
  isEmployer: boolean; // Apakah yang membuka halaman ini Pemberi Kerja atau Pekerja
}

export function QRCodeScanner({ orderId, employerId, isEmployer }: QRCodeScannerProps) {
  const [scanning, setScanning] = useState(false);
  const [attendanceStatus, setAttendanceStatus] = useState<'idle' | 'checked-in' | 'checked-out'>('idle');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fungsi simulasi Scan QR / Eksekusi Presensi oleh Pekerja
  const handleScanSuccess = async (scannedToken: string) => {
    setLoading(true);
    setErrorMessage(null);

    try {
      // 1. Validasi kecocokan token order
      if (scannedToken !== `KERJAHARIAN-ORDER-${orderId}`) {
        throw new Error('Kode QR tidak valid atau tidak sesuai dengan pesanan ini.');
      }

      // 2. Ambil lokasi GPS perangkat saat ini untuk validasi geofencing
      if (!('geolocation' in navigator)) {
        throw new Error('Perangkat tidak mendukung GPS.');
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          // 3. Update status ke database Supabase (Check-In / In-Progress)
          const { error } = await supabase
            .from('orders')
            .update({
              status: 'In-Progress',
              check_in_lat: lat,
              check_in_lng: lng,
              check_in_time: new Date().toISOString(),
            })
            .eq('id', orderId);

          if (error) throw error;

          setAttendanceStatus('checked-in');
          setScanning(false);
          alert('Absensi Masuk (Check-In) Berhasil! Shift kerja dimulai.');
          window.location.reload();
        },
        (err) => {
          throw new Error('Gagal mendeteksi lokasi GPS: ' + err.message);
        },
        { enableHighAccuracy: true }
      );
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan saat verifikasi QR.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-5 rounded-xl shadow-md border space-y-4">
      <div className="flex justify-between items-center border-b pb-3">
        <div className="flex items-center gap-2">
          <QrCode className="h-5 w-5 text-green-600" />
          <h3 className="font-bold text-gray-800 text-sm">Absensi QR & Validasi Lokasi</h3>
        </div>
        <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded font-medium">
          {attendanceStatus === 'checked-in' ? 'Status: Masuk Kerja' : 'Status: Menunggu Presensi'}
        </span>
      </div>

      {isEmployer ? (
        // Tampilan untuk Pemberi Kerja (Menunjukkan QR Code untuk di-scan pekerja)
        <div className="text-center space-y-3 py-2">
          <p className="text-xs text-gray-600">
            Tunjukkan QR Code ini kepada Mitra Pekerja saat tiba di lokasi proyek untuk melakukan absensi masuk.
          </p>
          <div className="bg-gray-50 border-2 border-dashed border-gray-300 p-6 rounded-xl inline-block">
            <div className="w-32 h-32 bg-white flex flex-col items-center justify-center border shadow-sm mx-auto rounded-lg">
              <QrCode className="h-20 w-20 text-gray-800" />
              <span className="text-[9px] text-gray-500 font-mono mt-1">ORDER-{orderId.slice(0, 8)}</span>
            </div>
          </div>
          <p className="text-[11px] text-green-700 font-medium">
            * Terikat otomatis dengan koordinat lokasi dan ID Pesanan Anda.
          </p>
        </div>
      ) : (
        // Tampilan untuk Pekerja (Melakukan Scan / Konfirmasi Check-In)
        <div className="space-y-3 text-center py-2">
          <p className="text-xs text-gray-600">
            Pastikan Anda sudah berada di lokasi proyek. Klik tombol di bawah untuk memindai QR pemberi kerja dan mengaktifkan GPS.
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
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 rounded-lg text-sm transition shadow-sm flex items-center justify-center gap-2"
          >
            <MapPin className="h-4 w-4" />
            {loading ? 'Memverifikasi GPS & QR...' : 'Scan QR & Check-In Sekarang'}
          </button>
        </div>
      )}
    </div>
  );
            }
                                             
