import React, { useEffect, useState } from 'react';
import {
  AttendanceDetailData,
  attendanceDetailService,
} from '../../services/attendanceDetailService';
import {
  X,
  User,
  Calendar,
  Clock,
  MapPin,
  FileText,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  Building2,
  Briefcase,
  LogOut,
} from 'lucide-react';
import { Button } from '../ui/Button';

interface AttendanceDetailDrawerModalProps {
  employeeId: string | null;
  employeeName?: string;
  initialDate: string; // YYYY-MM-DD
  startDate?: string;
  endDate?: string;
  onClose: () => void;
}

export const AttendanceDetailDrawerModal: React.FC<AttendanceDetailDrawerModalProps> = ({
  employeeId,
  employeeName,
  initialDate,
  onClose,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(initialDate);
  const [detail, setDetail] = useState<AttendanceDetailData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setSelectedDate(initialDate);
  }, [initialDate]);

  useEffect(() => {
    if (!employeeId || !selectedDate) return;

    const fetchDetail = async () => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const data = await attendanceDetailService.getAttendanceDetail(
          employeeId,
          selectedDate
        );
        setDetail(data);
      } catch (err: any) {
        console.error('Gagal memuat detail presensi:', err);
        setErrorMsg(err?.message || 'Gagal memuat detail presensi pegawai.');
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [employeeId, selectedDate]);

  if (!employeeId) return null;

  const formatDateLong = (dateStr: string) => {
    try {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
      <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl space-y-5 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFF7ED] text-[#F97316] flex items-center justify-center shrink-0 border border-[#FFEDD5]">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#111827]">
                Detail Presensi Pegawai
              </h3>
              <p className="text-xs text-[#6B7280]">
                Informasi rincian kehadiran (Read-Only)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-[#F3F4F6] hover:bg-[#E5E7EB] text-[#6B7280] hover:text-[#111827] flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Tutup Detail Presensi"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {loading ? (
            <div className="p-8 text-center space-y-2 animate-pulse">
              <RefreshCw className="w-6 h-6 text-[#F97316] animate-spin mx-auto" />
              <p className="text-xs text-[#6B7280]">Memuat rincian detail presensi...</p>
            </div>
          ) : errorMsg ? (
            <div className="p-6 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-2 text-center">
              <AlertCircle className="w-5 h-5 text-rose-600 mx-auto" />
              <p>{errorMsg}</p>
            </div>
          ) : detail ? (
            <>
              {/* Employee Info Card */}
              <div className="p-4 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-[#111827]">
                    {detail.employee.fullName}
                  </span>
                  {/* Overall Status Badge */}
                  {detail.overallStatus === 'sudah_pulang' ? (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Sudah Pulang
                    </span>
                  ) : detail.overallStatus === 'sudah_masuk' ? (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      Sudah Masuk
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                      <X className="w-3.5 h-3.5" />
                      Belum Presensi
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[#6B7280] pt-1 border-t border-[#E5E7EB]">
                  <div>
                    <span className="text-[10px] block font-medium">NIP</span>
                    <span className="font-semibold text-[#111827]">
                      {detail.employee.nip || '-'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] block font-medium flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-[#9CA3AF]" />
                      Departemen
                    </span>
                    <span className="font-semibold text-[#111827]">
                      {detail.employee.departmentName}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] block font-medium flex items-center gap-1">
                      <Briefcase className="w-3 h-3 text-[#9CA3AF]" />
                      Jabatan
                    </span>
                    <span className="font-semibold text-[#111827]">
                      {detail.employee.positionName}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tanggal Field with Selector */}
              <div className="p-3 rounded-xl bg-white border border-[#E5E7EB] flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#F97316]" />
                  <span className="font-bold text-[#111827]">
                    {formatDateLong(selectedDate)}
                  </span>
                </div>

                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-2 py-1 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg text-[11px] text-[#111827] focus:outline-none focus:border-[#F97316] font-medium cursor-pointer"
                />
              </div>

              {/* Check-In and Check-Out Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* CHECK-IN CARD */}
                <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200/80 space-y-2.5">
                  <div className="flex items-center justify-between pb-2 border-b border-emerald-200/60">
                    <span className="font-bold text-emerald-900 flex items-center gap-1.5 uppercase text-[11px] tracking-wider">
                      <Clock className="w-4 h-4 text-emerald-600" />
                      Check-In
                    </span>
                    {detail.checkIn.status === 'on_time' ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        Tepat Waktu
                      </span>
                    ) : detail.checkIn.status === 'late' ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                        Terlambat
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                        Belum Presensi
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-[10px] text-emerald-800/80 block font-medium">Waktu Masuk</span>
                    <span className="text-xl font-extrabold text-emerald-950 block">
                      {detail.checkIn.timeFormatted}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-emerald-800/80 block font-medium flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-emerald-600" />
                      Lokasi Masuk
                    </span>
                    <span className="text-xs font-semibold text-emerald-900 block mt-0.5">
                      {detail.checkIn.locationName}
                    </span>
                  </div>
                </div>

                {/* CHECK-OUT CARD */}
                <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200/80 space-y-2.5">
                  <div className="flex items-center justify-between pb-2 border-b border-blue-200/60">
                    <span className="font-bold text-blue-900 flex items-center gap-1.5 uppercase text-[11px] tracking-wider">
                      <LogOut className="w-4 h-4 text-blue-600" />
                      Check-Out
                    </span>
                    {detail.checkOut.status === 'operational' ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
                        Jam Operasional
                      </span>
                    ) : detail.checkOut.status === 'after_work' ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        Setelah Jam Kerja
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                        Belum Check-out
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-[10px] text-blue-800/80 block font-medium">Waktu Keluar</span>
                    <span className="text-xl font-extrabold text-blue-950 block">
                      {detail.checkOut.timeFormatted}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-blue-800/80 block font-medium flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-blue-600" />
                      Lokasi Keluar
                    </span>
                    <span className="text-xs font-semibold text-blue-900 block mt-0.5">
                      {detail.checkOut.locationName}
                    </span>
                  </div>
                </div>
              </div>

              {/* Notes Field */}
              <div className="p-3.5 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] space-y-1 text-xs">
                <span className="text-[11px] font-bold text-[#374151] flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#6B7280]" />
                  Catatan Kehadiran
                </span>
                <p className="text-[#6B7280] italic pt-0.5">
                  {detail.notes || '-'}
                </p>
              </div>
            </>
          ) : null}
        </div>

        {/* Modal Footer (READ-ONLY GUARANTEE: Only Tutup Button) */}
        <div className="pt-3 border-t border-[#E5E7EB] flex justify-end shrink-0">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs px-5">
            Tutup
          </Button>
        </div>
      </div>
    </div>
  );
};
