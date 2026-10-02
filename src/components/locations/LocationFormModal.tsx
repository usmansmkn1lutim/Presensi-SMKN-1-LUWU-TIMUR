import React, { useState, useEffect } from 'react';
import {
  X,
  MapPin,
  Compass,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Info,
  Building2,
} from 'lucide-react';
import { Button } from '../ui/Button';
import {
  LocationModel,
  LocationType,
} from '../../types/location.types';
import { locationService } from '../../services/locationService';

interface LocationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  locationToEdit?: LocationModel | null;
  onSuccess: (savedLocation: LocationModel, mode: 'create' | 'edit') => void;
}

const LOCATION_TYPE_OPTIONS: { value: LocationType; label: string; desc: string }[] = [
  { value: 'office', label: 'Office (Kantor / TU)', desc: 'Ruang tata usaha, pimpinan, atau administrasi sekolah' },
  { value: 'teacher_room', label: 'Teacher Room (Ruang Guru)', desc: 'Ruang kantor dan kerja tenaga pendidik' },
  { value: 'laboratory', label: 'Laboratory (Laboratorium / Bengkel)', desc: 'Lab komputer, bengkel kejuruan, atau ruang praktik' },
  { value: 'other', label: 'Other (Lainnya)', desc: 'Gedung serbaguna, perpustakaan, atau area unit khusus' },
];

