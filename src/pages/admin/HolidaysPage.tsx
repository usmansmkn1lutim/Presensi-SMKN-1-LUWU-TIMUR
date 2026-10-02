import React from 'react';
import { CalendarOff, Plus } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export const HolidaysPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-5 sm:p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">
              Kalender Sekolah
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-[#111827] mt-0.5">
              Hari Libur & Cuti Bersama
            </h2>
            <p className="text-xs text-[#6B7280] mt-1">
              Daftar tanggal libur nasional, libur semester, dan perayaan khusus sekolah
            </p>
          </div>
          <div>
            <Button variant="primary" size="md" leftIcon={<Plus className="w-4 h-4" />}>
              Tambah Hari Libur
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-12 text-center shadow-2xs">
        <div className="w-14 h-14 rounded-2xl bg-[#F3F4F6] text-[#9CA3AF] flex items-center justify-center mx-auto mb-4">
          <CalendarOff className="w-7 h-7" />
        </div>
        <h4 className="text-base font-bold text-[#111827]">Kalender Libur Tersedia di Phase 2</h4>
        <p className="text-xs text-[#6B7280] max-w-sm mx-auto mt-1.5">
          Sinkronisasi kalender libur otomatis nasional dan kalender akademik sekolah akan diaktifkan
          setelah database siap.
        </p>
      </div>
    </div>
  );
};
