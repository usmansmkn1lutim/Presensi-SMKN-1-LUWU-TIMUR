import React, { useState, useEffect } from 'react';
import { Shield, Search, Check, X, AlertCircle, Clock, UserCheck } from 'lucide-react';
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
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProfile, setSelectedProfile] = useState<ProfileRow | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !employee) return;

    const fetchProfiles = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      setSelectedProfile(null);
      setShowConfirm(false);
      try {
        const availableProfiles = await employeeService.getUnlinkedProfiles();
        setProfiles(availableProfiles);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setErrorMessage(err.message);
        } else {
          setErrorMessage('Gagal memuat daftar akun yang dapat dihubungkan.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfiles();
  }, [isOpen, employee]);

  if (!isOpen || !employee) return null;

  const filteredProfiles = profiles.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (p.full_name && p.full_name.toLowerCase().includes(q)) ||
      (p.role && p.role.toLowerCase().includes(q))
    );
  });

  const handleSelectProfile = (p: ProfileRow) => {
    setSelectedProfile(p);
    setShowConfirm(true);
    setErrorMessage(null);
  };

  const handleConfirmLink = async () => {
    if (!selectedProfile) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await employeeService.linkProfileToEmployee(employee.id, selectedProfile.id);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Gagal menghubungkan akun dengan pegawai.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/75 backdrop-blur-2xs p-4">
      <div className="bg-white dark:bg-[#262626] rounded-2xl border border-[#E5E7EB] dark:border-[#404040] shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB] dark:border-[#404040]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FFF7ED] dark:bg-orange-950/40 border border-orange-200 dark:border-orange-900/50 text-[#F97316] dark:text-orange-400 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">
                Hubungkan Akun Pengguna
              </h3>
              <p className="text-xs text-[#6B7280] dark:text-[#A3A3A3]">
                Tautkan akun Supabase ke pegawai: <span className="font-semibold text-[#111827] dark:text-white">{employee.full_name}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#9CA3AF] dark:text-slate-400 hover:text-[#111827] dark:hover:text-white hover:bg-[#F3F4F6] dark:hover:bg-[#303030] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mt-3 p-3 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800/60 flex items-center gap-2 text-xs text-red-700 dark:text-red-400">
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Confirmation State */}
        {showConfirm && selectedProfile ? (
          <div className="py-5 space-y-4 text-center animate-in fade-in duration-150">
            <div className="w-12 h-12 rounded-2xl bg-[#FFF7ED] dark:bg-orange-950/40 border border-orange-200 dark:border-orange-900/50 text-[#F97316] dark:text-orange-400 flex items-center justify-center mx-auto">
              <UserCheck className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h4 className="text-sm font-bold text-[#111827] dark:text-[#F9FAFB]">
                Hubungkan akun ini dengan pegawai tersebut?
              </h4>
              <p className="text-xs text-[#6B7280] dark:text-[#A3A3A3]">
                Pegawai <strong className="text-[#111827] dark:text-white">{employee.full_name}</strong> akan ditautkan dengan akun:
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#F9FAFB] dark:bg-[#1F1F1F] border border-[#E5E7EB] dark:border-[#404040] text-left text-xs space-y-2 max-w-sm mx-auto">
              <div className="flex items-center justify-between">
                <span className="text-[#6B7280] dark:text-[#A3A3A3]">Nama Pengguna:</span>
                <span className="font-bold text-[#111827] dark:text-[#F9FAFB]">{selectedProfile.full_name || 'Tanpa Nama'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#6B7280] dark:text-[#A3A3A3]">Role:</span>
                <RoleBadge role={selectedProfile.role} size="sm" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#6B7280] dark:text-[#A3A3A3]">Status:</span>
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">Aktif</span>
              </div>
              <div className="flex items-center justify-between font-mono text-[11px]">
                <span className="text-[#6B7280] dark:text-[#A3A3A3]">ID Profil:</span>
                <span className="text-[#9CA3AF] dark:text-slate-500 truncate max-w-[150px]">{selectedProfile.id}</span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-center gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowConfirm(false)}
                disabled={isSubmitting}
              >
                Kembali ke Daftar
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmLink}
                isLoading={isSubmitting}
                leftIcon={<Check className="w-3.5 h-3.5" />}
              >
                Ya, Hubungkan Akun
              </Button>
            </div>
          </div>
        ) : (
          /* Profile Selector List */
          <div className="flex-1 overflow-y-auto py-3 space-y-3">
            {/* Search Box */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#9CA3AF] dark:text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama akun..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-3 text-xs bg-white dark:bg-[#1F1F1F] border border-[#E5E7EB] dark:border-[#404040] rounded-xl focus:outline-none focus:border-[#F97316] text-[#111827] dark:text-white placeholder:text-[#9CA3AF]"
              />
            </div>

            {/* List */}
            {isLoading ? (
              <div className="py-8 text-center text-xs text-[#6B7280] dark:text-slate-400">
                <div className="w-6 h-6 border-2 border-[#F97316] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                Memuat daftar akun yang tersedia dari RPC...
              </div>
            ) : filteredProfiles.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#9CA3AF] dark:text-slate-500 space-y-1">
                <p className="font-semibold text-[#4B5563] dark:text-slate-300">Tidak ada akun yang tersedia</p>
                <p className="text-[11px] text-[#6B7280] dark:text-slate-400">
                  Semua akun aktif sudah terhubung dengan data pegawai lain.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#E5E7EB] dark:divide-[#404040] border border-[#E5E7EB] dark:border-[#404040] rounded-xl overflow-hidden max-h-[300px] overflow-y-auto">
                {filteredProfiles.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 bg-white dark:bg-[#262626] hover:bg-[#F9FAFB] dark:hover:bg-[#303030] flex items-center justify-between gap-3 text-xs transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#111827] dark:text-[#F9FAFB] truncate">
                          {p.full_name || 'Pengguna Tanpa Nama'}
                        </span>
                        <RoleBadge role={p.role} size="sm" />
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-[#6B7280] dark:text-[#A3A3A3] mt-1">
                        <Clock className="w-3 h-3 text-[#9CA3AF]" />
                        <span>
                          Login terakhir:{' '}
                          {p.last_login_at
                            ? new Date(p.last_login_at).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })
                            : 'Belum pernah'}
                        </span>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSelectProfile(p)}
                      className="shrink-0 text-xs text-[#F97316] dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/40 hover:border-orange-300 dark:hover:border-orange-800"
                    >
                      Pilih
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="pt-3 border-t border-[#E5E7EB] dark:border-[#404040] flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            Tutup
          </Button>
        </div>
      </div>
    </div>
  );
};
