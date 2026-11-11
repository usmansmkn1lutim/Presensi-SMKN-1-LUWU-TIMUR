import React, { useState, useEffect, useRef } from 'react';
import {
  Briefcase,
  Phone,
  Edit2,
  Check,
  CheckCircle2,
  AlertCircle,
  X,
  Camera,
  Trash2,
  IdCard,
  ShieldCheck,
  FileText,
  Pencil,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { profileService } from '../../services/profileService';
import { employeeService, EmployeeWithRelations } from '../../services/employeeService';
import { attendanceHistoryService } from '../../services/attendanceHistoryService';
import {
  getPrivatePhotoSignedUrl,
  uploadProfilePhoto,
  uploadEmployeePhoto,
  deletePhotoObject,
} from '../../services/photoStorageService';
import { processImageToWebP } from '../../utils/imageUtils';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { ImageCropperModal } from '../../components/ui/ImageCropperModal';
import { DeletePhotoConfirmModal } from '../../components/ui/DeletePhotoConfirmModal';
import { APP_CONFIG } from '../../config/appConfig';

export const ProfilePage: React.FC = () => {
  const { user, profile, refreshProfile } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [fullNameInput, setFullNameInput] = useState(user?.name || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Photo management state
  const [signedPhotoUrl, setSignedPhotoUrl] = useState<string | null>(null);
  const [linkedEmployee, setLinkedEmployee] = useState<EmployeeWithRelations | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isPhotoMenuOpen, setIsPhotoMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Monthly attendance summary state
  const [attendanceSummary, setAttendanceSummary] = useState<{
    present: number;
    sickPermitLeave: number;
    absent: number;
  }>({ present: 0, sickPermitLeave: 0, absent: 0 });
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(false);

  // Active tab state
  const [activeTab, setActiveTab] = useState<'identity' | 'position' | 'contact' | 'account' | 'notes'>('identity');

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

  useEffect(() => {
    let isMounted = true;
    const loadMonthlyRecap = async () => {
      if (!linkedEmployee?.id) return;
      setIsLoadingAttendance(true);
      try {
        const now = new Date();
        const recap = await attendanceHistoryService.getMonthlyOfficialStatusRecap(
          now.getFullYear(),
          now.getMonth(),
          linkedEmployee.id
        );
        if (isMounted && recap?.summary) {
          const s = recap.summary;
          const hadir = (s.present || 0) + (s.officialDuty || 0);
          const sakitIzinCuti = (s.sick || 0) + (s.permit || 0) + (s.leave || 0);
          const alfa = s.absent || 0;
          setAttendanceSummary({ present: hadir, sickPermitLeave: sakitIzinCuti, absent: alfa });
        }
      } catch (err) {
        console.warn('Failed to load monthly official status recap:', err);
      } finally {
        if (isMounted) setIsLoadingAttendance(false);
      }
    };
    loadMonthlyRecap();
    return () => {
      isMounted = false;
    };
  }, [linkedEmployee]);

  if (!user) return null;

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
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Top Action Bar */}
      <div>
        <h1 className="text-lg font-bold text-[#111827]">Profil Saya</h1>
      </div>

      {/* 1, 2, 3, 4. Single Horizontal Profile Card */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between gap-4">
          {/* A. Profile Photo (Circular avatar, 64-72px, NO border/ring) */}
          <div className="relative shrink-0">
            <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-[#FFF7ED] text-[#F97316] flex items-center justify-center font-bold text-xl overflow-hidden relative shadow-xs">
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
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>

            {/* Pencil button at bottom-right of avatar */}
            <button
              type="button"
              onClick={() => setIsPhotoMenuOpen(!isPhotoMenuOpen)}
              disabled={isUploadingPhoto}
              className="absolute -bottom-1 -right-1 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white shadow-md border border-[#E5E7EB] text-[#F97316] flex items-center justify-center hover:bg-[#FFF7ED] transition-transform hover:scale-105 cursor-pointer z-10"
              title="Atur Foto"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>

            {/* Dropdown Menu for Photo Actions (Responsive positioning) */}
            {isPhotoMenuOpen && (
              <div className="absolute left-0 mt-2 sm:left-auto sm:right-0 sm:top-auto sm:bottom-10 z-35 w-44 bg-white border border-[#E5E7EB] rounded-xl shadow-xl py-1 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setIsPhotoMenuOpen(false);
                    fileInputRef.current?.click();
                  }}
                  className="w-full text-left px-3.5 py-2.5 hover:bg-[#FFF7ED] text-[#111827] flex items-center gap-2.5 cursor-pointer font-medium"
                >
                  <Camera className="w-4 h-4 text-[#F97316]" />
                  <span>Ganti Foto</span>
                </button>
                {signedPhotoUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsPhotoMenuOpen(false);
                      handleDeleteClick();
                    }}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-red-50 text-red-600 flex items-center gap-2.5 cursor-pointer font-medium border-t border-[#F3F4F6]"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Hapus Foto</span>
                  </button>
                )}
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handlePhotoFileChange}
            />
          </div>

          {/* B. Information User (Name, Jenis Kepegawaian | Jabatan, NO NIP) */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-[#111827] truncate">{user.name}</h2>
              {!isEditing && (
                <button
                  onClick={handleStartEdit}
                  className="text-xs text-[#6B7280] hover:text-[#F97316] transition-colors cursor-pointer"
                  title="Ubah nama"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <p className="text-xs sm:text-sm text-[#4B5563] mt-0.5 truncate">
              {linkedEmployee?.employee_type || 'Pegawai'} | {linkedEmployee?.positions?.name || user.position}
            </p>
          </div>
        </div>

        {/* Edit Form Inline if isEditing */}
        {isEditing && (
          <form onSubmit={handleSaveProfile} className="pt-3 border-t border-[#E5E7EB] space-y-3">
            <h4 className="text-xs font-bold text-[#111827] uppercase tracking-wider">
              Ubah Nama Lengkap & Gelar
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
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isSaving}
                leftIcon={<Check className="w-4 h-4" />}
              >
                Simpan
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

        {/* 3. Bagian Bawah — Statistik Presensi (3 equal Flexbox columns basis-0 flex-1 with 2-line controlled label) */}
        <div className="pt-2">
          {isLoadingAttendance ? (
            <div className="py-4 flex justify-center text-[#9CA3AF]">
              <div className="w-5 h-5 border-2 border-[#F97316] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="flex w-full items-stretch text-center">
              <div className="flex-1 basis-0 min-w-0 flex flex-col items-center justify-center px-1 box-border">
                <p className="text-xl sm:text-2xl font-bold text-[#111827]">
                  {attendanceSummary.present}
                </p>
                <p className="text-[11px] sm:text-xs text-[#6B7280] mt-0.5 font-medium">Hadir</p>
              </div>
              <div className="flex-1 basis-0 min-w-0 flex flex-col items-center justify-center px-1 box-border">
                <p className="text-xl sm:text-2xl font-bold text-[#111827]">
                  {attendanceSummary.sickPermitLeave}
                </p>
                <p className="text-[11px] sm:text-xs text-[#6B7280] mt-0.5 font-medium">
                  Sakit/Izin/Cuti
                </p>
              </div>
              <div className="flex-1 basis-0 min-w-0 flex flex-col items-center justify-center px-1 box-border">
                <p className="text-xl sm:text-2xl font-bold text-[#111827]">
                  {attendanceSummary.absent}
                </p>
                <p className="text-[11px] sm:text-xs text-[#6B7280] mt-0.5 font-medium">Alfa</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status Feedback Message */}
      {saveMessage && (
        <div
          className={`p-3 rounded-xl border flex items-center gap-2 text-xs ${
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

      {/* 4. Navigasi Lima Tab */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden">
        <div className="grid grid-cols-5 border-b border-[#E5E7EB] text-center text-xs sm:text-sm font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('identity')}
            className={`py-3 px-1 sm:px-3 flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer ${
              activeTab === 'identity'
                ? 'text-[#F97316] border-b-2 border-[#F97316] bg-[#FFF7ED]/50 font-semibold'
                : 'text-[#6B7280] hover:text-[#111827]'
            }`}
          >
            <IdCard className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-[10px] sm:text-xs">Identitas</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('position')}
            className={`py-3 px-1 sm:px-3 flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer ${
              activeTab === 'position'
                ? 'text-[#F97316] border-b-2 border-[#F97316] bg-[#FFF7ED]/50 font-semibold'
                : 'text-[#6B7280] hover:text-[#111827]'
            }`}
          >
            <Briefcase className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-[10px] sm:text-xs">Jabatan</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('contact')}
            className={`py-3 px-1 sm:px-3 flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer ${
              activeTab === 'contact'
                ? 'text-[#F97316] border-b-2 border-[#F97316] bg-[#FFF7ED]/50 font-semibold'
                : 'text-[#6B7280] hover:text-[#111827]'
            }`}
          >
            <Phone className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-[10px] sm:text-xs">Kontak</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('account')}
            className={`py-3 px-1 sm:px-3 flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer ${
              activeTab === 'account'
                ? 'text-[#F97316] border-b-2 border-[#F97316] bg-[#FFF7ED]/50 font-semibold'
                : 'text-[#6B7280] hover:text-[#111827]'
            }`}
          >
            <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-[10px] sm:text-xs">Akun</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('notes')}
            className={`py-3 px-1 sm:px-3 flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer ${
              activeTab === 'notes'
                ? 'text-[#F97316] border-b-2 border-[#F97316] bg-[#FFF7ED]/50 font-semibold'
                : 'text-[#6B7280] hover:text-[#111827]'
            }`}
          >
            <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-[10px] sm:text-xs">Catatan</span>
          </button>
        </div>

        {/* 5. Konten Informasi Berdasarkan Tab Aktif */}
        <div className="p-6">
          {activeTab === 'identity' && (
            <div className="space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pb-3 border-b border-[#E5E7EB]">
                <span className="text-[#6B7280] font-medium">Nama Lengkap</span>
                <span className="sm:col-span-2 font-semibold text-[#111827]">
                  {linkedEmployee?.full_name || user.name}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pb-3 border-b border-[#E5E7EB]">
                <span className="text-[#6B7280] font-medium">NIP</span>
                <span className="sm:col-span-2 font-semibold text-[#111827] font-mono">
                  {linkedEmployee?.nip || user.nip || '—'}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pb-3 border-b border-[#E5E7EB]">
                <span className="text-[#6B7280] font-medium">NIK</span>
                <span className="sm:col-span-2 font-semibold text-[#111827] font-mono">
                  {linkedEmployee?.nik || '—'}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pb-3 border-b border-[#E5E7EB]">
                <span className="text-[#6B7280] font-medium">Jenis Kelamin</span>
                <span className="sm:col-span-2 font-medium text-[#111827]">
                  {linkedEmployee?.gender === 'male'
                    ? 'Laki-laki'
                    : linkedEmployee?.gender === 'female'
                    ? 'Perempuan'
                    : '—'}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pb-3 border-b border-[#E5E7EB]">
                <span className="text-[#6B7280] font-medium">Tempat, Tanggal Lahir</span>
                <span className="sm:col-span-2 font-medium text-[#111827]">
                  {(linkedEmployee as any)?.birth_place || (linkedEmployee as any)?.birth_date
                    ? [
                        (linkedEmployee as any)?.birth_place,
                        (linkedEmployee as any)?.birth_date
                          ? new Date((linkedEmployee as any).birth_date).toLocaleDateString('id-ID', { dateStyle: 'long' })
                          : null,
                      ].filter(Boolean).join(', ')
                    : '—'}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <span className="text-[#6B7280] font-medium">Agama</span>
                <span className="sm:col-span-2 font-medium text-[#111827]">
                  {(linkedEmployee as any)?.religion || '—'}
                </span>
              </div>
            </div>
          )}

          {activeTab === 'position' && (
            <div className="space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pb-3 border-b border-[#E5E7EB]">
                <span className="text-[#6B7280] font-medium">Satuan Pendidikan</span>
                <span className="sm:col-span-2 font-semibold text-[#111827]">
                  {APP_CONFIG.schoolName}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pb-3 border-b border-[#E5E7EB]">
                <span className="text-[#6B7280] font-medium">Jabatan / Tugas Pokok</span>
                <span className="sm:col-span-2 font-semibold text-[#111827]">
                  {linkedEmployee?.positions?.name || user.position}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pb-3 border-b border-[#E5E7EB]">
                <span className="text-[#6B7280] font-medium">Departemen / Bidang</span>
                <span className="sm:col-span-2 font-semibold text-[#111827]">
                  {linkedEmployee?.departments?.name || user.department}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <span className="text-[#6B7280] font-medium">Jenis Pegawai</span>
                <span className="sm:col-span-2 font-medium text-[#111827] capitalize">
                  {linkedEmployee?.employee_type || 'Pegawai / GTK'}
                </span>
              </div>
            </div>
          )}

          {activeTab === 'contact' && (
            <div className="space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pb-3 border-b border-[#E5E7EB]">
                <span className="text-[#6B7280] font-medium">Alamat Email</span>
                <span className="sm:col-span-2 font-semibold text-[#111827]">
                  {linkedEmployee?.email || user.email}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pb-3 border-b border-[#E5E7EB]">
                <span className="text-[#6B7280] font-medium">Nomor Telepon / WA</span>
                <span className="sm:col-span-2 font-semibold text-[#111827]">
                  {linkedEmployee?.phone || '+62 812-3456-7890'}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <span className="text-[#6B7280] font-medium">Alamat Sekolah</span>
                <span className="sm:col-span-2 font-medium text-[#111827]">
                  {APP_CONFIG.schoolAddress}
                </span>
              </div>
            </div>
          )}

          {activeTab === 'account' && (
            <div className="space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pb-3 border-b border-[#E5E7EB]">
                <span className="text-[#6B7280] font-medium">Email Akun</span>
                <span className="sm:col-span-2 font-semibold text-[#111827]">
                  {user.email}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pb-3 border-b border-[#E5E7EB]">
                <span className="text-[#6B7280] font-medium">Hak Akses (Role)</span>
                <span className="sm:col-span-2 font-semibold text-[#111827] capitalize">
                  {user.role.replace('_', ' ')}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pb-3 border-b border-[#E5E7EB]">
                <span className="text-[#6B7280] font-medium">Status Akun</span>
                <span className="sm:col-span-2">
                  <Badge variant={user.status === 'active' ? 'success' : 'danger'} size="sm">
                    {user.status === 'active' ? 'Akun Aktif' : 'Nonaktif'}
                  </Badge>
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <span className="text-[#6B7280] font-medium">Waktu Login Terakhir</span>
                <span className="sm:col-span-2 font-medium text-[#111827] font-mono">
                  {profile?.last_login_at
                    ? new Date(profile.last_login_at).toLocaleString('id-ID', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })
                    : 'Baru saja'}
                </span>
              </div>
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="space-y-2 text-xs sm:text-sm">
              <p className="text-[#6B7280] font-medium">Catatan Kepegawaian</p>
              <div className="p-4 bg-neutral-50 rounded-xl border border-[#E5E7EB] text-[#111827] whitespace-pre-wrap">
                {linkedEmployee?.notes?.trim() ? linkedEmployee.notes : 'Tidak ada catatan khusus.'}
              </div>
            </div>
          )}
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
