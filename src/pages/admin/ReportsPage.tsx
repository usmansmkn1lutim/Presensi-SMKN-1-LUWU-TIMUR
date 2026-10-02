import React, { useState } from 'react';
import { BarChart3, Download, FileSpreadsheet, Filter } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export const ReportsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-5 sm:p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">
              Rekapitulasi Kehadiran
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-[#111827] mt-0.5">
              Rekap & Laporan Presensi
            </h2>
            <p className="text-xs text-[#6B7280] mt-1">
              Unduh rekapitulasi kehadiran bulanan pegawai dalam format PDF dan Excel
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="md"
              leftIcon={<FileSpreadsheet className="w-4 h-4" />}
              onClick={() => alert('Modul ekspor laporan akan terhubung pada Phase 2.')}
            >
              Ekspor Excel (XLSX)
            </Button>
            <Button
              variant="primary"
              size="md"
              leftIcon={<Download className="w-4 h-4" />}
              onClick={() => alert('Modul ekspor laporan akan terhubung pada Phase 2.')}
            >
              Cetak PDF
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-12 text-center shadow-2xs">
        <div className="w-14 h-14 rounded-2xl bg-[#F3F4F6] text-[#9CA3AF] flex items-center justify-center mx-auto mb-4">
          <BarChart3 className="w-7 h-7" />
        </div>
        <h4 className="text-base font-bold text-[#111827]">Siap Untuk Pengolahan Rekap</h4>
        <p className="text-xs text-[#6B7280] max-w-sm mx-auto mt-1.5">
          Agregasi kalkulasi persentase kehadiran, pemotongan tunjangan kinerja, dan akumulasi menit
          keterlambatan akan aktif pada Phase 2.
        </p>
      </div>
    </div>
  );
};
