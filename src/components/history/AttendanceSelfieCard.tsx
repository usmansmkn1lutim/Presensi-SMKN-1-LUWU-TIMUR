import React, { useState, useEffect } from 'react';
import { LogIn, LogOut, Calendar, MapPin, X, Image as ImageIcon, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { attendancePhotoService } from '../../services/attendancePhotoService';

interface AttendanceSelfieCardProps {
  type: 'check_in' | 'check_out';
  photoPath?: string | null;
  time?: string | null; // ISO string
  date?: string | null; // YYYY-MM-DD
  locationName?: string | null;
  statusLabel?: string | null;
  statusClassName?: string;
  notes?: string | null;
}

export const AttendanceSelfieCard: React.FC<AttendanceSelfieCardProps> = ({
  type,
  photoPath,
  time,
  date,
  locationName,
  statusLabel,
  statusClassName,
  notes,
}) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [imageError, setImageError] = useState<boolean>(false);
  const [isNotesOpen, setIsNotesOpen] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    async function fetchSignedUrl() {
      if (!photoPath) {
        setSignedUrl(null);
        return;
      }

      setLoadingUrl(true);
      setImageError(false);

      const url = await attendancePhotoService.getSelfieSignedUrl(photoPath);

      if (isMounted) {
        setSignedUrl(url);
        setLoadingUrl(false);
      }
    }

    fetchSignedUrl();

    return () => {
      isMounted = false;
    };
  }, [photoPath]);

  const formatTime = (isoString?: string | null) => {
    if (!isoString) return '--:-- WITA';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return '--:-- WITA';
      const timeStr = d.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      return `${timeStr} WITA`;
    } catch {
      return '--:-- WITA';
    }
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '-';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        return d.toLocaleDateString('id-ID', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });
      }
      const d = new Date(dateStr);
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

  const resolveStatusClass = (label?: string | null, customClass?: string) => {
    if (customClass) return customClass;
    if (!label) return 'bg-emerald-50 text-emerald-700 border border-emerald-200';

    if (label.includes('Tepat Waktu') || label === 'Hadir' || label === 'Jam Operasional') {
      return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    }
    if (label.includes('Terlambat')) {
      return 'bg-amber-50 text-amber-700 border border-amber-200';
    }
    if (label === 'Sakit') {
      return 'bg-blue-50 text-blue-700 border border-blue-200';
    }
    if (label === 'Izin') {
      return 'bg-indigo-50 text-indigo-700 border border-indigo-200';
    }
    if (label === 'Dinas Luar') {
      return 'bg-purple-50 text-purple-700 border border-purple-200';
    }
    if (label === 'Cuti') {
      return 'bg-teal-50 text-teal-700 border border-teal-200';
    }
    if (label === 'Alpha' || label === 'Alfa') {
      return 'bg-rose-50 text-rose-700 border border-rose-200';
    }
    if (label === 'Libur' || label === 'Akhir Pekan') {
      return 'bg-gray-100 text-gray-700 border border-gray-200';
    }

    return 'bg-[#FFF7ED] text-[#F97316] border border-orange-200';
  };

  const isCheckIn = type === 'check_in';
  const labelText = isCheckIn ? 'Check-in' : 'Check-out';
  const IconComponent = isCheckIn ? LogIn : LogOut;
  const formattedTime = formatTime(time);
  const formattedDate = formatDate(date);
  const resolvedLocation = locationName || (time ? 'Lokasi Presensi' : 'Lokasi tidak tersedia');

  return (
    <>
      <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col gap-3 transition-all hover:border-slate-300">
        <div className="flex items-center gap-4">
          {/* Left: Selfie Photo Preview */}
          <div className="shrink-0">
            {loadingUrl ? (
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-slate-100 border border-slate-200 animate-pulse flex items-center justify-center">
                <span className="text-[10px] text-slate-400">Memuat...</span>
              </div>
            ) : signedUrl && !imageError ? (
              <div
                onClick={() => setIsModalOpen(true)}
                className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 cursor-pointer group shadow-2xs"
                title="Klik untuk memperbesar foto"
              >
                <img
                  src={signedUrl}
                  alt={`Foto ${labelText}`}
                  onError={() => setImageError(true)}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-white text-[10px] font-medium bg-black/50 px-1.5 py-0.5 rounded">
                    Perbesar
                  </span>
                </div>
              </div>
            ) : (
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center text-slate-400 text-center p-2">
                <ImageIcon className="w-5 h-5 text-slate-300 mb-1" />
                <span className="text-[10px] leading-tight text-slate-500 font-medium">
                  Foto tidak tersedia
                </span>
              </div>
            )}
          </div>

          {/* Right: Info */}
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <IconComponent className="w-4 h-4 text-[#F97316]" />
                {labelText}
              </span>
              {statusLabel && (
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-md truncate max-w-[140px] ${resolveStatusClass(
                    statusLabel,
                    statusClassName
                  )}`}
                  title={statusLabel}
                >
                  {statusLabel}
                </span>
              )}
            </div>

            <div className="text-sm font-bold text-[#111827]">
              {formattedTime}
            </div>

            <hr className="border-t border-[#E5E7EB] my-1" />

            <div className="space-y-1 text-xs text-slate-500">
              <div className="flex items-center gap-1.5 truncate">
                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{formattedDate}</span>
              </div>
              <div className="flex items-center gap-1.5 truncate">
                <MapPin className="w-3.5 h-3.5 text-[#F97316] shrink-0" />
                <span className="truncate font-medium text-slate-700">{resolvedLocation}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Accordion Catatan */}
        {notes && notes.trim().length > 0 && (
          <div className="pt-2.5 border-t border-[#E5E7EB] mt-0.5">
            <button
              type="button"
              onClick={() => setIsNotesOpen((prev) => !prev)}
              className="w-full flex items-center justify-between text-xs font-semibold text-[#4B5563] hover:text-[#F97316] transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#F97316]" />
                <span>Catatan / Alasan</span>
              </span>
              <span className="text-[11px] text-[#6B7280] flex items-center gap-1 font-normal">
                {isNotesOpen ? 'Sembunyikan' : 'Lihat Catatan'}
                {isNotesOpen ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </span>
            </button>
            {isNotesOpen && (
              <div className="mt-2 p-2.5 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] text-xs text-[#374151] leading-relaxed animate-in fade-in duration-150">
                {notes}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lightbox Modal for Photo */}
      {isModalOpen && signedUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="relative bg-white rounded-2xl max-w-md w-full p-4 shadow-2xl space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <IconComponent className="w-4 h-4 text-[#F97316]" />
                Pratinjau Foto {labelText} — {formattedDate}
              </span>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-7 h-7 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-xl overflow-hidden bg-slate-900 flex items-center justify-center max-h-[70vh]">
              <img
                src={signedUrl}
                alt={`Pratinjau Foto ${labelText}`}
                className="max-w-full max-h-[70vh] object-contain"
              />
            </div>

            <div className="flex justify-between items-center text-xs text-slate-500 pt-1">
              <span>Waktu: <strong className="text-slate-800">{formattedTime}</strong></span>
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
