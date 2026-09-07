import React from 'react';

export function TermsOfService() {
  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-xl shadow-md my-8 space-y-6 text-gray-800">
      <h1 className="text-2xl font-bold border-b pb-4">Syarat & Ketentuan Layanan (Terms of Service)</h1>
      
      <p className="text-sm text-gray-600">
        Selamat datang di <strong>www.kerjaharian.my.id</strong>. Dengan mengakses atau menggunakan platform KerjaHarian, Anda dianggap telah membaca, memahami, dan menyetujui seluruh Syarat & Ketentuan di bawah ini.
      </p>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-900">1. Ketentuan Umum Akun</h2>
        <ul className="list-disc pl-5 text-sm space-y-1 text-gray-700">
          <li>Pengguna wajib mendaftarkan diri menggunakan nomor WhatsApp yang aktif untuk proses verifikasi OTP.</li>
          <li>Setiap pengguna bertanggung jawab penuh atas kerahasiaan akun dan aktivitas yang terjadi di dalam akun mereka.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-900">2. Sistem Tarif & Pricing Engine</h2>
        <p className="text-sm text-gray-700">
          Seluruh kalkulasi upah, biaya layanan (admin), PPN, dan asuransi ditentukan secara transparan melalui <em>Pricing Engine</em> otomatis sistem. Perubahan durasi shift atau penambahan jam kerja akan dihitung ulang secara otomatis berdasarkan tarif tier pekerjaan yang berlaku.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-900">3. Tanggung Jawab & Larangan</h2>
        <p className="text-sm text-gray-700">
          Mitra pekerja dan pemberi kerja dilarang melakukan transaksi di luar platform untuk pesanan yang diinisiasi melalui KerjaHarian guna memastikan perlindungan asuransi dan pencatatan riwayat pekerjaan tetap sah.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-900">4. Layanan Pelanggan</h2>
        <p className="text-sm text-gray-700">
          Jika Anda memiliki pertanyaan, sengketa pesanan, atau kendala teknis, silakan hubungi tim resmi KerjaHarian melalui layanan pelanggan WhatsApp di nomor: <strong>088289767019</strong>.
        </p>
      </section>

      <div className="bg-gray-50 p-4 rounded-lg border text-xs text-gray-500">
        KerjaHarian dapat mengubah atau memperbarui syarat dan ketentuan ini sewaktu-waktu untuk peningkatan layanan platform. Perubahan akan diinformasikan melalui kanal resmi KerjaHarian.
      </div>
    </div>
  );
}
