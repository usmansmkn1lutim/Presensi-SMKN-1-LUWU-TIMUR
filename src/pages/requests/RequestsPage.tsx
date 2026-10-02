import React, { useState } from 'react';
import { FileText, Plus, Clock, CheckCircle2, XCircle, Info } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export const RequestsPage: React.FC = () => {
  const [filterTab, setFilterTab] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-5 sm:p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">
              Dispensasi & Cuti
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-[#111827] mt-0.5">
              Pengajuan Izin, Sakit & Dinas Luar
            </h2>
            <p className="text-xs text-[#6B7280] mt-1">
              Daftar pengajuan izin dan permohonan ketidakhadiran resmi pegawai
            </p>
          </div>

          <div>
            <Button
              variant="primary"
              size="md"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => alert('Formulir pengajuan izin dengan unggah bukti surat dokter/dinas akan dibuka pada Phase 2.')}
            >
              Buat Pengajuan Baru
            </Button>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 p-1 bg-[#F3F4F6] rounded-xl w-fit">
        <button
          onClick={() => setFilterTab('all')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            filterTab === 'all'
              ? 'bg-white text-[#111827] shadow-2xs'
              : 'text-[#6B7280] hover:text-[#111827]'
          }`}
        >
          Semua Pengajuan
        </button>
        <button
          onClick={() => setFilterTab('pending')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            filterTab === 'pending'
              ? 'bg-white text-[#111827] shadow-2xs'
              : 'text-[#6B7280] hover:text-[#111827]'
          }`}
        >
          Menunggu Verifikasi
        </button>
        <button
          onClick={() => setFilterTab('approved')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            filterTab === 'approved'
              ? 'bg-white text-[#111827] shadow-2xs'
              : 'text-[#6B7280] hover:text-[#111827]'
          }`}
        >
          Disetujui
        </button>
      </div>

      {/* Empty State */}
      <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-12 text-center shadow-2xs">
        <div className="w-14 h-14 rounded-2xl bg-[#F3F4F6] text-[#9CA3AF] flex items-center justify-center mx-auto mb-4">
          <FileText className="w-7 h-7" />
        </div>
        <h4 className="text-base font-bold text-[#111827]">Belum Ada Pengajuan</h4>
        <p className="text-xs text-[#6B7280] max-w-sm mx-auto mt-1.5">
          Form pengajuan surat izin, dispensasi tugas luar, dan lampiran berkas PDF/foto akan aktif
          secara terintegrasi di Phase 2.
        </p>
      </div>

      <div className="p-4 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] flex items-start gap-3 text-xs text-[#6B7280]">
        <Info className="w-4 h-4 text-[#F97316] shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-[#111827]">Alur Pengajuan:</span> Pegawai mengajukan
          izin → Verifikator memeriksa bukti fisik/lampiran → Kepala Sekolah memberikan persetujuan
          akhir.
        </div>
      </div>
    </div>
  );
};
