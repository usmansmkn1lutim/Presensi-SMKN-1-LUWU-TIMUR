import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export const NotificationsSettingsPage: React.FC = () => {
  const navigate = useNavigate();

  const [settings, setSettings] = useState({
    attendanceInfo: true,
    requestsApproval: true,
    schoolAnnouncements: true,
  });

  const toggleSwitch = (key: keyof typeof settings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-6 pb-12 font-sans max-w-2xl mx-auto">
      {/* Header Halaman & Tombol Kembali */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/account')}
          className="p-2 -ml-2 rounded-xl text-[#4B5563] dark:text-[#A3A3A3] hover:text-[#111827] dark:hover:text-[#F9FAFB] hover:bg-[#F3F4F6] dark:hover:bg-[#303030] transition-colors cursor-pointer"
          title="Kembali ke Akun Saya"
          aria-label="Kembali ke Akun Saya"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2]" />
        </button>
        <h1 className="text-xl sm:text-2xl font-bold text-[#111827] dark:text-[#F9FAFB] tracking-tight">
          Notifikasi
        </h1>
      </div>

      {/* Kartu Toggle Notifikasi */}
      <div className="bg-white dark:bg-[#262626] border border-[#E5E7EB] dark:border-[#404040] rounded-2xl shadow-xs overflow-hidden divide-y divide-[#F3F4F6] dark:divide-[#333333]">
        {/* 1. Informasi Presensi */}
        <div className="w-full flex items-center justify-between min-h-[56px] px-4 py-3.5 hover:bg-[#F9FAFB] dark:hover:bg-[#303030]/50 transition-colors">
          <span className="text-sm font-semibold text-[#111827] dark:text-[#F9FAFB]">
            Informasi Presensi
          </span>
          <button
            type="button"
            onClick={() => toggleSwitch('attendanceInfo')}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              settings.attendanceInfo ? 'bg-[#F97316]' : 'bg-[#D1D5DB] dark:bg-[#525252]'
            }`}
            role="switch"
            aria-checked={settings.attendanceInfo}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                settings.attendanceInfo ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* 2. Permintaan dan Persetujuan */}
        <div className="w-full flex items-center justify-between min-h-[56px] px-4 py-3.5 hover:bg-[#F9FAFB] dark:hover:bg-[#303030]/50 transition-colors">
          <span className="text-sm font-semibold text-[#111827] dark:text-[#F9FAFB]">
            Permintaan dan Persetujuan
          </span>
          <button
            type="button"
            onClick={() => toggleSwitch('requestsApproval')}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              settings.requestsApproval ? 'bg-[#F97316]' : 'bg-[#D1D5DB] dark:bg-[#525252]'
            }`}
            role="switch"
            aria-checked={settings.requestsApproval}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                settings.requestsApproval ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* 3. Pengumuman Sekolah */}
        <div className="w-full flex items-center justify-between min-h-[56px] px-4 py-3.5 hover:bg-[#F9FAFB] dark:hover:bg-[#303030]/50 transition-colors">
          <span className="text-sm font-semibold text-[#111827] dark:text-[#F9FAFB]">
            Pengumuman Sekolah
          </span>
          <button
            type="button"
            onClick={() => toggleSwitch('schoolAnnouncements')}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              settings.schoolAnnouncements ? 'bg-[#F97316]' : 'bg-[#D1D5DB] dark:bg-[#525252]'
            }`}
            role="switch"
            aria-checked={settings.schoolAnnouncements}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                settings.schoolAnnouncements ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
};
