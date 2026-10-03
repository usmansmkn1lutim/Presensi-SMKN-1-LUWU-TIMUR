import React from 'react';
import { MapPin, Info } from 'lucide-react';
import { LocationModel } from '../../types/location.types';

interface AttendanceLocationCardProps {
  location: LocationModel | null;
  loading: boolean;
}

export const AttendanceLocationCard: React.FC<AttendanceLocationCardProps> = ({
  location,
  loading,
}) => {
  if (loading) {
    return (
      <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-6 shadow-2xs animate-pulse space-y-3">
        <div className="h-4 bg-[#F3F4F6] rounded w-1/3" />
        <div className="h-10 bg-[#F3F4F6] rounded-xl" />
      </div>
    );
  }

  if (!location) {
    return (
      <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-5 sm:p-6 shadow-2xs space-y-3">
        <div className="flex items-center gap-2 text-amber-700 text-xs font-semibold">
          <Info className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Lokasi presensi belum dikonfigurasi.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-5 sm:p-6 shadow-2xs space-y-3">
      <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#F3F4F6] text-[#111827] flex items-center justify-center shrink-0">
            <MapPin className="w-4 h-4 text-[#F97316]" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#111827]">{location.name}</h4>
            <p className="text-[11px] text-[#6B7280]">
              Kode: {location.code} · Radius {location.radiusMeters}m
            </p>
          </div>
        </div>
        <span className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[11px] font-semibold border border-emerald-200">
          Titik Aktif
        </span>
      </div>

      <div className="text-xs text-[#6B7280] flex items-center gap-2 pt-1">
        <span className="font-medium text-[#111827]">Alamat Titik Presensi:</span>
        <span>{location.address || 'Gedung Utama Sekolah'}</span>
      </div>
    </div>
  );
};