export const LocationFormModal: React.FC<LocationFormModalProps> = ({
  isOpen,
  onClose,
  locationToEdit,
  onSuccess,
}) => {
  const isEditMode = Boolean(locationToEdit);

  // Form Fields
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [locationType, setLocationType] = useState<LocationType>('office');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState<string>('');
  const [longitude, setLongitude] = useState<string>('');
  const [radiusMeters, setRadiusMeters] = useState<string>('100');
  const [isAttendanceEnabled, setIsAttendanceEnabled] = useState(false);
  const [isActive, setIsActive] = useState(true);

  // Status & Feedback States
  const [isLoading, setIsLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [geoFeedback, setGeoFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Populate form on edit mode change
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setGeoFeedback(null);

      if (locationToEdit) {
        setName(locationToEdit.name);
        setCode(locationToEdit.code);
        setLocationType(locationToEdit.locationType);
        setDescription(locationToEdit.description || '');
        setAddress(locationToEdit.address || '');
        setLatitude(locationToEdit.latitude !== null ? locationToEdit.latitude.toString() : '');
        setLongitude(locationToEdit.longitude !== null ? locationToEdit.longitude.toString() : '');
        setRadiusMeters(locationToEdit.radiusMeters.toString());
        setIsAttendanceEnabled(locationToEdit.isAttendanceEnabled);
        setIsActive(locationToEdit.isActive);
      } else {
        setName('');
        setCode('');
        setLocationType('office');
        setDescription('');
        setAddress('');
        setLatitude('');
        setLongitude('');
        setRadiusMeters('100');
        setIsAttendanceEnabled(false);
        setIsActive(true);
      }
    }
  }, [isOpen, locationToEdit]);

  if (!isOpen) return null;

  // Handle "Gunakan Lokasi Saya" via Browser Geolocation API
  const handleGetCurrentLocation = () => {
    setGeoFeedback(null);

    if (!('geolocation' in navigator)) {
      setGeoFeedback({
        type: 'error',
        message: 'Browser tidak mendukung fitur lokasi. Masukkan koordinat secara manual.',
      });
      return;
    }

    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        setLatitude(lat.toFixed(6));
        setLongitude(lng.toFixed(6));
        setGeoFeedback({
          type: 'success',
          message: 'Lokasi berhasil diperoleh. Silakan periksa kembali koordinat sebelum menyimpan.',
        });
      },
      (error) => {
        setIsLocating(false);
        let msg = 'Gagal memperoleh lokasi saat ini.';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            msg = 'Izin lokasi ditolak. Izinkan akses lokasi pada browser lalu coba lagi.';
            break;
          case error.POSITION_UNAVAILABLE:
            msg = 'Lokasi perangkat tidak tersedia. Pastikan layanan lokasi aktif lalu coba lagi.';
            break;
          case error.TIMEOUT:
            msg = 'Pengambilan lokasi terlalu lama. Silakan coba lagi.';
            break;
          default:
            msg = 'Gagal mengakses sensor lokasi. Masukkan koordinat secara manual.';
            break;
        }
        setGeoFeedback({ type: 'error', message: msg });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // Handle Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedName = name.trim();
    const trimmedCode = code.trim().toUpperCase();

    // 1. Name & Code validation
    if (!trimmedName) {
      setErrorMessage('Nama lokasi wajib diisi.');
      return;
    }
    if (!trimmedCode) {
      setErrorMessage('Kode lokasi wajib diisi.');
      return;
    }

    // 2. Radius validation
    const parsedRadius = Number(radiusMeters);
    if (isNaN(parsedRadius) || parsedRadius <= 0 || parsedRadius > 500) {
      setErrorMessage('Radius presensi harus bernilai antara 1 hingga 500 meter.');
      return;
    }

    // 3. Coordinates parsing & range validation
    let parsedLat: number | null = null;
    let parsedLng: number | null = null;

    if (latitude.trim() !== '') {
      parsedLat = Number(latitude);
      if (isNaN(parsedLat) || parsedLat < -90 || parsedLat > 90) {
        setErrorMessage('Nilai latitude harus berada dalam rentang -90 sampai 90.');
        return;
      }
    }

    if (longitude.trim() !== '') {
      parsedLng = Number(longitude);
      if (isNaN(parsedLng) || parsedLng < -180 || parsedLng > 180) {
        setErrorMessage('Nilai longitude harus berada dalam rentang -180 sampai 180.');
        return;
      }
    }

    // 4. Attendance location requirement: coordinates must NOT be null
    if (isAttendanceEnabled) {
      if (parsedLat === null || parsedLng === null) {
        setErrorMessage('Lokasi presensi aktif wajib memiliki koordinat latitude dan longitude yang valid.');
        return;
      }
    }

    setIsLoading(true);

    try {
      if (isEditMode && locationToEdit) {
        const updated = await locationService.updateLocation(locationToEdit.id, {
          name: trimmedName,
          code: trimmedCode,
          location_type: locationType,
          description: description.trim() || null,
          address: address.trim() || null,
          latitude: parsedLat,
          longitude: parsedLng,
          radius_meters: parsedRadius,
          is_attendance_enabled: isAttendanceEnabled,
          is_active: isActive,
        });
        onSuccess(updated, 'edit');
      } else {
        const created = await locationService.createLocation({
          name: trimmedName,
          code: trimmedCode,
          location_type: locationType,
          description: description.trim() || null,
          address: address.trim() || null,
          latitude: parsedLat,
          longitude: parsedLng,
          radius_meters: parsedRadius,
          is_attendance_enabled: isAttendanceEnabled,
          is_active: isActive,
        });
        onSuccess(created, 'create');
      }
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Gagal menyimpan data lokasi. Silakan coba lagi.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-[#E5E7EB] my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#F97316] flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#111827]">
                {isEditMode ? 'Edit Lokasi' : 'Tambah Lokasi Baru'}
              </h2>
              <p className="text-xs text-[#6B7280]">
                {isEditMode
                  ? 'Perbarui informasi titik lokasi dan batas geofence'
                  : 'Daftarkan titik lokasi baru untuk presensi pegawai'}
              </p>
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

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Top Error Alert */}
          {errorMessage && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          {/* Section 1: Informasi Dasar Lokasi */}
          <div className="space-y-3.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#9CA3AF]">
              Informasi Lokasi
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#374151] mb-1">
                  Nama Lokasi <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Kantor/TU"
                  required
                  disabled={isLoading}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-[#E5E7EB] rounded-xl text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#374151] mb-1">
                  Kode <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="OFFICE"
                  required
                  disabled={isLoading}
                  className="w-full px-3.5 py-2 text-sm font-mono uppercase bg-white border border-[#E5E7EB] rounded-xl text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316] transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#374151] mb-1">
                Tipe Lokasi <span className="text-red-500">*</span>
              </label>
              <select
                value={locationType}
                onChange={(e) => setLocationType(e.target.value as LocationType)}
                disabled={isLoading}
                className="w-full px-3.5 py-2 text-sm bg-white border border-[#E5E7EB] rounded-xl text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316] transition-all"
              >
                {LOCATION_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#374151] mb-1">
                Deskripsi <span className="text-xs font-normal text-[#9CA3AF]">(Opsional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Keterangan fungsi atau ruangan..."
                rows={2}
                disabled={isLoading}
                className="w-full px-3.5 py-2 text-sm bg-white border border-[#E5E7EB] rounded-xl text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316] transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#374151] mb-1">
                Alamat / Petunjuk Arah <span className="text-xs font-normal text-[#9CA3AF]">(Opsional)</span>
              </label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Contoh: Gedung A Lt. 1, SMKN 1 Luwu Timur"
                rows={2}
                disabled={isLoading}
                className="w-full px-3.5 py-2 text-sm bg-white border border-[#E5E7EB] rounded-xl text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316] transition-all"
              />
            </div>
          </div>

          {/* Section 2: Koordinat GPS & Tombol "Gunakan Lokasi Saya" */}
          <div className="space-y-3.5 pt-3 border-t border-[#E5E7EB]">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#9CA3AF]">
                Koordinat GPS
              </h3>
              <button
                type="button"
                onClick={handleGetCurrentLocation}
                disabled={isLoading || isLocating}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-[#F97316] bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                {isLocating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Mencari Lokasi...</span>
                  </>
                ) : (
                  <>
                    <Compass className="w-3.5 h-3.5" />
                    <span>Gunakan Lokasi Saya</span>
                  </>
                )}
              </button>
            </div>

            {/* Geolocation Feedback Message */}
            {geoFeedback && (
              <div
                className={`p-3 rounded-xl flex items-start gap-2 text-xs animate-in fade-in ${
                  geoFeedback.type === 'success'
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                    : 'bg-amber-50 border border-amber-200 text-amber-800'
                }`}
              >
                {geoFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                )}
                <span>{geoFeedback.message}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#374151] mb-1">
                  Latitude (-90 s/d 90)
                </label>
                <input
                  type="number"
                  step="any"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  placeholder="-2.585521"
                  disabled={isLoading}
                  className="w-full px-3.5 py-2 text-sm font-mono bg-white border border-[#E5E7EB] rounded-xl text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#374151] mb-1">
                  Longitude (-180 s/d 180)
                </label>
                <input
                  type="number"
                  step="any"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  placeholder="121.145892"
                  disabled={isLoading}
                  className="w-full px-3.5 py-2 text-sm font-mono bg-white border border-[#E5E7EB] rounded-xl text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316] transition-all"
                />
              </div>
            </div>
            <p className="text-[11px] text-[#6B7280]">
              Kosongkan jika koordinat belum diketahui (status presensi wajib nonaktif jika belum ada koordinat).
            </p>
          </div>

          {/* Section 3: Pengaturan Presensi & Radius */}
          <div className="space-y-3.5 pt-3 border-t border-[#E5E7EB]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#9CA3AF]">
              Pengaturan Presensi
            </h3>

            <div>
              <label className="block text-xs font-semibold text-[#374151] mb-1">
                Radius Geofence Presensi (Meter) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={radiusMeters}
                  onChange={(e) => setRadiusMeters(e.target.value)}
                  placeholder="100"
                  required
                  disabled={isLoading}
                  className="w-full px-3.5 py-2 pr-16 text-sm font-semibold bg-white border border-[#E5E7EB] rounded-xl text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316] transition-all"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-[#6B7280]">
                  Meter
                </span>
              </div>
              <p className="text-[11px] text-[#6B7280] mt-1">
                Batas jarak maksimal toleransi presensi dari titik koordinat (1 s/d 500 meter).
              </p>
            </div>

            {/* Checkbox: Jadikan Lokasi Presensi */}
            <div className="bg-orange-50/60 border border-orange-200/80 rounded-xl p-3.5 space-y-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAttendanceEnabled}
                  onChange={(e) => setIsAttendanceEnabled(e.target.checked)}
                  disabled={isLoading}
                  className="mt-0.5 w-4 h-4 rounded text-[#F97316] focus:ring-[#F97316] border-[#E5E7EB]"
                />
                <div className="text-xs">
                  <span className="font-bold text-[#111827] block">
                    Gunakan sebagai Lokasi Presensi Pegawai
                  </span>
                  <span className="text-[#6B7280] block mt-0.5">
                    Pada V1, hanya satu lokasi yang dapat aktif sebagai titik presensi pegawai dalam satu waktu.
                  </span>
                </div>
              </label>

              {isAttendanceEnabled && (
                <div className="flex items-start gap-2 pt-2 border-t border-orange-200/60 text-[11px] text-amber-800">
                  <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    Lokasi ini akan digunakan untuk presensi pegawai. Koordinat latitude dan longitude wajib diisi.
                  </span>
                </div>
              )}
            </div>

            {/* Checkbox: Status Aktif */}
            <label className="flex items-center gap-3 p-3 bg-zinc-50 border border-[#E5E7EB] rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                disabled={isLoading}
                className="w-4 h-4 rounded text-[#F97316] focus:ring-[#F97316] border-[#E5E7EB]"
              />
              <div className="text-xs">
                <span className="font-semibold text-[#111827] block">
                  Status Lokasi Aktif
                </span>
                <span className="text-[#6B7280] text-[11px]">
                  Lokasi nonaktif tidak dapat digunakan untuk operasional sistem presensi.
                </span>
              </div>
            </label>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E5E7EB]">
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
              type="submit"
              variant="primary"
              size="md"
              isLoading={isLoading}
            >
              {isEditMode ? 'Simpan Perubahan' : 'Tambah Lokasi'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
