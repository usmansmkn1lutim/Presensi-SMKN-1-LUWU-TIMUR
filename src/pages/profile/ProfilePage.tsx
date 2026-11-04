import React, { useState, useEffect, useRef } from 'react';
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
  Camera,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { profileService } from '../../services/profileService';
import { employeeService, EmployeeWithRelations } from '../../services/employeeService';
import {
  getPrivatePhotoSignedUrl,
  uploadProfilePhoto,
  uploadEmployeePhoto,
  deletePhotoObject,
} from '../../services/photoStorageService';
import { processImageToWebP } from '../../utils/imageUtils';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { RoleBadge, Badge } from '../../components/ui/Badge';
import { ImageCropperModal } from '../../components/ui/ImageCropperModal';
import { DeletePhotoConfirmModal } from '../../components/ui/DeletePhotoConfirmModal';
import { APP_CONFIG } from '../../config/appConfig';

export const ProfilePage: React.FC = () => {
  const { user, profile, logout, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [isEditing, setIsEditing] = useState(false);
  const [fullNameInput, setFullNameInput] = useState(user?.name || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Photo management state
  const [signedPhotoUrl, setSignedPhotoUrl] = useState<string | null>(null);
  const [linkedEmployee, setLinkedEmployee] = useState<EmployeeWithRelations | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let isMounted = true;
    const loadPhotoAndEmployee = async () => {
      if (!user) return;
      try {
        const emp = await employeeService.getEmployeeByProfileId(user.id);
        if (isMounted) {
          setLinkedEmployee(emp);
          const activePath = emp?.photo_url || profile?.avatar_url;
          if (activePath) {
            const signed = await getPrivatePhotoSignedUrl(activePath);
            if (isMounted) setSignedPhotoUrl(signed);
          } else {
            if (isMounted) setSignedPhotoUrl(null);
          }
        }
      } catch (err) {
        console.warn('Failed to load profile photo/employee link:', err);
      }
    };
    loadPhotoAndEmployee();
    return () => {
      isMounted = false;
    };
  }, [user, profile]);

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

  // Photo cropper modal state
  const [selectedFileForCropper, setSelectedFileForCropper] = useState<File | null>(null);
  const [isCropperOpen, setIsCropperOpen] = useState<boolean>(false);

  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setSelectedFileForCropper(file);
    setIsCropperOpen(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCropSave = async (croppedFile: File) => {
    setIsUploadingPhoto(true);
    setSaveMessage(null);

    try {
      const processed = await processImageToWebP(croppedFile);
      let newPath = '';
      const oldPath = linkedEmployee?.photo_url || profile?.avatar_url;

      if (linkedEmployee) {
        newPath = await uploadEmployeePhoto(linkedEmployee.id, processed.file);
        await employeeService.updateEmployeePhoto(linkedEmployee.id, newPath);
      } else {
        newPath = await uploadProfilePhoto(user.id, processed.file);
        await profileService.updateMyProfilePhoto(newPath);
      }

      if (oldPath && oldPath !== newPath) {
        await deletePhotoObject(oldPath);
      }

      const signed = await getPrivatePhotoSignedUrl(newPath);
      setSignedPhotoUrl(signed);
      await refreshProfile();
      setSaveMessage({ type: 'success', text: 'Foto profil berhasil diperbarui.' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mengunggah foto.';
      setSaveMessage({ type: 'error', text: msg });
      throw err;
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Delete photo confirmation state
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const handleDeleteClick = () => {
    setSaveMessage(null);
    setIsDeleteConfirmOpen(true);
  };

  const handleConfirmDeletePhoto = async () => {
    setIsUploadingPhoto(true);
    setSaveMessage(null);

    try {
      const oldPath = linkedEmployee?.photo_url || profile?.avatar_url;
      if (linkedEmployee) {
        await employeeService.updateEmployeePhoto(linkedEmployee.id, null);
      } else {
        await profileService.updateMyProfilePhoto(null);
      }

      if (oldPath) {
        await deletePhotoObject(oldPath);
      }

      setSignedPhotoUrl(null);
      await refreshProfile();
      setSaveMessage({ type: 'success', text: 'Foto profil berhasil dihapus.' });
      setIsDeleteConfirmOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus foto.';
      setSaveMessage({ type: 'error', text: msg });
      setIsDeleteConfirmOpen(false);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile Header Card */}
      <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5 sm:gap-6">
            {/* Avatar & Photo Upload Widget */}
            <div className="relative group">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-[#FFF7ED] border-2 border-orange-200 text-[#F97316] flex items-center justify-center font-bold text-2xl sm:text-3xl shadow-xs overflow-hidden relative">
                {signedPhotoUrl ? (
                  <img
                    src={signedPhotoUrl}
                    alt={user.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span>{user.name.charAt(0)}</span>
                )}

                {isUploadingPhoto && (
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-2xs flex items-center justify-center text-white">
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>

              {/* Hover Overlay Button to Change Photo */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingPhoto}
                className="absolute -bottom-1 -right-1 p-2 bg-[#F97316] hover:bg-[#EA580C] text-white rounded-full shadow-md transition-transform hover:scale-105 cursor-pointer"
                title="Unggah atau Ganti Foto"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handlePhotoFileChange}
              />
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

              {signedPhotoUrl && !isUploadingPhoto && (
                <button
                  type="button"
                  onClick={handleDeleteClick}
                  className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Foto</span>
                </button>
              )}
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

      {/* Image Cropper Modal */}
      <ImageCropperModal
        isOpen={isCropperOpen}
        imageFile={selectedFileForCropper}
        onClose={() => {
          setIsCropperOpen(false);
          setSelectedFileForCropper(null);
        }}
        onCropComplete={handleCropSave}
        title="Potong Foto Profil Saya"
      />

      {/* Delete Photo Confirmation Modal */}
      <DeletePhotoConfirmModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDeletePhoto}
        isDeleting={isUploadingPhoto}
      />
    </div>
  );
};
