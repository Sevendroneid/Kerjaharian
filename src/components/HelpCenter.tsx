import React from 'react';

export function HelpCenter() {
  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-md my-8 space-y-6 text-gray-800">
      <h1 className="text-2xl font-bold border-b pb-4">Pusat Bantuan & Layanan Pelanggan</h1>

      <p className="text-sm text-gray-600">
        Butuh bantuan terkait pesanan harian, kendala pembayaran, atau verifikasi akun di <strong>www.kerjaharian.my.id</strong>? Tim *Customer Support* kami siap membantu Anda.
      </p>

      <div className="bg-green-50 border border-green-200 p-5 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-green-900 text-base">Hubungi CS Resmi via WhatsApp</h3>
          <p className="text-xs text-green-700 mt-1">Layanan cepat tanggap untuk Mitra Pekerja dan Pemberi Kerja.</p>
        </div>
        <a
          href="https://wa.me/6288289767019?text=Halo%20Admin%20KerjaHarian,%20saya%20butuh%20bantuan%20terkait..."
          target="_blank"
          rel="noopener noreferrer"
          className="bg-green-600 hover:bg-green-700 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition shadow-sm whitespace-nowrap"
        >
          Chat 088289767019
        </a>
      </div>

      <div className="space-y-3">
        <h2 className="font-semibold text-gray-900 text-base">Pertanyaan Umum (FAQ)</h2>

        <div className="border p-4 rounded-lg space-y-1">
          <h4 className="font-medium text-sm text-gray-900">Bagaimana cara kerja sistem pembayaran dan tarif?</h4>
          <p className="text-xs text-gray-600">Tarif dihitung secara transparan menggunakan <em>Pricing Engine</em> berbasis paket 4 jam ditambah jam tambahan, serta modifier shift malam atau beban fisik yang diproses secara otomatis.</p>
        </div>

        <div className="border p-4 rounded-lg space-y-1">
          <h4 className="font-medium text-sm text-gray-900">Apakah nomor telepon asli saya akan terlihat oleh publik?</h4>
          <p className="text-xs text-gray-600">Tidak. Sistem kami dirancang dengan fitur penyembunyian nomor asli, di mana komunikasi langsung dialihkan melalui ruang chat aplikasi dan WhatsApp berfungsi sebagai pengingat notifikasi.</p>
        </div>
      </div>
    </div>
  );
}
