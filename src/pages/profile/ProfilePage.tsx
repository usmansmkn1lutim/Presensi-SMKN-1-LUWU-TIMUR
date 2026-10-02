import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User as UserIcon,
  Mail,
  Briefcase,
  Building,
  Calendar,
  Phone,
  Shield,
  LogOut,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { RoleBadge, Badge } from '../../components/ui/Badge';
import { APP_CONFIG } from '../../config/appConfig';

export const ProfilePage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="space-y-6">
      {/* Profile Header Card */}
      <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-5">
            {/* Avatar Placeholder */}
            <div className="relative">
              <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-[#FFF7ED] border-2 border-orange-200 text-[#F97316] flex items-center justify-center font-bold text-2xl shadow-xs">
                {user.name.charAt(0)}
              </div>
              <div className="absolute -bottom-1 -right-1 p-1 bg-white rounded-full shadow-2xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-[#111827]">{user.name}</h2>
              </div>
              <p className="text-xs sm:text-sm text-[#6B7280] font-mono mt-0.5">
                NIP: {user.nip || 'Belum tercatat'}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <RoleBadge role={user.role} />
                <Badge variant="success" size="sm">
                  {user.status === 'active' ? 'Akun Aktif' : 'Nonaktif'}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="md"
              onClick={handleLogout}
              leftIcon={<LogOut className="w-4 h-4 text-red-600" />}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
            >
              Keluar Akun
            </Button>
          </div>
        </div>
      </div>

      {/* Account & Kepegawaian Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal / Account Info */}
        <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-[#111827] uppercase tracking-wider pb-3 border-b border-[#E5E7EB]">
            Informasi Akun
          </h3>

          <div className="space-y-3.5 text-xs">
            <div className="flex items-start gap-3">
              <Mail className="w-4 h-4 text-[#9CA3AF] shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-[#6B7280]">Alamat Email</p>
                <p className="text-sm font-medium text-[#111827] mt-0.5">{user.email}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Phone className="w-4 h-4 text-[#9CA3AF] shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-[#6B7280]">Nomor Telepon / WhatsApp</p>
                <p className="text-sm font-medium text-[#111827] mt-0.5">
                  {user.phoneNumber || '+62 812-3456-7890'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Shield className="w-4 h-4 text-[#9CA3AF] shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-[#6B7280]">Role & Otorisasi</p>
                <p className="text-sm font-medium text-[#111827] mt-0.5 capitalize">
                  {user.role.replace('_', ' ')}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="w-4 h-4 text-[#9CA3AF] shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-[#6B7280]">Terdaftar Sejak</p>
                <p className="text-sm font-medium text-[#111827] mt-0.5">
                  {user.joinedDate || '1 Januari 2020'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Kepegawaian & Unit Kerja */}
        <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-[#111827] uppercase tracking-wider pb-3 border-b border-[#E5E7EB]">
            Satuan Kerja & Jabatan
          </h3>

          <div className="space-y-3.5 text-xs">
            <div className="flex items-start gap-3">
              <Building className="w-4 h-4 text-[#9CA3AF] shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-[#6B7280]">Satuan Pendidikan</p>
                <p className="text-sm font-medium text-[#111827] mt-0.5">{APP_CONFIG.schoolName}</p>
                <p className="text-[11px] text-[#9CA3AF]">{APP_CONFIG.schoolAddress}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Briefcase className="w-4 h-4 text-[#9CA3AF] shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-[#6B7280]">Jabatan / Tugas Pokok</p>
                <p className="text-sm font-medium text-[#111827] mt-0.5">{user.position}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <UserIcon className="w-4 h-4 text-[#9CA3AF] shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-[#6B7280]">Departemen / Bidang</p>
                <p className="text-sm font-medium text-[#111827] mt-0.5">{user.department}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notice regarding Phase 2 & Supabase Integration */}
      <div className="p-4 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] flex items-start gap-3 text-xs text-[#6B7280]">
        <Info className="w-4 h-4 text-[#F97316] shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-[#111827]">Integrasi Profil Supabase (Phase 2):</span>{' '}
          Fitur pengeditan profil, pengubahan kata sandi, dan sinkronisasi foto biometrik akan aktif
          secara otomatis setelah database Supabase dan Row Level Security dihubungkan pada tahap
          selanjutnya.
        </div>
      </div>
    </div>
  );
};
