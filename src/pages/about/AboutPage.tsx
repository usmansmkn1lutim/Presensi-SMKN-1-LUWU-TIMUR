import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export const AboutPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 pb-12 font-sans max-w-2xl mx-auto">
      {/* Header Halaman & Tombol Kembali ke /account */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/account')}
          className="p-2 -ml-2 rounded-xl text-[#4B5563] hover:text-[#111827] hover:bg-[#F3F4F6] transition-colors cursor-pointer"
          title="Kembali ke Akun Saya"
          aria-label="Kembali ke Akun Saya"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2]" />
        </button>
        <h1 className="text-xl sm:text-2xl font-bold text-[#111827] tracking-tight">
          Tentang Tamaki
        </h1>
      </div>

      {/* Kartu Informasi Tunggal Berisi Deskripsi Resmi yang Disetujui */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 sm:p-6 shadow-xs">
        <p className="text-sm sm:text-base text-[#374151] leading-relaxed">
          Tamaki adalah aplikasi presensi digital yang mendukung pencatatan dan pemantauan kehadiran guru dan tenaga kependidikan.
        </p>
      </div>
    </div>
  );
};
