import React from 'react';
import { AttendanceHistoryRecord } from '../../types/attendanceHistory.types';
import { X, Calendar, LogIn, LogOut, MapPin, FileText, Clock } from 'lucide-react';
import { Button } from '../ui/Button';

interface HistoryDetailModalProps {
  record: AttendanceHistoryRecord | null;
  onClose: () => void;
}

export const HistoryDetailModal: React.FC<HistoryDetailModalProps> = ({
  record,
  onClose,
}) => {
  if (!record) return null;

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr + 'T00:00:00');
      return date.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
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

  const checkInLocation = record.check_in_location?.name || 'Kantor/TU';
  const checkOutLocation = record.check_out_location?.name || checkInLocation;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
      <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-xl space-y-5">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FFF7ED] text-[#F97316] flex items-center justify-center shrink-0 border border-[#FFEDD5]">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#111827]">Rincian Presensi Harian</h3>
              <p className="text-xs text-[#6B7280]">{formatDate(record.attendance_date)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-[#F3F4F6] hover:bg-[#E5E7EB] text-[#6B7280] hover:text-[#111827] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Check-in Details */}
        <div className="p-4 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#111827] flex items-center gap-1.5">
              <LogIn className="w-4 h-4 text-[#F97316]" />
              Presensi Masuk (Check-in)
            </span>
            {record.check_in_status === 'on_time' ? (
              <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Tepat Waktu
              </span>
            ) : record.check_in_status === 'late' ? (
              <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                Terlambat
              </span>
            ) : (
              <span className="text-xs text-[#9CA3AF]">-</span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs pt-1">
            <div>
              <span className="text-[#6B7280] block text-[11px]">Waktu Check-in</span>
              <span className="font-bold text-[#111827] text-sm mt-0.5 block">
                {formatTime(record.check_in_at)}
              </span>
            </div>
            <div>
              <span className="text-[#6B7280] block text-[11px]">Lokasi Check-in</span>
              <span className="font-semibold text-[#111827] mt-0.5 block flex items-center gap-1">
                <MapPin className="w-3 h-3 text-[#F97316] shrink-0" />
                {checkInLocation}
              </span>
            </div>
          </div>
        </div>

        {/* Check-out Details */}
        <div className="p-4 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#111827] flex items-center gap-1.5">
              <LogOut className="w-4 h-4 text-[#F97316]" />
              Presensi Pulang (Check-out)
            </span>
            {record.check_out_status === 'operational' ? (
              <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                Jam Operasional
              </span>
            ) : record.check_out_status === 'after_work' ? (
              <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Setelah Jam Kerja
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded text-xs text-[#6B7280] bg-[#E5E7EB]">
                Belum Check-out
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs pt-1">
            <div>
              <span className="text-[#6B7280] block text-[11px]">Waktu Check-out</span>
              <span className="font-bold text-[#111827] text-sm mt-0.5 block">
                {record.check_out_at ? formatTime(record.check_out_at) : '-'}
              </span>
            </div>
            <div>
              <span className="text-[#6B7280] block text-[11px]">Lokasi Check-out</span>
              <span className="font-semibold text-[#111827] mt-0.5 block flex items-center gap-1">
                <MapPin className="w-3 h-3 text-[#F97316] shrink-0" />
                {record.check_out_at ? checkOutLocation : '-'}
              </span>
            </div>
          </div>
        </div>

        {/* Notes section if present */}
        {record.notes && (
          <div className="p-3 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] text-xs text-[#6B7280] space-y-1">
            <span className="font-semibold text-[#111827] flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-[#F97316]" />
              Catatan:
            </span>
            <p>{record.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Tutup
          </Button>
        </div>
      </div>
    </div>
  );
};
