import React, { useState } from 'react';
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
  Edit2,
  Check,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { profileService } from '../../services/profileService';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { RoleBadge, Badge } from '../../components/ui/Badge';
import { APP_CONFIG } from '../../config/appConfig';

export const ProfilePage: React.FC = () => {
  const { user, profile, logout, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [isEditing, setIsEditing] = useState(false);
  const [fullNameInput, setFullNameInput] = useState(user?.name || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!user) return null;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleStartEdit = () => {
    setFullNameInput(user.name);
    setSaveMessage(null);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setSaveMessage(null);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = fullNameInput.trim();
    if (!trimmedName) {
      setSaveMessage({ type: 'error', text: 'Nama lengkap tidak boleh kosong.' });
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);

    try {
      await profileService.updateMyProfile({ full_name: trimmedName });
      await refreshProfile();
      setSaveMessage({ type: 'success', text: 'Profil berhasil diperbarui.' });
      setIsEditing(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memperbarui profil.';
      setSaveMessage({ type: 'error', text: msg });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile Header Card */}
      <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-5">
            {/* Avatar */}
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
                {!isEditing && (
                  <button
                    onClick={handleStartEdit}
                    className="p-1.5 text-[#6B7280] hover:text-[#F97316] hover:bg-[#FFF7ED] rounded-lg transition-colors cursor-pointer"
                    title="Ubah nama tampilan"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <p className="text-xs sm:text-sm text-[#6B7280] font-mono mt-0.5">
                NIP: {user.nip || 'Belum tercatat'}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <RoleBadge role={user.role} />
                <Badge variant={user.status === 'active' ? 'success' : 'danger'} size="sm">
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

        {/* Edit Form Modal/Drawer in-place */}
        {isEditing && (
          <form onSubmit={handleSaveProfile} className="mt-6 pt-5 border-t border-[#E5E7EB] space-y-4">
            <h4 className="text-xs font-bold text-[#111827] uppercase tracking-wider">
              Ubah Data Profil (Non-Privileged)
            </h4>
            <div className="max-w-md">
              <Input
                label="Nama Lengkap & Gelar"
                value={fullNameInput}
                onChange={(e) => setFullNameInput(e.target.value)}
                placeholder="Nama lengkap"
                required
                disabled={isSaving}
              />
              <p className="text-[11px] text-[#6B7280] mt-1">
                Catatan: Hak akses (role) dan status keaktifan akun dikunci oleh sistem RLS database.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isSaving}
                leftIcon={<Check className="w-4 h-4" />}
              >
                Simpan Perubahan
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCancelEdit}
                disabled={isSaving}
                leftIcon={<X className="w-4 h-4" />}
              >
                Batal
              </Button>
            </div>
          </form>
        )}

        {/* Status Feedback Message */}
        {saveMessage && (
          <div
            className={`mt-4 p-3 rounded-xl border flex items-center gap-2 text-xs ${
              saveMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}
          >
            {saveMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{saveMessage.text}</span>
          </div>
        )}
      </div>

      {/* Account & Kepegawaian Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal / Account Info */}
        <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-[#111827] uppercase tracking-wider pb-3 border-b border-[#E5E7EB]">
            Informasi Akun Supabase
          </h3>

          <div className="space-y-3.5 text-xs">
            <div className="flex items-start gap-3">
              <Mail className="w-4 h-4 text-[#9CA3AF] shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-[#6B7280]">Alamat Email (auth.users)</p>
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
                <p className="font-semibold text-[#6B7280]">Otorisasi Role (profiles.role)</p>
                <p className="text-sm font-medium text-[#111827] mt-0.5 capitalize">
                  {user.role.replace('_', ' ')}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="w-4 h-4 text-[#9CA3AF] shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-[#6B7280]">Waktu Login Terakhir (last_login_at)</p>
                <p className="text-sm font-medium text-[#111827] mt-0.5 font-mono">
                  {profile?.last_login_at
                    ? new Date(profile.last_login_at).toLocaleString('id-ID', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })
                    : 'Baru saja'}
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
    </div>
  );
};
