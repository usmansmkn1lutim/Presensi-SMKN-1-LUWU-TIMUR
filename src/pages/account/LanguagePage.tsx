import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';

export const LanguagePage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedLang, setSelectedLang] = useState<'id' | 'en'>('id');

  return (
    <div className="space-y-6 pb-12 font-sans max-w-2xl mx-auto">
      {/* Header Halaman & Tombol Kembali */}
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
          Bahasa
        </h1>
      </div>

      {/* Kartu Pilihan Bahasa */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-xs overflow-hidden divide-y divide-[#F3F4F6]">
        {/* Bahasa Indonesia */}
        <button
          type="button"
          onClick={() => setSelectedLang('id')}
          className="w-full flex items-center justify-between min-h-[56px] px-4 py-3.5 text-left hover:bg-[#F9FAFB] active:bg-[#F3F4F6] transition-colors cursor-pointer"
        >
          <span className="text-sm font-semibold text-[#111827]">
            Bahasa Indonesia
          </span>
          <div
            className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
              selectedLang === 'id'
                ? 'border-[#F97316] bg-[#F97316] text-white'
                : 'border-[#D1D5DB] bg-white'
            }`}
          >
            {selectedLang === 'id' && <Check className="w-3 h-3 stroke-[3]" />}
          </div>
        </button>

        {/* English */}
        <button
          type="button"
          onClick={() => setSelectedLang('en')}
          className="w-full flex items-center justify-between min-h-[56px] px-4 py-3.5 text-left hover:bg-[#F9FAFB] active:bg-[#F3F4F6] transition-colors cursor-pointer"
        >
          <span className="text-sm font-semibold text-[#111827]">
            English
          </span>
          <div
            className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
              selectedLang === 'en'
                ? 'border-[#F97316] bg-[#F97316] text-white'
                : 'border-[#D1D5DB] bg-white'
            }`}
          >
            {selectedLang === 'en' && <Check className="w-3 h-3 stroke-[3]" />}
          </div>
        </button>
      </div>
    </div>
  );
};
