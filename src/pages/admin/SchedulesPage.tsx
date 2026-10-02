import React from 'react';
import { Clock, Plus, Info } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export const SchedulesPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-5 sm:p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">
              Pengaturan Waktu
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-[#111827] mt-0.5">
              Jadwal Kerja & Jam Masuk
            </h2>
            <p className="text-xs text-[#6B7280] mt-1">
              Konfigurasi jam masuk, toleransi keterlambatan, dan jam pulang pegawai
            </p>
          </div>
          <div>
            <Button variant="primary" size="md" leftIcon={<Plus className="w-4 h-4" />}>
              Tambah Pola Jadwal
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#111827]">Jadwal Reguler (Senin - Kamis)</h3>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
              Aktif
            </span>
          </div>
          <div className="text-xs text-[#6B7280] space-y-1.5 font-mono">
            <p>Jam Presensi Masuk : 06:45 - 07:30 WITA</p>
            <p>Toleransi Terlambat : 07:31 - 08:00 WITA</p>
            <p>Jam Presensi Pulang : 15:30 - 17:00 WITA</p>
          </div>
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#111827]">Jadwal Khusus (Jumat)</h3>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
              Aktif
            </span>
          </div>
          <div className="text-xs text-[#6B7280] space-y-1.5 font-mono">
            <p>Jam Presensi Masuk : 06:45 - 07:30 WITA</p>
            <p>Toleransi Terlambat : 07:31 - 07:45 WITA</p>
            <p>Jam Presensi Pulang : 11:30 - 14:00 WITA</p>
          </div>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] flex items-start gap-3 text-xs text-[#6B7280]">
        <Info className="w-4 h-4 text-[#F97316] shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-[#111827]">Pengembangan Jadwal (Phase 2):</span> Pola
          shift guru piket, jadwal semester genap/ganjil, dan pengecualian perorangan akan disimpan di
          skema database Supabase.
        </div>
      </div>
    </div>
  );
};
