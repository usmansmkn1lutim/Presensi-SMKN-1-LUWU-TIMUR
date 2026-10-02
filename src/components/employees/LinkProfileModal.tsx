import React, { useState, useEffect } from 'react';
import { X, Link2, Unlink, Check, AlertCircle, User, Shield } from 'lucide-react';
import { Button } from '../ui/Button';
import { RoleBadge } from '../ui/Badge';
import { ProfileRow } from '../../types/database.types';
import { EmployeeWithRelations } from '../../types/employee';
import { employeeService } from '../../services/employeeService';

interface LinkProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  employee: EmployeeWithRelations | null;
}

export const LinkProfileModal: React.FC<LinkProfileModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  employee,
}) => {
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !employee) return;

    const loadProfiles = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const availableProfiles = await employeeService.getUnlinkedProfiles(employee.profile_id);
        setProfiles(availableProfiles);
        setSelectedProfileId(employee.profile_id || '');
      } catch (err) {
        console.warn('Gagal memuat profil auth:', err);
        setErrorMessage('Gagal memuat daftar profil akun.');
      } finally {
        setIsLoading(false);
      }
    };

    loadProfiles();
  }, [isOpen, employee]);

  if (!isOpen || !employee) return null;

  const handleSaveLink = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const targetId = selectedProfileId.trim() ? selectedProfileId.trim() : null;
      await employeeService.linkProfileToEmployee(employee.id, targetId);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Gagal menghubungkan akun.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnlink = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await employeeService.linkProfileToEmployee(employee.id, null);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Gagal melepaskan akun.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
      <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#E5E7EB]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FFF7ED] border border-orange-200 text-[#F97316] flex items-center justify-center">
              <Link2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#111827]">Hubungkan Akun Pengguna</h3>
              <p className="text-xs text-[#6B7280]">
                Tautkan data pegawai dengan akun login Supabase Auth
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#111827] hover:bg-[#F3F4F6] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="py-5 space-y-4 text-xs">
          {/* Target Employee Info Card */}
          <div className="p-3.5 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#FFF7ED] border border-orange-200 text-[#F97316] font-bold text-sm flex items-center justify-center shrink-0">
              {employee.full_name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-[#111827] truncate">{employee.full_name}</p>
              <p className="text-[#6B7280] font-mono text-[11px]">NIP: {employee.nip || '—'}</p>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          {/* Profile Selection */}
          <div>
            <label className="block font-bold text-[#374151] mb-2">
              Pilih Akun Profil (auth.users / public.profiles)
            </label>

            {isLoading ? (
              <div className="py-8 text-center text-[#6B7280]">
                <div className="w-6 h-6 border-2 border-[#F97316] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs">Memuat daftar akun profil...</p>
              </div>
            ) : profiles.length === 0 ? (
              <div className="p-4 rounded-xl bg-[#F3F4F6] border border-[#E5E7EB] text-center text-[#6B7280]">
                <Shield className="w-6 h-6 text-[#9CA3AF] mx-auto mb-1" />
                <p className="font-semibold text-[#111827]">Tidak Ada Akun Tersedia</p>
                <p className="text-[11px] text-[#6B7280] mt-0.5">
                  Semua profil auth yang ada saat ini sudah terhubung ke pegawai lain.
                </p>
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto space-y-1.5 border border-[#E5E7EB] rounded-xl p-2 bg-[#FAFAFA]">
                {profiles.map((prof) => {
                  const isSelected = selectedProfileId === prof.id;
                  return (
                    <button
                      key={prof.id}
                      type="button"
                      onClick={() => setSelectedProfileId(prof.id)}
                      className={`w-full text-left p-2.5 rounded-lg border transition-all flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-[#FFF7ED] border-[#F97316]'
                          : 'bg-white border-[#E5E7EB] hover:bg-[#F3F4F6]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-[#6B7280] font-bold text-xs shrink-0">
                          {prof.full_name ? prof.full_name.charAt(0) : <User className="w-3.5 h-3.5" />}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-[#111827] truncate">
                            {prof.full_name || 'Tanpa Nama'}
                          </p>
                          <p className="text-[10px] text-[#6B7280] font-mono truncate">
                            ID: {prof.id.slice(0, 8)}...
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <RoleBadge role={prof.role} size="sm" />
                        {isSelected && <Check className="w-4 h-4 text-[#F97316]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-[#E5E7EB] flex items-center justify-between">
          <div>
            {employee.profile_id && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleUnlink}
                disabled={isSubmitting}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 text-xs"
                leftIcon={<Unlink className="w-3.5 h-3.5" />}
              >
                Lepas Tautan
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleSaveLink}
              disabled={isSubmitting || !selectedProfileId || selectedProfileId === employee.profile_id}
              isLoading={isSubmitting}
              leftIcon={<Check className="w-4 h-4" />}
            >
              Simpan Tautan
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
