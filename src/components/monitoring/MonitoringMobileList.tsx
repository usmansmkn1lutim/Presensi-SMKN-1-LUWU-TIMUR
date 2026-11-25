import React from 'react';
import { MonitoringRecord } from '../../types/attendanceMonitoring.types';
import { LogIn, LogOut, Images } from 'lucide-react';
import { UserAvatar } from '../ui/UserAvatar';

interface MonitoringMobileListProps {
  records: MonitoringRecord[];
  viewMode?: 'list' | 'card';
  onViewPhoto?: (record: MonitoringRecord) => void;
}

export const MonitoringMobileList: React.FC<MonitoringMobileListProps> = ({
  records,
  viewMode = 'list',
  onViewPhoto,
}) => {
  const hasAnyPhoto = (row: MonitoringRecord) => {
    const checkIn = row.checkInPhotoPath ? row.checkInPhotoPath.trim() : '';
    const checkOut = row.checkOutPhotoPath ? row.checkOutPhotoPath.trim() : '';
    return Boolean(checkIn || checkOut);
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

  const renderOverallStatusBadge = (
    status: MonitoringRecord['overallStatus']
  ) => {
    if (status === 'belum_presensi') {
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50 shrink-0">
          Belum Presensi
        </span>
      );
    }
    if (status === 'sudah_masuk') {
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#FFF7ED] dark:bg-[#431F0B] text-[#EA580C] dark:text-[#FDBA74] border border-[#FFEDD5] dark:border-[#9A3412]/60 shrink-0">
          Sudah Masuk
        </span>
      );
    }
    return (
      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50 shrink-0">
        Sudah Pulang
      </span>
    );
  };

  const getRequestBadgeConfig = (
    requestType: NonNullable<MonitoringRecord['requestType']>
  ) => {
    switch (requestType) {
      case 'official_duty':
        return {
          label: 'Dinas Luar',
          className:
            'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50',
        };
      case 'sick':
        return {
          label: 'Sakit',
          className:
            'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50',
        };
      case 'other':
        return {
          label: 'Izin',
          className:
            'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/50',
        };
      case 'leave':
        return {
          label: 'Cuti',
          className:
            'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/50',
        };
    }
  };

  const renderRequestSubtext = (
    requestStatus: NonNullable<MonitoringRecord['requestStatus']>
  ) => {
    if (requestStatus === 'approved') {
      return (
        <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400 leading-none">
          Permohonan disetujui
        </span>
      );
    }
    return (
      <span className="text-[10px] font-medium text-amber-700 dark:text-amber-400 leading-none">
        Perlu ditinjau
      </span>
    );
  };

  const renderListStatusBadge = (row: MonitoringRecord) => {
    if (row.checkInAt) {
      if (row.checkInStatus === 'late') {
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50 shrink-0">
            Terlambat
          </span>
        );
      }
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 shrink-0">
          Tepat Waktu
        </span>
      );
    }

    if (row.requestType && row.requestStatus) {
      const badge = getRequestBadgeConfig(row.requestType);
      return (
        <>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded shrink-0 ${badge.className}`}
          >
            {badge.label}
          </span>
          {renderRequestSubtext(row.requestStatus)}
        </>
      );
    }

    return (
      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50 shrink-0">
        Belum Presensi
      </span>
    );
  };

  if (viewMode === 'list') {
    return (
      <div className="lg:hidden divide-y divide-[#E5E7EB] dark:divide-[#404040] bg-transparent">
        {records.map((row) => (
          <div
            key={row.employeeId}
            className="flex items-center justify-between gap-3 py-3 px-1"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <UserAvatar
                photoUrl={row.photoUrl}
                name={row.fullName}
                className="w-10 h-10 rounded-full object-cover border border-[#E5E7EB] dark:border-[#404040] shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-bold text-[#111827] dark:text-[#F9FAFB] truncate">
                  {row.fullName}
                </p>
                {row.positionName && (
                  <p className="text-[11px] text-[#6B7280] dark:text-[#A3A3A3] truncate mt-0.5">
                    {row.positionName}
                  </p>
                )}
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-2">
              <div className="flex flex-col items-end gap-1">
                {renderListStatusBadge(row)}
                <span className="text-[11px] font-semibold text-[#6B7280] dark:text-[#A3A3A3] tabular-nums leading-none">
                  {row.checkInAt ? formatTime(row.checkInAt) : '--'}
                </span>
              </div>
              {hasAnyPhoto(row) && onViewPhoto && (
                <button
                  type="button"
                  onClick={() => onViewPhoto(row)}
                  className="w-8 h-8 rounded-lg bg-[#FFF7ED] dark:bg-[#431F0B] hover:bg-[#FFEDD5] dark:hover:bg-[#5C2B10] text-[#F97316] dark:text-[#FDBA74] border border-[#FFEDD5] dark:border-[#9A3412]/60 flex items-center justify-center transition-colors shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]"
                  title="Lihat foto presensi"
                  aria-label={`Lihat foto presensi ${row.fullName}`}
                >
                  <Images className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
      {records.map((row) => (
        <div
          key={row.employeeId}
          className="bg-[#FFFFFF] dark:bg-[#262626] border border-[#E5E7EB] dark:border-[#404040] rounded-2xl p-4 shadow-2xs space-y-3"
        >
          {/* Top Info Header */}
          <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-[#E5E7EB] dark:border-[#404040]">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <UserAvatar
                photoUrl={row.photoUrl}
                name={row.fullName}
                className="w-9 h-9 rounded-full object-cover border border-[#E5E7EB] dark:border-[#404040] shrink-0"
              />
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-bold text-[#111827] dark:text-[#F9FAFB] truncate">
                  {row.fullName}
                </h4>
                {row.positionName && (
                  <p className="text-[11px] text-[#6B7280] dark:text-[#A3A3A3] truncate mt-0.5">
                    {row.positionName}
                  </p>
                )}
              </div>
            </div>

            <div className="shrink-0 flex items-start gap-1.5">
              {!row.checkInAt && row.requestType && row.requestStatus ? (
                <div className="shrink-0 flex flex-col items-end gap-1">
                  {(() => {
                    const badge = getRequestBadgeConfig(row.requestType);
                    return (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded shrink-0 ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    );
                  })()}
                  {renderRequestSubtext(row.requestStatus)}
                </div>
              ) : (
                renderOverallStatusBadge(row.overallStatus)
              )}
              {hasAnyPhoto(row) && onViewPhoto && (
                <button
                  type="button"
                  onClick={() => onViewPhoto(row)}
                  className="w-7 h-7 rounded-lg bg-[#FFF7ED] dark:bg-[#431F0B] hover:bg-[#FFEDD5] dark:hover:bg-[#5C2B10] text-[#F97316] dark:text-[#FDBA74] border border-[#FFEDD5] dark:border-[#9A3412]/60 flex items-center justify-center transition-colors shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]"
                  title="Lihat foto presensi"
                  aria-label={`Lihat foto presensi ${row.fullName}`}
                >
                  <Images className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Check-in & Check-out Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-[#F9FAFB] dark:bg-[#303030] border border-[#E5E7EB] dark:border-[#404040] space-y-1">
              <div className="flex items-center justify-between text-[11px] text-[#6B7280] dark:text-[#A3A3A3]">
                <span className="flex items-center gap-1 font-medium">
                  <LogIn className="w-3 h-3 text-[#F97316]" />
                  Masuk
                </span>
                {row.checkInStatus === 'on_time' ? (
                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-1 rounded border border-emerald-200 dark:border-emerald-800/50">
                    Tepat Waktu
                  </span>
                ) : row.checkInStatus === 'late' ? (
                  <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-1 rounded border border-amber-200 dark:border-amber-800/50">
                    Terlambat
                  </span>
                ) : (
                  <span className="text-[#9CA3AF] dark:text-[#A3A3A3]">-</span>
                )}
              </div>
              <div className="text-sm font-bold text-[#111827] dark:text-[#F9FAFB]">
                {formatTime(row.checkInAt)}
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-[#F9FAFB] dark:bg-[#303030] border border-[#E5E7EB] dark:border-[#404040] space-y-1">
              <div className="flex items-center justify-between text-[11px] text-[#6B7280] dark:text-[#A3A3A3]">
                <span className="flex items-center gap-1 font-medium">
                  <LogOut className="w-3 h-3 text-[#F97316]" />
                  Keluar
                </span>
                {row.checkOutStatus === 'operational' ? (
                  <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 px-1 rounded border border-blue-200 dark:border-blue-800/50">
                    Operasional
                  </span>
                ) : row.checkOutStatus === 'after_work' ? (
                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-1 rounded border border-emerald-200 dark:border-emerald-800/50">
                    Setelah Kerja
                  </span>
                ) : (
                  <span className="text-[10px] text-[#9CA3AF] dark:text-[#A3A3A3]">Belum</span>
                )}
              </div>
              <div className="text-sm font-bold text-[#111827] dark:text-[#F9FAFB]">
                {formatTime(row.checkOutAt)}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
