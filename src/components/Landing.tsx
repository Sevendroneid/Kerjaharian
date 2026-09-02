import React from 'react';
import { calculateOrderPrice } from '../utils/pricingEngine';
import { Shield, Clock, MapPin, CheckCircle, ArrowRight } from 'lucide-react';
import type { View } from '@/lib/types';

interface LandingProps {
  onNavigate: (view: View) => void;
  lang: 'id' | 'en';
}

export function Landing({ onNavigate, lang }: LandingProps) {
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
            {lang === 'id'
              ? 'Platform Tenaga Kerja Harian Terampil'
              : 'Skilled Daily Labor Platform'}
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
            {lang === 'id'
              ? 'Solusi Kilat Tenaga Kerja Harian Terdekat & Terverifikasi'
              : 'Fast Solution for Verified Nearby Daily Workers'}
          </h1>
          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto">
            {lang === 'id'
              ? 'Hubungkan kebutuhan proyek dengan mitra pekerja harian profesional secara transparan dan aman.'
              : 'Connect your project needs with professional daily workers transparently and safely.'}
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3 pt-4">
            <button
              onClick={() => onNavigate('employer')}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-xl transition shadow-lg text-sm flex items-center justify-center gap-2"
            >
              {lang === 'id' ? 'Pesan Sekarang' : 'Hire Now'}
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => onNavigate('worker')}
              className="bg-white/10 hover:bg-white/20 text-white font-semibold px-6 py-3 rounded-xl transition text-sm border border-white/20"
            >
              {lang === 'id' ? 'Jadi Mitra Pekerja' : 'Join as Worker'}
            </button>
          </div>
        </div>
      </section>

      {/* Features */}
      <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-3">
          <div className="h-10 w-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center font-bold">
            💰
          </div>
          <h3 className="font-bold text-slate-900 text-base">
            {lang === 'id' ? 'Upah Transparan' : 'Transparent Wages'}
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            {lang === 'id'
              ? 'Perhitungan upah akurat: upah dasar, shift malam, alat, biaya platform, dan asuransi - semua terlihat jelas.'
              : 'Accurate wage calculation: base wage, night shift, tools, platform fee, and insurance - all transparent.'}
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-3">
          <div className="h-10 w-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center font-bold">
            ⚡
          </div>
          <h3 className="font-bold text-slate-900 text-base">
            {lang === 'id' ? 'Kilat & Real-Time' : 'Fast & Real-Time'}
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            {lang === 'id'
              ? 'Publikasikan pesanan langsung. Pekerja terdekat akan menerima panggilan real-time dan menghubungi Anda segera.'
              : 'Publish jobs instantly. Nearby workers receive real-time calls and contact you immediately.'}
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-3">
          <div className="h-10 w-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center font-bold">
            🛡️
          </div>
          <h3 className="font-bold text-slate-900 text-base">
            {lang === 'id' ? 'Aman & Terpercaya' : 'Safe & Trusted'}
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            {lang === 'id'
              ? 'Rating berbasis track record. Verifikasi identitas ringan. Perlindungan kerja otomatis untuk semua pekerja.'
              : 'Rating-based track record. Lightweight ID verification. Automatic worker protection for all.'
            }
          </p>
        </div>
      </div>

      {/* Pricing Simulator */}
      <div className="max-w-xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-md border p-6 space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold uppercase tracking-wider text-primary-700 bg-primary-50 px-2.5 py-1 rounded-md">
              {lang === 'id' ? 'Contoh Kalkulasi' : 'Pricing Example'}
            </span>
            <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              {lang === 'id' ? 'Aktif' : 'Live'}
            </span>
          </div>

          <div className="border-b pb-4">
            <h4 className="font-bold text-slate-900 text-sm">
              {lang === 'id' ? 'Tukang Renovasi (Shift Malam + Alat)' : 'Renovation Worker (Night + Tools)'}
            </h4>
          </div>

          <div className="space-y-2 text-xs text-slate-600 bg-slate-50 p-3.5 rounded-xl border">
            <div className="flex justify-between">
              <span>{lang === 'id' ? 'Upah Dasar:' : 'Base Wage:'}</span>
              <span className="font-semibold text-slate-800">
                Rp {samplePricing.wageAmount.toLocaleString('id-ID')}
              </span>
            </div>
            {samplePricing.nightShiftAdd > 0 && (
              <div className="flex justify-between text-amber-700">
                <span>{lang === 'id' ? 'Shift Malam (+20%):' : 'Night Shift (+20%):'}</span>
                <span>+ Rp {samplePricing.nightShiftAdd.toLocaleString('id-ID')}</span>
              </div>
            )}
            {samplePricing.toolAllowance > 0 && (
              <div className="flex justify-between">
                <span>{lang === 'id' ? 'Alat:' : 'Tools:'}</span>
                <span>+ Rp {samplePricing.toolAllowance.toLocaleString('id-ID')}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>{lang === 'id' ? 'Biaya Platform:' : 'Platform Fee:'}</span>
              <span>+ Rp {samplePricing.platformFee.toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between">
              <span>{lang === 'id' ? 'Asuransi:' : 'Insurance:'}</span>
              <span>+ Rp {samplePricing.insurance.microInsurance.toLocaleString('id-ID')}</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-bold text-sm text-slate-900">
              <span>{lang === 'id' ? 'Total:' : 'Total:'}</span>
              <span className="text-green-600">Rp {samplePricing.totalPrice.toLocaleString('id-ID')}</span>
            </div>
          </div>

          <button
            onClick={() => onNavigate('employer')}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-2"
          >
            {lang === 'id' ? 'Mulai Posting Pesanan' : 'Start Posting Jobs'}
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
