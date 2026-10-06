import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock,
  MapPin,
  CalendarCheck,
  FileText,
  LogIn,
  LogOut,
  ChevronRight,
  ShieldCheck,
  Info,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  dashboardAttendanceService,
  DashboardAttendanceSummary,
} from '../../services/dashboardAttendanceService';
import { Button } from '../../components/ui/Button';

export const DashboardPage: React.FC = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  // Current real-time clock & formatted date
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDateFormatted, setCurrentDateFormatted] = useState<string>('');

  // Dashboard monthly summary state
  const [summary, setSummary] = useState<DashboardAttendanceSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState<boolean>(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const fetchSummaryData = async () => {
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const res = await dashboardAttendanceService.getMonthlySummary();
      setSummary(res);
    } catch (err: any) {
      console.error('Failed to load dashboard monthly summary:', err);
      setSummaryError(err?.message || 'Gagal memuat ringkasan kehadiran bulan ini.');
    } finally {
      setSummaryLoading(false);
    }
  };

  useEffect(() => {
    fetchSummaryData();
  }, []);

  // Real-time time & Indonesian date formatting (DDDD, D MMMM YYYY without "Hari ini")
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // Format: DDDD(Hari), D(Tanggal) MMMM(Bulan) YYYY(Tahun)
      const dayName = new Intl.DateTimeFormat('id-ID', { weekday: 'long' }).format(now);
      const dateNum = now.getDate();
      const monthName = new Intl.DateTimeFormat('id-ID', { month: 'long' }).format(now);
      const yearNum = now.getFullYear();

      setCurrentDateFormatted(`${dayName}, ${dateNum} ${monthName} ${yearNum}`);

      const timeStr = now.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      setCurrentTime(timeStr);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const fullName = profile?.full_name || user?.name || 'Pegawai';

  return (
    <div className="space-y-5 pb-8">
      {/* Card Paling Atas (Sunset Orange Background + Geometric Minimalist Pattern) */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#FB923C] via-[#F97316] to-[#EA580C] text-white rounded-2xl p-4 sm:p-5 md:p-6 shadow-md space-y-3 sm:space-y-3.5">
        {/* Geometric Minimalist Background Pattern */}
        <div className="absolute inset-0 opacity-12 pointer-events-none overflow-hidden rounded-2xl">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
            <defs>
              <pattern id="geometric-pattern" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M0 20 L20 0 L40 20 L20 40 Z" fill="none" stroke="currentColor" strokeWidth="1" />
                <circle cx="20" cy="20" r="2" fill="currentColor" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#geometric-pattern)" className="text-white" />
          </svg>
        </div>

        {/* Baris Pertama: Nama Lengkap User dengan font lebih besar 2px (+2px) */}
        <div className="min-w-0 relative z-10">
          <h1 className="text-[22px] sm:text-[26px] md:text-[32px] font-extrabold text-white tracking-tight truncate drop-shadow-2xs">
            {fullName}
          </h1>
        </div>

        {/* Baris Kedua: Posisi "Guru Mata Pelajaran" */}
        <div className="-mt-1 relative z-10">
          <p className="text-sm sm:text-base font-medium text-orange-100/95 tracking-wide truncate">
            Guru Mata Pelajaran
          </p>
        </div>

        {/* Baris Ketiga: 2 Kolom (Kiri: Tanggal, Kanan: Info Lokasi Malili, Luwu Timur) */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/20 text-xs sm:text-sm relative z-10">
          {/* Kolom Pertama (Rata Kiri) */}
          <div className="text-left font-medium text-orange-100 truncate">
            {currentDateFormatted || 'Memuat tanggal...'}
          </div>

          {/* Kolom Kedua (Rata Kanan: Info Lokasi Malili, Luwu Timur) */}
          <div className="text-right flex items-center justify-end gap-1.5 shrink-0 font-semibold text-white">
            <MapPin className="w-3.5 h-3.5 text-white shrink-0" />
            <span>Malili, Luwu Timur</span>
          </div>
        </div>

        {/* Baris Keempat: 2 Card Putih Persegi Panjang Horizontal (Tombol Check-in & Check-out) */}
        <div className="grid grid-cols-2 gap-3 pt-1.5 relative z-10">
          {/* Card Kiri: Tombol Check-in (2 Baris: Check-in & 07.30 WITA) */}
          <button
            type="button"
            onClick={() => navigate('/attendance?type=in')}
            className="group bg-white hover:bg-orange-50/80 active:scale-[0.98] transition-all rounded-xl sm:rounded-2xl px-3 sm:px-4 py-3 sm:py-3.5 flex items-center gap-2.5 sm:gap-3 shadow-xs text-[#111827] cursor-pointer min-h-[62px]"
          >
            <div className="w-9 h-9 rounded-lg bg-orange-50 text-[#F97316] flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
              <LogIn className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div className="text-left min-w-0 flex-1">
              <p className="font-bold text-sm sm:text-base text-[#111827] leading-tight tracking-tight truncate">
                Check-in
              </p>
              <p className="text-[11px] sm:text-xs font-semibold text-[#6B7280] leading-tight mt-0.5 truncate tabular-nums">
                07.30 WITA
              </p>
            </div>
          </button>

          {/* Card Kanan: Tombol Check-out (2 Baris: Check-out & 15.00 WITA) */}
          <button
            type="button"
            onClick={() => navigate('/attendance?type=out')}
            className="group bg-white hover:bg-red-50/80 active:scale-[0.98] transition-all rounded-xl sm:rounded-2xl px-3 sm:px-4 py-3 sm:py-3.5 flex items-center gap-2.5 sm:gap-3 shadow-xs text-[#111827] cursor-pointer min-h-[62px]"
          >
            <div className="w-9 h-9 rounded-lg bg-red-50 text-[#EF4444] flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
              <LogOut className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div className="text-left min-w-0 flex-1">
              <p className="font-bold text-sm sm:text-base text-[#111827] leading-tight tracking-tight truncate">
                Check-out
              </p>
              <p className="text-[11px] sm:text-xs font-semibold text-[#6B7280] leading-tight mt-0.5 truncate tabular-nums">
                15.00 WITA
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Ringkasan Kehadiran Bulan Ini */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs sm:text-sm font-bold text-[#111827] uppercase tracking-wider">
            Ringkasan Kehadiran Bulan Ini
          </h3>
          <span className="text-xs text-[#9CA3AF]">Periode Aktif</span>
        </div>

        {summaryError ? (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-800 flex items-center justify-between gap-3 text-xs sm:text-sm">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              <span>{summaryError}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchSummaryData}
              className="text-xs shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              Coba Lagi
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {/* Hadir Tepat Waktu */}
            <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-xl p-3.5 sm:p-4 text-center shadow-2xs">
              <span className="text-xs font-medium text-[#6B7280]">Hadir Tepat Waktu</span>
              <p className="text-xl sm:text-2xl font-bold text-[#111827] mt-1 tabular-nums">
                {summaryLoading ? (
                  <span className="animate-pulse inline-block w-8 h-6 bg-[#E5E7EB] rounded-md" />
                ) : (
                  summary?.onTimeCount ?? 0
                )}
              </p>
              <span className="text-[11px] text-[#9CA3AF]">hari</span>
            </div>

            {/* Terlambat */}
            <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-xl p-3.5 sm:p-4 text-center shadow-2xs">
              <span className="text-xs font-medium text-[#6B7280]">Terlambat</span>
              <p className="text-xl sm:text-2xl font-bold text-[#111827] mt-1 tabular-nums">
                {summaryLoading ? (
                  <span className="animate-pulse inline-block w-8 h-6 bg-[#E5E7EB] rounded-md" />
                ) : (
                  summary?.lateCount ?? 0
                )}
              </p>
              <span className="text-[11px] text-[#9CA3AF]">kali</span>
            </div>

            {/* Izin / Sakit / Dinas */}
            <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-xl p-3.5 sm:p-4 text-center shadow-2xs">
              <span className="text-xs font-medium text-[#6B7280]">Izin / Sakit / Dinas</span>
              <p className="text-xl sm:text-2xl font-bold text-[#111827] mt-1 tabular-nums">
                {summaryLoading ? (
                  <span className="animate-pulse inline-block w-8 h-6 bg-[#E5E7EB] rounded-md" />
                ) : (
                  summary?.approvedRequestDays ?? 0
                )}
              </p>
              <span className="text-[11px] text-[#9CA3AF]">hari</span>
            </div>

            {/* Tanpa Keterangan */}
            <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-xl p-3.5 sm:p-4 text-center shadow-2xs">
              <span className="text-xs font-medium text-[#6B7280]">Tanpa Keterangan</span>
              <p className="text-xl sm:text-2xl font-bold text-[#111827] mt-1 tabular-nums">
                {summaryLoading ? (
                  <span className="animate-pulse inline-block w-8 h-6 bg-[#E5E7EB] rounded-md" />
                ) : (
                  summary?.absentCount ?? 0
                )}
              </p>
              <span className="text-[11px] text-[#9CA3AF]">hari</span>
            </div>
          </div>
        )}
      </div>

      {/* Quick Action Navigation Cards */}
      <div>
        <h3 className="text-xs sm:text-sm font-bold text-[#111827] uppercase tracking-wider mb-3">
          Aksi Cepat
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => navigate('/requests')}
            className="p-3.5 sm:p-4 rounded-xl bg-white border border-[#E5E7EB] hover:border-orange-300 hover:bg-[#FFF7ED]/30 text-left transition-all flex items-center justify-between group cursor-pointer shadow-2xs"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-orange-50 text-[#F97316] flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#111827] group-hover:text-[#F97316] transition-colors truncate">
                  Ajukan Izin / Cuti
                </p>
                <p className="text-xs text-[#6B7280] truncate">Form permohonan dinas & sakit</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#9CA3AF] group-hover:text-[#F97316] transition-colors shrink-0 ml-2" />
          </button>

          <button
            onClick={() => navigate('/history')}
            className="p-3.5 sm:p-4 rounded-xl bg-white border border-[#E5E7EB] hover:border-orange-300 hover:bg-[#FFF7ED]/30 text-left transition-all flex items-center justify-between group cursor-pointer shadow-2xs"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-orange-50 text-[#F97316] flex items-center justify-center shrink-0">
                <CalendarCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#111827] group-hover:text-[#F97316] transition-colors truncate">
                  Riwayat Presensi
                </p>
                <p className="text-xs text-[#6B7280] truncate">Cek log rekap presensi</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#9CA3AF] group-hover:text-[#F97316] transition-colors shrink-0 ml-2" />
          </button>

          <button
            onClick={() => navigate('/profile')}
            className="p-3.5 sm:p-4 rounded-xl bg-white border border-[#E5E7EB] hover:border-orange-300 hover:bg-[#FFF7ED]/30 text-left transition-all flex items-center justify-between group cursor-pointer shadow-2xs"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-orange-50 text-[#F97316] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#111827] group-hover:text-[#F97316] transition-colors truncate">
                  Kelengkapan Profil
                </p>
                <p className="text-xs text-[#6B7280] truncate">Cek data NIP & akun</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#9CA3AF] group-hover:text-[#F97316] transition-colors shrink-0 ml-2" />
          </button>
        </div>
      </div>

      {/* Information Note */}
      <div className="p-3.5 sm:p-4 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] flex items-start gap-3 text-xs text-[#6B7280]">
        <Info className="w-4 h-4 text-[#F97316] shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-[#111827]">Waktu Sistem Aktual:</span> Jam operasional presensi mengikuti zona waktu Indonesia Tengah (WITA). Saat ini: <span className="font-mono font-bold text-[#111827]">{currentTime || '--:--:--'} WITA</span>.
        </div>
      </div>
    </div>
  );
};
