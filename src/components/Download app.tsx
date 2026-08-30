import React from 'react';
import { QrCode, Download, Smartphone } from 'lucide-react';

export function DownloadApp() {
  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-xl shadow-md my-8 space-y-6 text-gray-800">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">Download Aplikasi KerjaHarian</h1>
        <p className="text-sm text-gray-600">
          Nikmati kemudahan mencari dan memesan tenaga kerja harian langsung dalam genggaman Anda.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center border p-6 rounded-xl bg-gray-50">
        <div className="space-y-4 text-center md:text-left">
          <h3 className="font-semibold text-lg text-gray-900">Aplikasi Mobile Resmi</h3>
          <p className="text-xs text-gray-600 leading-relaxed">
            Scan QR code di samping menggunakan kamera HP Anda, atau unduh langsung untuk perangkat Android dan iPhone.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
            <button className="bg-black text-white px-4 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 hover:bg-gray-800 transition">
              <Download className="h-4 w-4" /> Download APK (Android)
            </button>
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 hover:bg-blue-700 transition">
              <Smartphone className="h-4 w-4" /> App Store (iOS)
            </button>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center bg-white p-4 rounded-lg border shadow-sm">
          {/* Simulasi Kotak QR Code */}
          <div className="w-36 h-36 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400">
            <QrCode className="h-16 w-16 text-gray-700" />
            <span className="text-[10px] mt-1 font-medium text-gray-500">Scan to Download</span>
          </div>
          <span className="text-[11px] text-gray-500 mt-2">www.kerjaharian.my.id</span>
        </div>
      </div>
    </div>
  );
}
