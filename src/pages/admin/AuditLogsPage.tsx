import React from 'react';
import { ShieldAlert, History, Info } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export const AuditLogsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-5 sm:p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">
              Keamanan & Kepatuhan
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-[#111827] mt-0.5">
              Log Audit Aktivitas Sistem
            </h2>
            <p className="text-xs text-[#6B7280] mt-1">
              Jejak digital riwayat login, perubahan status presensi, dan persetujuan izin
            </p>
          </div>
          <div>
            <Button variant="outline" size="sm">
              Refresh Log
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-12 text-center shadow-2xs">
        <div className="w-14 h-14 rounded-2xl bg-[#F3F4F6] text-[#9CA3AF] flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h4 className="text-base font-bold text-[#111827]">Audit Trail Siap Digunakan</h4>
        <p className="text-xs text-[#6B7280] max-w-sm mx-auto mt-1.5">
          Tabel log keamanan akan mencatat setiap transaksi perubahan data setelah trigger database
          diimplementasikan di Phase 2.
        </p>
      </div>
    </div>
  );
};
