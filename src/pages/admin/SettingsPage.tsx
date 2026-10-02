import React from 'react';
import { Settings, Save, Shield } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { APP_CONFIG } from '../../config/appConfig';

export const SettingsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-5 sm:p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">
              Konfigurasi Sistem
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-[#111827] mt-0.5">
              Pengaturan Aplikasi
            </h2>
            <p className="text-xs text-[#6B7280] mt-1">
              Parameter global presensi pegawai SMK Negeri 1 Luwu Timur
            </p>
          </div>
          <div>
            <Button variant="primary" size="md" leftIcon={<Save className="w-4 h-4" />}>
              Simpan Pengaturan
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 space-y-5">
        <h3 className="text-sm font-bold text-[#111827] pb-2 border-b border-[#E5E7EB]">
          Parameter Presensi & Keamanan
        </h3>

        <div className="space-y-4 text-xs">
          <div className="flex items-center justify-between py-2 border-b border-[#E5E7EB]/60">
            <div>
              <p className="font-bold text-[#111827]">Wajib GPS & Radius Validasi</p>
              <p className="text-[#6B7280]">Pegawai hanya dapat presensi jika berada dalam batas radius sekolah</p>
            </div>
            <input
              type="checkbox"
              defaultChecked
              className="w-4 h-4 rounded text-[#F97316] border-[#D1D5DB]"
            />
          </div>

          <div className="flex items-center justify-between py-2 border-b border-[#E5E7EB]/60">
            <div>
              <p className="font-bold text-[#111827]">Wajib Foto Selfie (Deteksi Wajah)</p>
              <p className="text-[#6B7280]">Mengambil swafoto saat tombol presensi masuk dan pulang ditekan</p>
            </div>
            <input
              type="checkbox"
              defaultChecked
              className="w-4 h-4 rounded text-[#F97316] border-[#D1D5DB]"
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-bold text-[#111827]">Anti Fake GPS & Mock Location</p>
              <p className="text-[#6B7280]">Mendeteksi aplikasi pemalsu lokasi perangkat lunak</p>
            </div>
            <input
              type="checkbox"
              defaultChecked
              className="w-4 h-4 rounded text-[#F97316] border-[#D1D5DB]"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
