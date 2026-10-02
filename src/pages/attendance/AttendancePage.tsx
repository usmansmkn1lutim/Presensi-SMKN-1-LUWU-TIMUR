import React from 'react';
import { QrCode, MapPin, Camera, AlertCircle, Info, ShieldCheck } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { APP_CONFIG } from '../../config/appConfig';

export const AttendancePage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-5 sm:p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">
              Presensi Digital
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-[#111827] mt-0.5">
              Pencatatan Kehadiran Harian
            </h2>
            <p className="text-xs text-[#6B7280] mt-1">
              {APP_CONFIG.schoolName} · Titik Utama Sekolah
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 border border-orange-200 text-xs font-semibold text-[#EA580C]">
              <span className="w-2 h-2 rounded-full bg-[#F97316]" />
              Fase 1: Antarmuka Fondasi
            </span>
          </div>
        </div>
      </div>

      {/* Main Attendance Shell Container */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Geolocation & Radius Verification Card */}
        <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-[#E5E7EB]">
            <div className="w-10 h-10 rounded-xl bg-[#F3F4F6] text-[#111827] flex items-center justify-center">
              <MapPin className="w-5 h-5 text-[#F97316]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#111827]">Verifikasi Geofence GPS</h3>
              <p className="text-xs text-[#6B7280]">Radius maksimal 100 meter dari sekolah</p>
            </div>
          </div>

          <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl p-5 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-white border border-[#E5E7EB] flex items-center justify-center mx-auto text-[#9CA3AF]">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#111827]">Sensor Lokasi Siaga</p>
              <p className="text-xs text-[#6B7280] max-w-xs mx-auto mt-1">
                Pemeriksaan radius geofencing akan dihubungkan secara akurat pada implementasi Phase 2.
              </p>
            </div>
          </div>
        </div>

        {/* Biometric Face Verification Card */}
        <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-[#E5E7EB]">
            <div className="w-10 h-10 rounded-xl bg-[#F3F4F6] text-[#111827] flex items-center justify-center">
              <Camera className="w-5 h-5 text-[#F97316]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#111827]">Verifikasi Swafoto (Selfie)</h3>
              <p className="text-xs text-[#6B7280]">Deteksi wajah & anti-spoofing</p>
            </div>
          </div>

          <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl p-5 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-white border border-[#E5E7EB] flex items-center justify-center mx-auto text-[#9CA3AF]">
              <Camera className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#111827]">Modul Kamera Siaga</p>
              <p className="text-xs text-[#6B7280] max-w-xs mx-auto mt-1">
                Alur tangkapan foto swafoto dan pengunggahan ke Supabase Storage akan diaktifkan pada Phase 2.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Boundary / Architecture Information Notice */}
      <div className="p-4 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] flex items-start gap-3 text-xs text-[#6B7280]">
        <Info className="w-4 h-4 text-[#F97316] shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-[#111827]">Batasan Fase 1 Sesuai Spesifikasi:</span> Halaman
          ini sengaja belum mengaktifkan pelacakan geolokasi riil atau logika presensi database palsu.
          Struktur antarmuka telah siap untuk disambungkan ke API presensi Supabase pada Phase 2.
        </div>
      </div>
    </div>
  );
};
