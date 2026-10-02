import React from 'react';
import { Bell, CheckCircle, Info } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export const NotificationsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-5 sm:p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">
              Pusat Pesan
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-[#111827] mt-0.5">
              Notifikasi & Pengumuman
            </h2>
            <p className="text-xs text-[#6B7280] mt-1">
              Pemberitahuan presensi harian, status izin, dan pengumuman sekolah
            </p>
          </div>
          <div>
            <Button variant="outline" size="sm">
              Tandai Semua Telah Dibaca
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-12 text-center shadow-2xs">
        <div className="w-14 h-14 rounded-2xl bg-[#F3F4F6] text-[#9CA3AF] flex items-center justify-center mx-auto mb-4">
          <Bell className="w-7 h-7" />
        </div>
        <h4 className="text-base font-bold text-[#111827]">Tidak Ada Notifikasi Baru</h4>
        <p className="text-xs text-[#6B7280] max-w-sm mx-auto mt-1.5">
          Semua pengumuman dan pemberitahuan persetujuan izin akan ditampilkan di sini.
        </p>
      </div>
    </div>
  );
};
