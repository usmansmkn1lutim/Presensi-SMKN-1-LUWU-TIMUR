import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  Calendar,
  LogIn,
  LogOut,
  X,
  RefreshCw,
  Image as ImageIcon,
  AlertCircle,
  Maximize2,
  Clock,
} from 'lucide-react';
import { MonitoringRecord } from '../../types/attendanceMonitoring.types';
import { getSelfieSignedUrl } from '../../services/attendancePhotoService';

interface MonitoringPhotoModalProps {
  record: MonitoringRecord | null;
  onClose: () => void;
}

type PhotoPhase = 'empty' | 'loading' | 'loaded' | 'error';

interface SinglePhotoState {
  phase: PhotoPhase;
  url: string | null;
}

interface LightboxState {
  title: string;
  url: string;
  timeText: string | null;
}

export const MonitoringPhotoModal: React.FC<MonitoringPhotoModalProps> = ({
  record,
  onClose,
}) => {
  const [checkInState, setCheckInState] = useState<SinglePhotoState>({
    phase: 'empty',
    url: null,
  });
  const [checkOutState, setCheckOutState] = useState<SinglePhotoState>({
    phase: 'empty',
    url: null,
  });
  const [lightbox, setLightbox] = useState<LightboxState | null>(null);

  const isMountedRef = useRef<boolean>(true);
  const checkInGenRef = useRef<number>(0);
  const checkOutGenRef = useRef<number>(0);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (lightbox) {
          setLightbox(null);
        } else {
          onClose();
        }
      }
    };

    if (record) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [record, lightbox, onClose]);

  useEffect(() => {
    setLightbox(null);

    if (!record) {
      checkInGenRef.current += 1;
      checkOutGenRef.current += 1;
      setCheckInState({ phase: 'empty', url: null });
      setCheckOutState({ phase: 'empty', url: null });
      return;
    }

    let isEffectActive = true;
    const inPath = record.checkInPhotoPath ? record.checkInPhotoPath.trim() : '';
    const outPath = record.checkOutPhotoPath ? record.checkOutPhotoPath.trim() : '';

    const inGen = ++checkInGenRef.current;
    const outGen = ++checkOutGenRef.current;

    setCheckInState(
      inPath ? { phase: 'loading', url: null } : { phase: 'empty', url: null }
    );
    setCheckOutState(
      outPath ? { phase: 'loading', url: null } : { phase: 'empty', url: null }
    );

    const loadInitialPhotos = async () => {
      if (inPath && outPath) {
        const [inUrl, outUrl] = await Promise.all([
          getSelfieSignedUrl(inPath),
          getSelfieSignedUrl(outPath),
        ]);

        if (!isEffectActive || !isMountedRef.current) return;

        if (checkInGenRef.current === inGen) {
          setCheckInState(
            inUrl ? { phase: 'loaded', url: inUrl } : { phase: 'error', url: null }
          );
        }
        if (checkOutGenRef.current === outGen) {
          setCheckOutState(
            outUrl ? { phase: 'loaded', url: outUrl } : { phase: 'error', url: null }
          );
        }
        return;
      }

      if (inPath) {
        const inUrl = await getSelfieSignedUrl(inPath);
        if (!isEffectActive || !isMountedRef.current) return;
        if (checkInGenRef.current === inGen) {
          setCheckInState(
            inUrl ? { phase: 'loaded', url: inUrl } : { phase: 'error', url: null }
          );
        }
        return;
      }

      if (outPath) {
        const outUrl = await getSelfieSignedUrl(outPath);
        if (!isEffectActive || !isMountedRef.current) return;
        if (checkOutGenRef.current === outGen) {
          setCheckOutState(
            outUrl ? { phase: 'loaded', url: outUrl } : { phase: 'error', url: null }
          );
        }
      }
    };

    loadInitialPhotos();

    return () => {
      isEffectActive = false;
    };
  }, [record]);

  if (!record) return null;

  const cleanCheckInPath = record.checkInPhotoPath ? record.checkInPhotoPath.trim() : '';
  const cleanCheckOutPath = record.checkOutPhotoPath ? record.checkOutPhotoPath.trim() : '';

  const handleRetryPhoto = async (type: 'check_in' | 'check_out') => {
    const path = type === 'check_in' ? cleanCheckInPath : cleanCheckOutPath;
    if (!path) return;

    if (type === 'check_in') {
      const targetGen = ++checkInGenRef.current;
      setCheckInState({ phase: 'loading', url: null });
      const url = await getSelfieSignedUrl(path);
      if (!isMountedRef.current || checkInGenRef.current !== targetGen) return;
      setCheckInState(
        url ? { phase: 'loaded', url } : { phase: 'error', url: null }
      );
    } else {
      const targetGen = ++checkOutGenRef.current;
      setCheckOutState({ phase: 'loading', url: null });
      const url = await getSelfieSignedUrl(path);
      if (!isMountedRef.current || checkOutGenRef.current !== targetGen) return;
      setCheckOutState(
        url ? { phase: 'loaded', url } : { phase: 'error', url: null }
      );
    }
  };

  const formatDateLong = (dateStr: string) => {
    try {
      const [year, month, day] = dateStr.split('-').map(Number);
      if (year && month && day) {
        const d = new Date(year, month - 1, day);
        return d.toLocaleDateString('id-ID', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  const formatTime = (isoString?: string | null) => {
    if (!isoString) return null;
    try {
      const d = new Date(isoString);
      if (Number.isNaN(d.getTime())) return null;
      return d.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    } catch {
      return null;
    }
  };

  const getEmptyMessage = (type: 'check_in' | 'check_out') => {
    if (type === 'check_in') {
      if (!record.checkInAt && record.requestType) {
        return 'Foto masuk tidak tersedia (status nonfisik)';
      }
      return 'Foto masuk belum tersedia';
    }

    if (!record.checkOutAt && record.checkInAt) {
      return 'Pegawai belum melakukan presensi pulang';
    }
    if (!record.checkOutAt && record.requestType) {
      return 'Foto pulang tidak tersedia (status nonfisik)';
    }
    return 'Foto pulang belum tersedia';
  };

  const checkInTime = formatTime(record.checkInAt);
  const checkOutTime = formatTime(record.checkOutAt);

  const renderCheckInBadge = () => {
    if (record.checkInStatus === 'on_time') {
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900 shrink-0">
          Tepat Waktu
        </span>
      );
    }
    if (record.checkInStatus === 'late') {
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900 shrink-0">
          Terlambat
        </span>
      );
    }
    return null;
  };

  const renderCheckOutBadge = () => {
    if (record.checkOutStatus === 'operational') {
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 shrink-0">
          Jam Operasional
        </span>
      );
    }
    if (record.checkOutStatus === 'after_work') {
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900 shrink-0">
          Setelah Jam Kerja
        </span>
      );
    }
    return null;
  };

  const renderPhotoPanel = ({
    type,
    title,
    state,
    timeText,
    badge,
  }: {
    type: 'check_in' | 'check_out';
    title: string;
    state: SinglePhotoState;
    timeText: string | null;
    badge: React.ReactNode;
  }) => {
    const isCheckIn = type === 'check_in';
    const Icon = isCheckIn ? LogIn : LogOut;

    return (
      <div className="bg-[#FFFFFF] dark:bg-[#1E1E1E] border border-[#E5E7EB] dark:border-[#333] rounded-2xl p-3.5 sm:p-4 flex flex-col gap-3">
        {/* Section Header */}
        <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-[#E5E7EB] dark:border-[#333]">
          <div className="space-y-1 min-w-0">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#111827] dark:text-[#F3F4F6] flex items-center gap-1.5">
              <Icon className="w-3.5 h-3.5 text-[#F97316] shrink-0" />
              <span>{title}</span>
            </h4>
            {timeText && (
              <p className="text-xs font-semibold text-[#111827] dark:text-[#F3F4F6] tabular-nums flex items-center gap-1">
                <Clock className="w-3 h-3 text-[#6B7280] dark:text-[#9CA3AF] shrink-0" />
                <span>{timeText} WITA</span>
              </p>
            )}
          </div>
          {badge}
        </div>

        {/* Photo Viewport */}
        {state.phase === 'loading' ? (
          <div className="w-full h-56 sm:h-64 rounded-xl bg-[#F9FAFB] dark:bg-zinc-800/60 border border-[#E5E7EB] dark:border-[#333] animate-pulse flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 text-[#F97316] animate-spin" />
            <span className="text-xs font-medium text-[#6B7280] dark:text-[#9CA3AF]">
              Memuat foto...
            </span>
          </div>
        ) : state.phase === 'loaded' && state.url ? (
          <button
            type="button"
            onClick={() =>
              setLightbox({
                title,
                url: state.url as string,
                timeText,
              })
            }
            className="relative w-full h-56 sm:h-64 rounded-xl overflow-hidden bg-[#F9FAFB] dark:bg-zinc-800/60 border border-[#E5E7EB] dark:border-[#333] group cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#F97316]"
            title="Klik untuk memperbesar foto"
            aria-label={`Perbesar ${title}`}
          >
            <img
              src={state.url}
              alt={`${title} - ${record.fullName}`}
              onError={() => {
                if (isCheckIn) {
                  setCheckInState({ phase: 'error', url: null });
                } else {
                  setCheckOutState({ phase: 'error', url: null });
                }
                setLightbox((prev) => (prev?.title === title ? null : prev));
              }}
              className="w-full h-full object-contain"
            />
            <span className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#111827]/75 dark:bg-zinc-900/90 text-white text-[11px] font-semibold opacity-90 group-hover:opacity-100 transition-opacity">
              <Maximize2 className="w-3 h-3" />
              Perbesar
            </span>
          </button>
        ) : state.phase === 'error' ? (
          <div className="w-full h-56 sm:h-64 rounded-xl bg-[#F9FAFB] dark:bg-zinc-800/60 border border-[#E5E7EB] dark:border-[#333] flex flex-col items-center justify-center text-center p-4 gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#FFF7ED] dark:bg-orange-950/50 border border-[#FFEDD5] dark:border-orange-900 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-[#F97316]" />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-[#111827] dark:text-[#F3F4F6]">
                Gagal memuat foto
              </p>
              <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">
                Tautan foto tidak dapat dimuat atau telah kedaluwarsa.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleRetryPhoto(type)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FFF7ED] dark:bg-orange-950/50 hover:bg-[#FFEDD5] dark:hover:bg-orange-900/50 text-[#F97316] border border-[#FFEDD5] dark:border-orange-900 text-xs font-semibold transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Muat Ulang
            </button>
          </div>
        ) : (
          <div className="w-full h-56 sm:h-64 rounded-xl bg-[#F9FAFB] dark:bg-zinc-800/60 border border-dashed border-[#E5E7EB] dark:border-[#333] flex flex-col items-center justify-center text-center p-4 gap-2">
            <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-800 border border-[#E5E7EB] dark:border-[#333] flex items-center justify-center">
              <ImageIcon className="w-5 h-5 text-[#9CA3AF]" />
            </div>
            <p className="text-xs font-medium text-[#6B7280] dark:text-[#9CA3AF] max-w-[220px]">
              {getEmptyMessage(type)}
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/55 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={() => {
        if (lightbox) {
          setLightbox(null);
        } else {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="monitoring-photo-modal-title"
    >
      <div
        className="bg-[#FFFFFF] dark:bg-[#1E1E1E] border border-[#E5E7EB] dark:border-[#333] rounded-2xl w-full max-w-[calc(100vw-1.5rem)] sm:max-w-xl md:max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3 px-4 py-3.5 sm:px-6 sm:py-4 border-b border-[#E5E7EB] dark:border-[#333] shrink-0 bg-[#FFFFFF] dark:bg-[#1E1E1E]">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#FFF7ED] dark:bg-orange-950/50 text-[#F97316] border border-[#FFEDD5] dark:border-orange-900 flex items-center justify-center shrink-0 mt-0.5">
              <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h3
                id="monitoring-photo-modal-title"
                className="text-sm sm:text-base font-bold text-[#111827] dark:text-[#F3F4F6] truncate"
              >
                {record.fullName}
              </h3>
              {record.positionName && (
                <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] truncate">
                  {record.positionName}
                </p>
              )}
              <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF] flex items-center gap-1.5 mt-1">
                <Calendar className="w-3.5 h-3.5 text-[#F97316] shrink-0" />
                <span className="truncate">{formatDateLong(record.attendanceDate)}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-[#F3F4F6] dark:bg-zinc-800 hover:bg-[#E5E7EB] dark:hover:bg-zinc-700 text-[#6B7280] dark:text-zinc-300 hover:text-[#111827] dark:hover:text-[#F3F4F6] flex items-center justify-center transition-colors shrink-0 cursor-pointer"
            aria-label="Tutup detail foto presensi"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {lightbox ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#E5E7EB] dark:border-[#333]">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#111827] dark:text-[#F3F4F6]">
                    Pratinjau {lightbox.title}
                  </h4>
                  {lightbox.timeText && (
                    <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF] mt-0.5">
                      Waktu: <strong className="text-[#111827] dark:text-[#F3F4F6]">{lightbox.timeText} WITA</strong>
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setLightbox(null)}
                  className="px-3 py-1.5 rounded-lg bg-[#FFF7ED] dark:bg-orange-950/50 hover:bg-[#FFEDD5] dark:hover:bg-orange-900/50 text-[#F97316] border border-[#FFEDD5] dark:border-orange-900 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Kembali ke Ringkasan
                </button>
              </div>
              <div className="w-full rounded-xl bg-[#111827] flex items-center justify-center overflow-hidden max-h-[60vh]">
                <img
                  src={lightbox.url}
                  alt={`Pratinjau ${lightbox.title} - ${record.fullName}`}
                  className="max-w-full max-h-[60vh] object-contain"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderPhotoPanel({
                type: 'check_in',
                title: 'Foto Masuk',
                state: checkInState,
                timeText: checkInTime,
                badge: renderCheckInBadge(),
              })}
              {renderPhotoPanel({
                type: 'check_out',
                title: 'Foto Pulang',
                state: checkOutState,
                timeText: checkOutTime,
                badge: renderCheckOutBadge(),
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-4 py-3 sm:px-6 border-t border-[#E5E7EB] dark:border-[#333] flex items-center justify-end shrink-0 bg-[#FFFFFF] dark:bg-[#1E1E1E]">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 rounded-xl border border-[#E5E7EB] dark:border-[#333] bg-white dark:bg-zinc-800 hover:bg-[#F9FAFB] dark:hover:bg-zinc-700 text-xs font-semibold text-[#111827] dark:text-[#F3F4F6] transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
