import React from 'react';
import {
  X,
  MapPin,
  Building2,
  Compass,
  Radio,
  Clock,
  Calendar,
  ShieldCheck,
  Edit2,
  Power,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { LocationModel } from '../../types/location.types';

interface LocationDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  location: LocationModel | null;
  canManage: boolean;
  onEdit?: (loc: LocationModel) => void;
  onToggleAttendance?: (loc: LocationModel) => void;
}

export const LocationDetailModal: React.FC<LocationDetailModalProps> = ({
  isOpen,
  onClose,
  location,
  canManage,
  onEdit,
  onToggleAttendance,
}) => {
  if (!isOpen || !location) return null;

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(d);
    } catch {
      return isoString;
    }
  };

  const getLocationTypeLabel = (type: string) => {
    switch (type) {
      case 'office':
        return 'Office (Kantor / TU)';
      case 'teacher_room':
        return 'Teacher Room (Ruang Guru)';
      case 'laboratory':
        return 'Laboratory (Laboratorium / Bengkel)';
      default:
        return 'Other (Lainnya)';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-[#E5E7EB] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#F97316] flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#111827]">Detail Titik Lokasi</h2>
              <p className="text-xs text-[#6B7280]">Informasi lengkap geofencing presensi</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#9CA3AF] hover:text-[#111827] p-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Main Title & Badges */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-zinc-50 border border-[#E5E7EB] rounded-2xl">
            <div>
              <h3 className="text-base font-bold text-[#111827]">{location.name}</h3>
              <p className="text-xs font-mono font-semibold text-[#6B7280] mt-0.5">
                KODE: {location.code}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {location.isAttendanceEnabled ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-orange-700 bg-orange-100/80 rounded-full">
                  <Radio className="w-3 h-3 text-[#F97316]" />
                  Lokasi Presensi
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-zinc-600 bg-zinc-200/70 rounded-full">
                  Bukan Lokasi Presensi
                </span>
              )}

              {location.isActive ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-100/80 rounded-full">
                  Aktif
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-zinc-600 bg-zinc-200/70 rounded-full">
                  Nonaktif
                </span>
              )}
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 bg-white border border-[#E5E7EB] rounded-xl space-y-1">
              <span className="text-[#6B7280] font-medium block">Tipe Lokasi</span>
              <span className="text-[#111827] font-semibold block text-sm">
                {getLocationTypeLabel(location.locationType)}
              </span>
            </div>

            <div className="p-3.5 bg-white border border-[#E5E7EB] rounded-xl space-y-1">
              <span className="text-[#6B7280] font-medium block">Radius Geofence</span>
              <span className="text-[#111827] font-semibold block text-sm">
                {location.radiusMeters} Meter
              </span>
            </div>

            <div className="sm:col-span-2 p-3.5 bg-white border border-[#E5E7EB] rounded-xl space-y-1">
              <span className="text-[#6B7280] font-medium block">Koordinat GPS</span>
              {location.latitude !== null && location.longitude !== null ? (
                <div className="flex items-center gap-2 mt-1">
                  <Compass className="w-4 h-4 text-[#F97316] shrink-0" />
                  <span className="font-mono text-sm font-semibold text-[#111827]">
                    {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                  </span>
                </div>
              ) : (
                <span className="text-amber-700 font-medium italic block mt-0.5">
                  Koordinat belum diatur
                </span>
              )}
            </div>

            {location.address && (
              <div className="sm:col-span-2 p-3.5 bg-white border border-[#E5E7EB] rounded-xl space-y-1">
                <span className="text-[#6B7280] font-medium block">Alamat / Petunjuk Arah</span>
                <p className="text-[#111827] text-xs leading-relaxed mt-0.5">
                  {location.address}
                </p>
              </div>
            )}

            {location.description && (
              <div className="sm:col-span-2 p-3.5 bg-white border border-[#E5E7EB] rounded-xl space-y-1">
                <span className="text-[#6B7280] font-medium block">Deskripsi</span>
                <p className="text-[#111827] text-xs leading-relaxed mt-0.5">
                  {location.description}
                </p>
              </div>
            )}

            <div className="p-3 bg-zinc-50 border border-[#E5E7EB] rounded-xl space-y-1">
              <span className="text-[#6B7280] block text-[11px]">Dibuat Pada</span>
              <span className="text-[#111827] font-medium text-xs block">
                {formatDate(location.createdAt)}
              </span>
            </div>

            <div className="p-3 bg-zinc-50 border border-[#E5E7EB] rounded-xl space-y-1">
              <span className="text-[#6B7280] block text-[11px]">Terakhir Diperbarui</span>
              <span className="text-[#111827] font-medium text-xs block">
                {formatDate(location.updatedAt)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-zinc-50/60 border-t border-[#E5E7EB]">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={onClose}
          >
            Tutup
          </Button>

          {canManage && (
            <div className="flex items-center gap-2">
              {onToggleAttendance && location.isActive && location.latitude !== null && (
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => {
                    onClose();
                    onToggleAttendance(location);
                  }}
                >
                  {location.isAttendanceEnabled ? 'Nonaktifkan Presensi' : 'Jadikan Lokasi Presensi'}
                </Button>
              )}

              {onEdit && (
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  leftIcon={<Edit2 className="w-4 h-4" />}
                  onClick={() => {
                    onClose();
                    onEdit(location);
                  }}
                >
                  Edit Lokasi
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
