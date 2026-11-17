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
        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
          Belum Presensi
        </span>
      );
    }
    if (status === 'sudah_masuk') {
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#FFF7ED] text-[#EA580C] border border-[#FFEDD5] shrink-0">
          Sudah Masuk
        </span>
      );
    }
    return (
      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
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
          className: 'bg-purple-50 text-purple-700 border border-purple-200',
        };
      case 'sick':
        return {
          label: 'Sakit',
          className: 'bg-blue-50 text-blue-700 border border-blue-200',
        };
      case 'other':
        return {
          label: 'Izin',
          className: 'bg-sky-50 text-sky-700 border border-sky-200',
        };
      case 'leave':
        return {
          label: 'Cuti',
          className: 'bg-teal-50 text-teal-700 border border-teal-200',
        };
    }
  };

  const renderRequestSubtext = (
    requestStatus: NonNullable<MonitoringRecord['requestStatus']>
  ) => {
    if (requestStatus === 'approved') {
      return (
        <span className="text-[10px] font-medium text-emerald-700 leading-none">
          Permohonan disetujui
        </span>
      );
    }
    return (
      <span className="text-[10px] font-medium text-amber-700 leading-none">
        Perlu ditinjau
      </span>
    );
  };

  const renderListStatusBadge = (row: MonitoringRecord) => {
    if (row.checkInAt) {
      if (row.checkInStatus === 'late') {
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
            Terlambat
          </span>
        );
      }
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
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
      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
        Belum Presensi
      </span>
    );
  };

  if (viewMode === 'list') {
    return (
      <div className="lg:hidden divide-y divide-[#E5E7EB] bg-transparent">
        {records.map((row) => (
          <div
            key={row.employeeId}
            className="flex items-center justify-between gap-3 py-3 px-1"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <UserAvatar
                photoUrl={row.photoUrl}
                name={row.fullName}
                className="w-10 h-10 rounded-full object-cover border border-[#E5E7EB] shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-bold text-[#111827] truncate">
                  {row.fullName}
                </p>
                {row.positionName && (
                  <p className="text-[11px] text-[#6B7280] truncate mt-0.5">
                    {row.positionName}
                  </p>
                )}
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-2">
              <div className="flex flex-col items-end gap-1">
                {renderListStatusBadge(row)}
                <span className="text-[11px] font-semibold text-[#6B7280] tabular-nums leading-none">
                  {row.checkInAt ? formatTime(row.checkInAt) : '--'}
                </span>
              </div>
              {hasAnyPhoto(row) && onViewPhoto && (
                <button
                  type="button"
                  onClick={() => onViewPhoto(row)}
                  className="w-8 h-8 rounded-lg bg-[#FFF7ED] hover:bg-[#FFEDD5] text-[#F97316] border border-[#FFEDD5] flex items-center justify-center transition-colors shrink-0 cursor-pointer"
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
          className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-4 shadow-2xs space-y-3"
        >
          {/* Top Info Header */}
          <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-[#E5E7EB]">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <UserAvatar
                photoUrl={row.photoUrl}
                name={row.fullName}
                className="w-9 h-9 rounded-full object-cover border border-[#E5E7EB] shrink-0"
              />
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-bold text-[#111827] truncate">
                  {row.fullName}
                </h4>
                {row.positionName && (
                  <p className="text-[11px] text-[#6B7280] truncate mt-0.5">
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
                  className="w-7 h-7 rounded-lg bg-[#FFF7ED] hover:bg-[#FFEDD5] text-[#F97316] border border-[#FFEDD5] flex items-center justify-center transition-colors shrink-0 cursor-pointer"
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
            <div className="p-2.5 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] space-y-1">
              <div className="flex items-center justify-between text-[11px] text-[#6B7280]">
                <span className="flex items-center gap-1 font-medium">
                  <LogIn className="w-3 h-3 text-[#F97316]" />
                  Masuk
                </span>
                {row.checkInStatus === 'on_time' ? (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1 rounded border border-emerald-200">
                    Tepat Waktu
                  </span>
                ) : row.checkInStatus === 'late' ? (
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-1 rounded border border-amber-200">
                    Terlambat
                  </span>
                ) : (
                  <span className="text-[#9CA3AF]">-</span>
                )}
              </div>
              <div className="text-sm font-bold text-[#111827]">
                {formatTime(row.checkInAt)}
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] space-y-1">
              <div className="flex items-center justify-between text-[11px] text-[#6B7280]">
                <span className="flex items-center gap-1 font-medium">
                  <LogOut className="w-3 h-3 text-[#F97316]" />
                  Keluar
                </span>
                {row.checkOutStatus === 'operational' ? (
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1 rounded border border-blue-200">
                    Operasional
                  </span>
                ) : row.checkOutStatus === 'after_work' ? (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1 rounded border border-emerald-200">
                    Setelah Kerja
                  </span>
                ) : (
                  <span className="text-[10px] text-[#9CA3AF]">Belum</span>
                )}
              </div>
              <div className="text-sm font-bold text-[#111827]">
                {formatTime(row.checkOutAt)}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
