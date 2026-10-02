import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock,
  QrCode,
  CalendarCheck,
  FileText,
  AlertCircle,
  LogIn,
  LogOut,
  ChevronRight,
  ShieldCheck,
  Info,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { RoleBadge } from '../../components/ui/Badge';
import { APP_CONFIG } from '../../config/appConfig';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Current real-time clock
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDateFormatted, setCurrentDateFormatted] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // Indonesian date formatting
      const dateStr = new Intl.DateTimeFormat('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(now);

      const timeStr = now.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      setCurrentDateFormatted(dateStr);
      setCurrentTime(timeStr);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      {/* Welcome Banner Card (White Surface with subtle border) */}
      <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-5 sm:p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-[#6B7280]">
                {APP_CONFIG.schoolName}
              </span>
              <span className="text-[#D1D5DB]">·</span>
              {user && <RoleBadge role={user.role} size="sm" />}
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#111827]">
              Selamat datang, {user?.name || 'Pegawai'}
            </h2>
            <p className="text-xs sm:text-sm text-[#6B7280] mt-0.5">
              {currentDateFormatted || 'Memuat tanggal...'}
            </p>
          </div>

          {/* Real-time Clock display */}
          <div className="flex items-center gap-3 bg-[#F9FAFB] border border-[#E5E7EB] px-4 py-3 rounded-xl self-start sm:self-auto">
            <Clock className="w-5 h-5 text-[#F97316]" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
                Waktu Sistem (WITA)
              </p>
              <p className="text-lg font-bold text-[#111827] tabular-nums font-mono">
                {currentTime || '--:--:--'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Today's Attendance Action Section (Secondary Surface #F3F4F6) */}
      <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl p-5 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#E5E7EB]">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">
              Status Presensi Hari Ini
            </span>
            <div className="flex items-center gap-2.5 mt-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
              <h3 className="text-base sm:text-lg font-bold text-[#111827]">
                Belum melakukan presensi
              </h3>
            </div>
            <p className="text-xs text-[#6B7280] mt-1">
              Jadwal Reguler: Masuk 07:00 - 07:30 WITA · Pulang 15:30 - 17:00 WITA
            </p>
          </div>

          {/* Primary Action Button (Sunset Orange) */}
          <div className="shrink-0">
            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate('/attendance')}
              leftIcon={<QrCode className="w-5 h-5" />}
              className="w-full md:w-auto font-bold tracking-wide"
            >
              PRESENSI SEKARANG
            </Button>
          </div>
        </div>

        {/* Check In & Check Out Card Grids */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
          {/* Check In Box */}
          <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#F97316] flex items-center justify-center">
                <LogIn className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-[#6B7280]">Presensi Masuk</p>
                <p className="text-sm font-bold text-[#111827]">Belum Tercatat</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-mono font-medium text-[#9CA3AF]">— : —</span>
              <p className="text-[10px] text-[#9CA3AF]">WITA</p>
            </div>
          </div>

          {/* Check Out Box */}
          <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gray-100 text-[#4B5563] flex items-center justify-center">
                <LogOut className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-[#6B7280]">Presensi Pulang</p>
                <p className="text-sm font-bold text-[#111827]">Belum Tercatat</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-mono font-medium text-[#9CA3AF]">— : —</span>
              <p className="text-[10px] text-[#9CA3AF]">WITA</p>
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Summary Grid (Zero Fake Data - Clean Placeholders) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-[#111827] uppercase tracking-wider">
            Ringkasan Kehadiran Bulan Ini
          </h3>
          <span className="text-xs text-[#9CA3AF]">Periode Aktif</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-xl p-4 text-center">
            <span className="text-xs font-medium text-[#6B7280]">Hadir Tepat Waktu</span>
            <p className="text-2xl font-bold text-[#111827] mt-1 tabular-nums">—</p>
            <span className="text-[11px] text-[#9CA3AF]">hari</span>
          </div>

          <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-xl p-4 text-center">
            <span className="text-xs font-medium text-[#6B7280]">Terlambat</span>
            <p className="text-2xl font-bold text-[#111827] mt-1 tabular-nums">—</p>
            <span className="text-[11px] text-[#9CA3AF]">kali</span>
          </div>

          <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-xl p-4 text-center">
            <span className="text-xs font-medium text-[#6B7280]">Izin / Sakit / Dinas</span>
            <p className="text-2xl font-bold text-[#111827] mt-1 tabular-nums">—</p>
            <span className="text-[11px] text-[#9CA3AF]">hari</span>
          </div>

          <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-xl p-4 text-center">
            <span className="text-xs font-medium text-[#6B7280]">Tanpa Keterangan</span>
            <p className="text-2xl font-bold text-[#111827] mt-1 tabular-nums">—</p>
            <span className="text-[11px] text-[#9CA3AF]">hari</span>
          </div>
        </div>
      </div>

      {/* Quick Action Navigation Cards */}
      <div>
        <h3 className="text-sm font-bold text-[#111827] uppercase tracking-wider mb-3">
          Aksi Cepat
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => navigate('/requests')}
            className="p-4 rounded-xl bg-white border border-[#E5E7EB] hover:border-orange-300 hover:bg-[#FFF7ED]/30 text-left transition-all flex items-center justify-between group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-orange-50 text-[#F97316] flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#111827] group-hover:text-[#F97316] transition-colors">
                  Ajukan Izin / Cuti
                </p>
                <p className="text-xs text-[#6B7280]">Form permohonan dinas & sakit</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#9CA3AF] group-hover:text-[#F97316] transition-colors" />
          </button>

          <button
            onClick={() => navigate('/history')}
            className="p-4 rounded-xl bg-white border border-[#E5E7EB] hover:border-orange-300 hover:bg-[#FFF7ED]/30 text-left transition-all flex items-center justify-between group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-orange-50 text-[#F97316] flex items-center justify-center">
                <CalendarCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#111827] group-hover:text-[#F97316] transition-colors">
                  Riwayat Presensi
                </p>
                <p className="text-xs text-[#6B7280]">Cek log rekap presensi</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#9CA3AF] group-hover:text-[#F97316] transition-colors" />
          </button>

          <button
            onClick={() => navigate('/profile')}
            className="p-4 rounded-xl bg-white border border-[#E5E7EB] hover:border-orange-300 hover:bg-[#FFF7ED]/30 text-left transition-all flex items-center justify-between group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-orange-50 text-[#F97316] flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#111827] group-hover:text-[#F97316] transition-colors">
                  Kelengkapan Profil
                </p>
                <p className="text-xs text-[#6B7280]">Cek data NIP & akun</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#9CA3AF] group-hover:text-[#F97316] transition-colors" />
          </button>
        </div>
      </div>

      {/* Phase 1 Technical Boundary Notice (Clean & Unobtrusive) */}
      <div className="p-4 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] flex items-start gap-3 text-xs text-[#6B7280]">
        <Info className="w-4 h-4 text-[#F97316] shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-[#111827]">Informasi Pengembangan Fase 1:</span> Data
          ringkasan kehadiran di atas merupakan placeholder fondasi aplikasi. Integrasi database
          Supabase, GPS Geofencing, dan deteksi kamera wajah akan dihubungkan secara penuh pada Fase
          2 & 3.
        </div>
      </div>
    </div>
  );
};
