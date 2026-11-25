import React, { useEffect, useState } from 'react';
import { EmployeeRecapRecord, EmployeeAttendanceDetailLog } from '../../types/attendanceRecap.types';
import { attendanceRecapService } from '../../services/attendanceRecapService';
import { X, User, Calendar, RefreshCw, Eye } from 'lucide-react';
import { Button } from '../ui/Button';

interface RecapDetailModalProps {
  record: EmployeeRecapRecord | null;
  startDate: string;
  endDate: string;
  onInspectDateDetail?: (employeeId: string, attendanceDate: string) => void;
  onClose: () => void;
}

export const RecapDetailModal: React.FC<RecapDetailModalProps> = ({
  record,
  startDate,
  endDate,
  onInspectDateDetail,
  onClose,
}) => {
  const [logs, setLogs] = useState<EmployeeAttendanceDetailLog[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!record) return;

    const fetchLogs = async () => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const data = await attendanceRecapService.getEmployeeAttendanceLogs(
          record.employeeId,
          startDate,
          endDate
        );
        setLogs(data);
      } catch (err: any) {
        console.error('Failed to fetch employee recap detail logs:', err);
        setErrorMsg('Gagal memuat log rincian presensi.');
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [record, startDate, endDate]);

  if (!record) return null;

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr + 'T00:00:00');
      return date.toLocaleDateString('id-ID', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatTime = (isoString?: string | null) => {
    if (!isoString) return '-';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    } catch {
      return '-';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
      <div className="bg-[#FFFFFF] dark:bg-[#262626] border border-[#E5E7EB] dark:border-[#404040] rounded-2xl max-w-3xl w-full p-5 sm:p-6 shadow-xl space-y-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB] dark:border-[#404040] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFF7ED] dark:bg-[#431F0B] text-[#F97316] flex items-center justify-center shrink-0 border border-[#FFEDD5] dark:border-[#9A3412]/60">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">{record.fullName}</h3>
              <p className="text-xs text-[#6B7280] dark:text-[#A3A3A3]">
                NIP: {record.nip || '-'} · {record.departmentName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-[#F3F4F6] dark:bg-[#303030] hover:bg-[#E5E7EB] dark:hover:bg-[#404040] text-[#6B7280] dark:text-[#A3A3A3] hover:text-[#111827] dark:hover:text-[#F9FAFB] flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Tutup Rincian Presensi"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Period & Summary Chips */}
        <div className="p-3.5 rounded-xl bg-[#F9FAFB] dark:bg-[#303030] border border-[#E5E7EB] dark:border-[#404040] space-y-2 shrink-0 text-xs">
          <div className="flex items-center justify-between text-[#6B7280] dark:text-[#A3A3A3]">
            <span className="flex items-center gap-1 font-semibold text-[#111827] dark:text-[#F9FAFB]">
              <Calendar className="w-3.5 h-3.5 text-[#F97316]" />
              Periode Rekap:
            </span>
            <span>
              {formatDate(startDate)} s/d {formatDate(endDate)}
            </span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center pt-1">
            <div className="p-1.5 rounded-lg bg-white dark:bg-[#262626] border border-[#E5E7EB] dark:border-[#404040]">
              <span className="text-[10px] text-[#6B7280] dark:text-[#A3A3A3] block">Hari Kerja</span>
              <span className="font-bold text-[#111827] dark:text-[#F9FAFB]">{record.effectiveWorkingDays}</span>
            </div>
            <div className="p-1.5 rounded-lg bg-[#FFF7ED] dark:bg-[#431F0B] border border-[#FFEDD5] dark:border-[#9A3412]/60">
              <span className="text-[10px] text-[#EA580C] dark:text-[#FDBA74] block font-medium">Presensi</span>
              <span className="font-bold text-[#EA580C] dark:text-[#FDBA74]">{record.totalAttendance}</span>
            </div>
            <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50">
              <span className="text-[10px] text-emerald-700 dark:text-emerald-300 block font-medium">Tepat Waktu</span>
              <span className="font-bold text-emerald-700 dark:text-emerald-300">{record.onTimeCount}</span>
            </div>
            <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50">
              <span className="text-[10px] text-amber-800 dark:text-amber-300 block font-medium">Terlambat</span>
              <span className="font-bold text-amber-800 dark:text-amber-300">{record.lateCount}</span>
            </div>
            <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50">
              <span className="text-[10px] text-rose-700 dark:text-rose-300 block font-medium">Tidak Presensi</span>
              <span className="font-bold text-rose-700 dark:text-rose-300">{record.absentCount}</span>
            </div>
            <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/50">
              <span className="text-[10px] text-blue-700 dark:text-blue-300 block font-medium">Check-out</span>
              <span className="font-bold text-blue-700 dark:text-blue-300">{record.checkedOutCount}</span>
            </div>
          </div>
        </div>

        {/* Attendance Log Table */}
        <div className="flex-1 overflow-y-auto min-h-0 border border-[#E5E7EB] dark:border-[#404040] rounded-xl">
          {loading ? (
            <div className="p-8 text-center space-y-2 animate-pulse">
              <RefreshCw className="w-5 h-5 text-[#F97316] animate-spin mx-auto" />
              <p className="text-xs text-[#6B7280] dark:text-[#A3A3A3]">Memuat catatan presensi pegawai...</p>
            </div>
          ) : errorMsg ? (
            <div className="p-6 text-center text-xs text-rose-600">{errorMsg}</div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#6B7280] dark:text-[#A3A3A3]">
              Tidak terdapat catatan presensi pada periode ini.
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-[#F9FAFB] dark:bg-[#303030] border-b border-[#E5E7EB] dark:border-[#404040] text-[11px] font-bold text-[#6B7280] dark:text-[#A3A3A3] uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Tanggal</th>
                  <th className="py-2.5 px-3">Check-in</th>
                  <th className="py-2.5 px-3">Status Masuk</th>
                  <th className="py-2.5 px-3">Check-out</th>
                  <th className="py-2.5 px-3">Status Keluar</th>
                  <th className="py-2.5 px-3 text-center">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#404040] text-[#111827] dark:text-[#F9FAFB]">
                {logs.map((row) => (
                  <tr key={row.id} className="hover:bg-[#F9FAFB] dark:hover:bg-[#303030]/50">
                    <td className="py-2.5 px-3 font-semibold">{formatDate(row.attendanceDate)}</td>
                    <td className="py-2.5 px-3">{formatTime(row.checkInAt)}</td>
                    <td className="py-2.5 px-3">
                      {row.checkInStatus === 'on_time' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
                          Tepat Waktu
                        </span>
                      ) : row.checkInStatus === 'late' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50">
                          Terlambat
                        </span>
                      ) : (
                        <span className="text-[#9CA3AF] dark:text-[#A3A3A3]">-</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      {row.checkOutAt ? formatTime(row.checkOutAt) : '-'}
                    </td>
                    <td className="py-2.5 px-3">
                      {row.checkOutStatus === 'operational' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50">
                          Jam Operasional
                        </span>
                      ) : row.checkOutStatus === 'after_work' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
                          Setelah Jam Kerja
                        </span>
                      ) : (
                        <span className="text-[#9CA3AF] dark:text-[#A3A3A3]">-</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          onInspectDateDetail &&
                          onInspectDateDetail(record.employeeId, row.attendanceDate)
                        }
                        className="text-[10px] h-7 px-2 border-[#E5E7EB] dark:border-[#404040] text-[#374151] dark:text-[#D4D4D4] hover:text-[#EA580C] dark:hover:text-[#FDBA74] hover:bg-[#FFF7ED] dark:hover:bg-[#431F0B]"
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        Detail
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 flex justify-end shrink-0">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Tutup
          </Button>
        </div>
      </div>
    </div>
  );
};
