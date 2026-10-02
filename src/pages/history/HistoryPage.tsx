import React, { useState } from 'react';
import { CalendarCheck, Filter, Download, Info } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export const HistoryPage: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState('10-2026');

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-5 sm:p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">
              Log Presensi
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-[#111827] mt-0.5">
              Riwayat Kehadiran Pribadi
            </h2>
            <p className="text-xs text-[#6B7280] mt-1">
              Catatan jam masuk, pulang, status terlambat, dan dispensasi
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="h-10 px-3 text-xs bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl text-[#374151] focus:outline-none focus:border-[#F97316]"
            >
              <option value="10-2026">Oktober 2026</option>
              <option value="09-2026">September 2026</option>
              <option value="08-2026">Agustus 2026</option>
            </select>

            <Button variant="outline" size="sm" leftIcon={<Download className="w-4 h-4" />}>
              Unduh Rekap
            </Button>
          </div>
        </div>
      </div>

      {/* Empty State Table */}
      <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl overflow-hidden shadow-2xs">
        <div className="px-5 py-4 border-b border-[#E5E7EB] bg-[#F9FAFB]">
          <h3 className="text-xs font-bold text-[#111827] uppercase tracking-wider">
            Daftar Catatan Harian
          </h3>
        </div>

        <div className="py-16 px-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#F3F4F6] text-[#9CA3AF] flex items-center justify-center mx-auto mb-4">
            <CalendarCheck className="w-7 h-7" />
          </div>
          <h4 className="text-base font-bold text-[#111827]">Belum Ada Riwayat Presensi</h4>
          <p className="text-xs text-[#6B7280] max-w-sm mx-auto mt-1.5">
            Log presensi riil akan dicatat dan disinkronkan langsung dari tabel kehadiran Supabase
            pada Phase 2.
          </p>
        </div>
      </div>

      {/* Development note */}
      <div className="p-4 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] flex items-start gap-3 text-xs text-[#6B7280]">
        <Info className="w-4 h-4 text-[#F97316] shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-[#111827]">Prinsip Fase 1:</span> Sesuai instruksi,
          aplikasi tidak membuat data kehadiran palsu yang seolah-olah berasal dari database.
        </div>
      </div>
    </div>
  );
};
