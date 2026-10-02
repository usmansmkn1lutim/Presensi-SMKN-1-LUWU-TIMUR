import React, { useState } from 'react';
import {
  AlertTriangle,
  MapPin,
  Power,
  X,
  AlertCircle,
  Radio,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { LocationModel } from '../../types/location.types';
import { locationService } from '../../services/locationService';

export type LocationConfirmActionType =
  | 'deactivate'
  | 'activate'
  | 'enable_attendance'
  | 'disable_attendance';

interface LocationConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  location: LocationModel | null;
  actionType: LocationConfirmActionType;
  onSuccess: (updatedLocation: LocationModel, message: string) => void;
}

export const LocationConfirmModal: React.FC<LocationConfirmModalProps> = ({
  isOpen,
  onClose,
  location,
  actionType,
  onSuccess,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !location) return null;

  let title = '';
  let description = '';
  let confirmButtonLabel = '';
  let confirmButtonVariant: 'primary' | 'danger' | 'outline' = 'primary';
  let icon = <AlertTriangle className="w-5 h-5" />;
  let iconBg = 'bg-orange-50 text-[#F97316]';

  switch (actionType) {
    case 'deactivate':
      title = 'Nonaktifkan Lokasi Ini?';
      description = `Lokasi "${location.name}" (${location.code}) yang dinonaktifkan tidak dapat digunakan sebagai lokasi aktif dalam sistem presensi.`;
      confirmButtonLabel = 'Nonaktifkan';
      confirmButtonVariant = 'danger';
      icon = <Power className="w-5 h-5" />;
      iconBg = 'bg-red-50 text-red-600';
      break;

    case 'activate':
      title = 'Aktifkan Kembali Lokasi?';
      description = `Lokasi "${location.name}" (${location.code}) akan kembali aktif dan dapat dikonfigurasi dalam sistem.`;
      confirmButtonLabel = 'Aktifkan';
      confirmButtonVariant = 'primary';
      icon = <Power className="w-5 h-5" />;
      iconBg = 'bg-emerald-50 text-emerald-600';
      break;

    case 'enable_attendance':
      title = 'Jadikan Lokasi Presensi?';
      description = `Lokasi "${location.name}" akan dijadikan titik presensi utama pegawai. Pada V1, hanya 1 lokasi yang dapat menjadi lokasi presensi aktif secara bersamaan.`;
      confirmButtonLabel = 'Jadikan Lokasi Presensi';
      confirmButtonVariant = 'primary';
      icon = <Radio className="w-5 h-5" />;
      iconBg = 'bg-orange-50 text-[#F97316]';
      break;

    case 'disable_attendance':
      title = 'Nonaktifkan Fungsi Presensi?';
      description = `Lokasi "${location.name}" tidak akan lagi digunakan sebagai titik presensi pegawai. Koordinat dan data radius tetap tersimpan aman.`;
      confirmButtonLabel = 'Nonaktifkan Presensi';
      confirmButtonVariant = 'danger';
      icon = <MapPin className="w-5 h-5" />;
      iconBg = 'bg-amber-50 text-amber-600';
      break;
  }

  const handleConfirm = async () => {
    setErrorMessage(null);
    setIsLoading(true);

    try {
      let updated: LocationModel;
      let msg = '';

      switch (actionType) {
        case 'deactivate':
          updated = await locationService.setLocationActive(location.id, false);
          msg = `Lokasi "${location.name}" berhasil dinonaktifkan.`;
          break;

        case 'activate':
          updated = await locationService.setLocationActive(location.id, true);
          msg = `Lokasi "${location.name}" berhasil diaktifkan kembali.`;
          break;

        case 'enable_attendance':
          updated = await locationService.setAttendanceEnabled(location.id, true);
          msg = `Lokasi "${location.name}" kini aktif sebagai lokasi presensi pegawai.`;
          break;

        case 'disable_attendance':
          updated = await locationService.setAttendanceEnabled(location.id, false);
          msg = `Fungsi presensi pada lokasi "${location.name}" berhasil dinonaktifkan.`;
          break;
      }

      onSuccess(updated, msg);
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Terjadi kesalahan saat memproses permintaan. Silakan coba lagi.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-[#E5E7EB] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB]">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}>
              {icon}
            </div>
            <div>
              <h2 className="text-base font-bold text-[#111827]">{title}</h2>
              <p className="text-xs text-[#6B7280]">Konfirmasi Tindakan Administratif</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="text-[#9CA3AF] hover:text-[#111827] p-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          <p className="text-sm text-[#374151] leading-relaxed">
            {description}
          </p>

          <div className="bg-zinc-50 border border-[#E5E7EB] rounded-xl p-3.5 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-[#6B7280]">Nama Lokasi:</span>
              <span className="font-semibold text-[#111827]">{location.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6B7280]">Kode:</span>
              <span className="font-mono font-semibold text-[#111827]">{location.code}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6B7280]">Radius Geofence:</span>
              <span className="font-semibold text-[#111827]">{location.radiusMeters} Meter</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-zinc-50/60 border-t border-[#E5E7EB]">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={onClose}
            disabled={isLoading}
          >
            Batal
          </Button>
          <Button
            type="button"
            variant={confirmButtonVariant}
            size="md"
            isLoading={isLoading}
            onClick={handleConfirm}
          >
            {confirmButtonLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};
