import React from 'react';
import { MapPin, Plus, Navigation } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { APP_CONFIG } from '../../config/appConfig';

export const LocationsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-5 sm:p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">
              Geofencing & Koordinat
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-[#111827] mt-0.5">
              Titik Lokasi Presensi
            </h2>
            <p className="text-xs text-[#6B7280] mt-1">
              Pengaturan titik koordinat latitude/longitude dan radius presensi sah
            </p>
          </div>
          <div>
            <Button variant="primary" size="md" leftIcon={<Plus className="w-4 h-4" />}>
              Tambah Titik Lokasi
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#F97316] flex items-center justify-center">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#111827]">Kampus Utama SMKN 1 Luwu Timur</h3>
              <p className="text-xs text-[#6B7280]">{APP_CONFIG.schoolAddress}</p>
            </div>
          </div>
          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
            Lokasi Utama
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-[#E5E7EB] text-xs">
          <div>
            <p className="text-[#6B7280]">Latitude</p>
            <p className="font-mono font-semibold text-[#111827] mt-0.5">-2.585521</p>
          </div>
          <div>
            <p className="text-[#6B7280]">Longitude</p>
            <p className="font-mono font-semibold text-[#111827] mt-0.5">121.145892</p>
          </div>
          <div>
            <p className="text-[#6B7280]">Radius Sah</p>
            <p className="font-semibold text-[#111827] mt-0.5">100 Meter</p>
          </div>
        </div>
      </div>
    </div>
  );
};
