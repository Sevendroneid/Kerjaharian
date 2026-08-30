import React from 'react';
import { calculateOrderPrice } from '../utils/pricingEngine';
import { Shield, Clock, MapPin, CheckCircle, ArrowRight } from 'lucide-react';
import type { View } from '@/lib/types';

interface LandingProps {
  onNavigate: (view: View) => void;
}

export function Landing({ onNavigate }: LandingProps) {
  // Simulasi kalkulasi dinamis menggunakan Pricing Engine (Contoh: Kategori Skilled, 4 Jam, dengan Asuransi & PPN)
  const samplePricing = calculateOrderPrice({
    wageAmount: 250000,
    nightShift: true,
    needsTools: true,
  });

  return (
    <div className="space-y-12 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary-900 to-primary-950 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <span className="bg-primary-800 text-primary-200 text-xs px-3 py-1 rounded-full font-semibold uppercase tracking-wider">
            Platform Tenaga Kerja Harian Terampil
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
            Solusi Kilat Tenaga Kerja Harian Terdekat & Terverifikasi
          </h1>
          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto">
            Hubungkan kebutuhan proyek, renovasi, atau operasional Anda dengan mitra pekerja harian profesional secara transparan dan aman.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3 pt-4">
            <button
              onClick={() => onNavigate('employer')}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-xl transition shadow-lg text-sm flex items-center justify-center gap-2"
            >
              Pesan Tenaga Kerja Sekarang <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => onNavigate('worker')}
              className="bg-white/10 hover:bg-white/20 text-white font-semibold px-6 py-3 rounded-xl transition text-sm border border-white/20"
            >
              Daftar Jadi Mitra Pekerja
            </button>
          </div>
        </div>
      </section>

      {/* Keunggulan Platform */}
      <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-3">
          <div className="h-10 w-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center font-bold">
            💰
          </div>
          <h3 className="font-bold text-slate-900 text-base">Upah Transparan & Persentase Jelas</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Perhitungan upah dihitung secara akurat melalui mesin harga transparan: mencakup upah dasar, penyesuaian beban fisik/shift, biaya admin transparan, PPN, dan perlindungan asuransi resmi.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-3">
          <div className="h-10 w-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center font-bold">
            ⚡
          </div>
          <h3 className="font-bold text-slate-900 text-base">Kilat & Real-Time GPS</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Radar kerja menampilkan mitra terdekat dengan akurasi GPS, dilengkapi verifikasi absensi ganda berbasis QR Code dan pemantauan shift langsung.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-3">
          <div className="h-10 w-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center font-bold">
            🛡️
          </div>
          <h3 className="font-bold text-slate-900 text-base">Legalitas & Kepatuhan UU PDP</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Terdaftar resmi dan mematuhi standar pelindungan data pribadi (UU PDP No. 27 Tahun 2022) serta terverifikasi Kemenkumham.
          </p>
        </div>
      </div>

      {/* Kartu Simulasi Panggilan Masuk (Dihitung dari Pricing Engine Dinamis) */}
      <div className="max-w-xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-md border p-6 space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold uppercase tracking-wider text-primary-700 bg-primary-50 px-2.5 py-1 rounded-md">
              Simulasi Panggilan Masuk (Live Engine)
            </span>
            <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span> Online
            </span>
          </div>


          {/* Rincian Kalkulasi Harga Transparan */}
          <div className="border-b pb-4">
            <h4 className="font-bold text-slate-900 text-sm">Spesialis Renovasi & Tukang Terampil</h4>
            <p className="text-xs text-slate-500 mt-0.5">Shift Malam + Tunjangan Alat Kerja</p>
          </div>

          <div className="space-y-2 text-xs text-slate-600 bg-slate-50 p-3.5 rounded-xl border">
            <div className="flex justify-between">
              <span>Upah Dasar:</span>
              <span className="font-semibold text-slate-800">Rp {samplePricing.wageAmount.toLocaleString('id-ID')}</span>
            </div>
            {samplePricing.nightShiftAdd > 0 && (
              <div className="flex justify-between text-amber-700">
                <span>Tambahan Shift Malam (+20%):</span>
                <span>+ Rp {samplePricing.nightShiftAdd.toLocaleString('id-ID')}</span>
              </div>
            )}
            {samplePricing.toolAllowance > 0 && (
              <div className="flex justify-between">
                <span>Tunjangan Alat Kerja:</span>
                <span>+ Rp {samplePricing.toolAllowance.toLocaleString('id-ID')}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Biaya Admin Platform (10%):</span>
              <span>+ Rp {samplePricing.adminFee.toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between">
              <span>PPN (11% dari admin):</span>
              <span>+ Rp {samplePricing.ppn.toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between">
              <span>Perlindungan Kerja (BPJS + FWD):</span>
              <span>+ Rp {samplePricing.insurance.totalMicroInsurance.toLocaleString('id-ID')}</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-bold text-sm text-slate-900">
              <span>Total Tagihan Final:</span>
              <span className="text-green-600">Rp {samplePricing.totalPrice.toLocaleString('id-ID')}</span>
            </div>
          </div>

          <button
            onClick={() => onNavigate('employer')}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-2"
          >
            Buat Pesanan Dengan Tarif Transparan Ini <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
