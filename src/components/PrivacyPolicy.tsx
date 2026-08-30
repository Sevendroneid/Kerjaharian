import React from 'react';

export function PrivacyPolicy() {
  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-xl shadow-md my-8 space-y-6 text-gray-800">
      <h1 className="text-2xl font-bold border-b pb-4">Kebijakan Privasi & Kepatuhan UU PDP</h1>
      
      <p className="text-sm text-gray-600">
        Berlaku efektif sejak peluncuran platform <strong>www.kerjaharian.my.id</strong>. Kami berkomitmen untuk melindungi dan menghargai privasi data pribadi Anda sesuai dengan Undang-Undang Pelindungan Data Pribadi (UU PDP) No. 27 Tahun 2022 di Republik Indonesia.
      </p>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-900">1. Data Pribadi yang Kami Kumpulkan</h2>
        <ul className="list-disc pl-5 text-sm space-y-1 text-gray-700">
          <li><strong>Nomor WhatsApp:</strong> Digunakan untuk autentikasi (OTP) dan notifikasi status pesanan.</li>
          <li><strong>Data Identitas (KTP):</strong> Khusus untuk mitra pekerja, dokumen KTP dikumpulkan untuk verifikasi KYC (Know Your Customer) dan disimpan dalam <em>Secure Private Storage</em> yang hanya dapat diakses oleh Admin berwenang.</li>
          <li><strong>Data Lokasi (GPS):</strong> Dilacak secara *realtime* selama shift pekerjaan berlangsung demi keamanan dan efisiensi, serta otomatis berhenti saat status pesanan menjadi <em>Completed</em>.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-900">2. Tujuan Pengumpulan Data</h2>
        <p className="text-sm text-gray-700">
          Data Anda diproses semata-mata untuk memfasilitasi pencocokan pekerjaan harian, verifikasi keamanan mitra, pencegahan penipuan, serta memenuhi kewajiban hukum yang berlaku di Indonesia.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-900">3. Retensi & Penghapusan Data</h2>
        <p className="text-sm text-gray-700">
          Kami menyimpan data Anda selama akun Anda aktif atau diperlukan untuk menyediakan layanan. Anda memiliki hak penuh untuk meminta penghapusan data pribadi dan riwayat lokasi Anda dengan menghubungi pusat bantuan kami di nomor WhatsApp CS resmi: <strong>088289767019</strong>.
        </p>
      </section>

      <div className="bg-gray-50 p-4 rounded-lg border text-xs text-gray-500">
        * Dengan mendaftar dan menggunakan platform KerjaHarian, Anda menyatakan telah membaca, memahami, dan memberikan persetujuan eksplisit atas pemrosesan data pribadi Anda sesuai kebijakan ini.
      </div>
    </div>
  );
}
