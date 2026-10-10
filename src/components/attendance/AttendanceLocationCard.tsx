import React from 'react';
import { MapPin, Info, CheckCircle2, XCircle, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { LocationModel } from '../../types/location.types';
import { LocationValidationState, formatDistanceDisplay } from '../../utils/geoUtils';

interface AttendanceLocationCardProps {
  location?: LocationModel | null;
  activeLocations?: LocationModel[];
  validation?: LocationValidationState | null;
  geoDetecting?: boolean;
  loading: boolean;
  onRefreshLocation?: () => void;
}

export const AttendanceLocationCard: React.FC<AttendanceLocationCardProps> = ({
  location,
  activeLocations = [],
  validation,
  geoDetecting = false,
  loading,
  onRefreshLocation,
}) => {
  if (loading) {
    return (
      <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-6 shadow-2xs animate-pulse space-y-3">
        <div className="h-4 bg-[#F3F4F6] rounded w-1/3" />
        <div className="h-10 bg-[#F3F4F6] rounded-xl" />
      </div>
    );
  }

  const effectiveLocations = activeLocations.length > 0 ? activeLocations : location ? [location] : [];

  if (effectiveLocations.length === 0) {
    return (
      <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-5 sm:p-6 shadow-2xs space-y-3">
        <div className="flex items-center gap-2 text-amber-700 text-xs font-semibold">
          <Info className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Titik lokasi presensi belum dikonfigurasi atau belum aktif.</span>
        </div>
      </div>
    );
  }

  // Determine current active display location
  const displayLocation =
    validation?.status === 'in_radius' && validation.matchedLocation
      ? validation.matchedLocation
      : (validation?.status === 'out_of_radius' || validation?.status === 'uncertain') && validation.nearestLocation
      ? validation.nearestLocation
      : location || effectiveLocations[0];

  const getStatusBadge = () => {
    if (geoDetecting || (validation?.status === 'detecting')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[11px] font-semibold border border-blue-200">
          <Loader2 className="w-3 h-3 animate-spin" />
          Cek GPS...
        </span>
      );
    }
    if (validation?.status === 'in_radius') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[11px] font-semibold border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          Dalam Radius
        </span>
      );
    }
    if (validation?.status === 'out_of_radius') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-50 text-rose-700 text-[11px] font-semibold border border-rose-200">
          <XCircle className="w-3 h-3 text-rose-500" />
          Di Luar Radius
        </span>
      );
    }
    if (validation?.status === 'uncertain') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-700 text-[11px] font-semibold border border-amber-200">
          <AlertCircle className="w-3 h-3 text-amber-600" />
          Akurasi Rendah
        </span>
      );
    }
    if (validation?.status === 'error') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-50 text-rose-700 text-[11px] font-semibold border border-rose-200">
          <AlertCircle className="w-3 h-3 text-rose-600" />
          GPS Gagal
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[11px] font-semibold border border-emerald-200">
        {effectiveLocations.length > 1 ? `${effectiveLocations.length} Titik Aktif` : 'Titik Aktif'}
      </span>
    );
  };

  return (
    <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-5 sm:p-6 shadow-2xs space-y-3">
      <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#F3F4F6] text-[#111827] flex items-center justify-center shrink-0">
            <MapPin className="w-4 h-4 text-[#F97316]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-[#111827]">{displayLocation.name}</h4>
              {effectiveLocations.length > 1 && (
                <span className="text-[10px] text-[#6B7280] bg-[#F3F4F6] px-1.5 py-0.2 rounded font-normal">
                  1 dari {effectiveLocations.length} titik
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#6B7280]">
              Kode: {displayLocation.code} · Radius {displayLocation.radiusMeters}m
              {validation?.nearestDistanceMeters !== null && validation?.nearestDistanceMeters !== undefined && (
                <span> · Jarak ±{formatDistanceDisplay(validation.nearestDistanceMeters)}</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {getStatusBadge()}
          {onRefreshLocation && (
            <button
              type="button"
              onClick={onRefreshLocation}
              disabled={geoDetecting}
              title="Perbarui GPS"
              className="p-1 rounded-lg text-[#9CA3AF] hover:text-[#111827] hover:bg-[#F3F4F6] transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${geoDetecting ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </div>

      <div className="text-xs text-[#6B7280] flex items-center gap-2 pt-1 justify-between">
        <div className="flex items-center gap-2 truncate">
          <span className="font-medium text-[#111827] shrink-0">Alamat Titik Presensi:</span>
          <span className="truncate">{displayLocation.address || 'Gedung Utama Sekolah'}</span>
        </div>
        {effectiveLocations.length > 1 && (
          <span className="text-[10px] text-[#9CA3AF] shrink-0">
            {effectiveLocations.map((l) => l.name).join(' · ')}
          </span>
        )}
      </div>
    </div>
  );
};

