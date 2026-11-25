import React, { useState, useEffect, useMemo } from 'react';
import {
  Link2,
  X,
  Search,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Building2,
  Briefcase,
  IdCard,
  UserCheck,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { RoleBadge } from '../ui/Badge';
import { UserAvatar } from '../ui/UserAvatar';
import { useAuth } from '../../context/AuthContext';
import {
  userService,
  UserManagementItem,
  UnlinkedEmployeeItem,
} from '../../services/userService';

interface LinkUserEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserManagementItem | null;
  onSuccess: (linkedData: {
    userId: string;
    employeeId: string;
    employeeName: string;
  }) => void;
}

export const LinkUserEmployeeModal: React.FC<LinkUserEmployeeModalProps> = ({
  isOpen,
  onClose,
  user,
  onSuccess,
}) => {
  const { user: currentUser } = useAuth();
  const isAuthorized =
    currentUser?.role === 'super_admin' || currentUser?.role === 'admin';

  // State: Data & Filtering
  const [employees, setEmployees] = useState<UnlinkedEmployeeItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmployee, setSelectedEmployee] =
    useState<UnlinkedEmployeeItem | null>(null);

  // State: Status & UI flow
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  // Fetch unlinked active employees when modal opens
  useEffect(() => {
    if (isOpen && user) {
      setSelectedEmployee(null);
      setSearchQuery('');
      setErrorMessage(null);
      setShowConfirm(false);

      const fetchEmployees = async () => {
        setIsLoadingEmployees(true);
        try {
          const data = await userService.getUnlinkedEmployees();
          setEmployees(data);
        } catch (err: unknown) {
          console.error('Failed to fetch unlinked employees:', err);
          setErrorMessage(
            'Gagal memuat data pegawai yang belum terhubung. Silakan coba lagi.'
          );
        } finally {
          setIsLoadingEmployees(false);
        }
      };

      fetchEmployees();
    }
  }, [isOpen, user]);

  if (!isOpen || !user) return null;

  const isSelf = currentUser?.id === user.id;

  // Filter employees by search query
  const filteredEmployees = employees.filter((emp) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchName = emp.full_name.toLowerCase().includes(q);
    const matchNip = emp.nip?.toLowerCase().includes(q);
    const matchDept = emp.department_name?.toLowerCase().includes(q);
    const matchPos = emp.position_name?.toLowerCase().includes(q);
    return matchName || matchNip || matchDept || matchPos;
  });

  const handleSelectEmployee = (emp: UnlinkedEmployeeItem) => {
    setSelectedEmployee(emp);
    setErrorMessage(null);
  };

  const handleProceedToConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!isAuthorized) {
      setErrorMessage('Anda tidak memiliki wewenang untuk menghubungkan akun pengguna.');
      return;
    }

    if (isSelf) {
      setErrorMessage('Anda tidak dapat menghubungkan akun Anda sendiri secara langsung.');
      return;
    }

    if (!user.is_active) {
      setErrorMessage('Akun pengguna nonaktif tidak dapat dihubungkan ke data pegawai.');
      return;
    }

    if (!selectedEmployee) {
      setErrorMessage('Silakan pilih salah satu data pegawai terlebih dahulu.');
      return;
    }

    setShowConfirm(true);
  };

  const handleConfirmSubmit = async () => {
    if (!selectedEmployee || !user) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await userService.linkUserToEmployee(selectedEmployee.id, user.id);
      onSuccess({
        userId: user.id,
        employeeId: selectedEmployee.id,
        employeeName: selectedEmployee.full_name,
      });
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (
          err.message.includes('sudah terhubung') ||
          err.message.includes('23505')
        ) {
          setErrorMessage('Pegawai tersebut sudah terhubung dengan akun lain.');
        } else {
          setErrorMessage(err.message);
        }
      } else {
        setErrorMessage(
          'Akun tidak dapat dihubungkan dengan pegawai. Silakan coba lagi.'
        );
      }
      setShowConfirm(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[#E5E7EB] dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-150 flex flex-col space-y-4 max-h-[90vh] text-slate-900 dark:text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB] dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-amber-950/50 border border-orange-200 dark:border-amber-900/50 text-[#F97316] dark:text-amber-400 flex items-center justify-center">
              <Link2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#111827] dark:text-white">
                Hubungkan User ke Pegawai
              </h3>
              <p className="text-xs text-[#6B7280] dark:text-slate-400">
                Pilih data pegawai yang akan dihubungkan dengan akun ini.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg text-[#9CA3AF] dark:text-slate-400 hover:text-[#111827] dark:hover:text-white hover:bg-[#F3F4F6] dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Card */}
        <div className="p-3.5 rounded-xl bg-[#F9FAFB] dark:bg-slate-800/60 border border-[#E5E7EB] dark:border-slate-800 flex items-center gap-3">
          <UserAvatar
            userId={user.id}
            avatarUrl={user.avatar_url}
            photoUrl={user.photo_url}
            name={user.full_name}
            className="w-10 h-10 rounded-full object-cover border border-[#E5E7EB] dark:border-slate-700 shrink-0"
          />
          <div className="space-y-0.5 min-w-0 flex-1">
            <p className="text-sm font-bold text-[#111827] dark:text-white truncate">
              {user.full_name}
            </p>
            <div className="flex items-center gap-2">
              <RoleBadge role={user.role} size="sm" />
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                  user.is_active
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                    : 'bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300'
                }`}
              >
                {user.is_active ? 'Akun Aktif' : 'Akun Nonaktif'}
              </span>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 flex items-center gap-2 text-xs text-red-700 dark:text-red-300">
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Self-account warning */}
        {isSelf && (
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <span>
              Ini adalah akun Anda sendiri. Akun administrator Anda tidak dapat dihubungkan ke data pegawai secara mandiri.
            </span>
          </div>
        )}

        {/* Inactive user warning */}
        {!user.is_active && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-800 dark:text-red-300 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <span>
              Akun pengguna ini berstatus nonaktif. Aktifkan akun terlebih dahulu sebelum menghubungkan ke data pegawai.
            </span>
          </div>
        )}

        {/* Content Body: Selection or Confirmation */}
        {!showConfirm ? (
          <form onSubmit={handleProceedToConfirm} className="space-y-3.5 flex-1 min-h-0 flex flex-col">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[#374151] dark:text-slate-300">
                Pilih Pegawai <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#9CA3AF] dark:text-slate-500" />
                <input
                  type="text"
                  placeholder="Cari nama pegawai, NIP, atau departemen..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  disabled={isLoadingEmployees || !user.is_active || isSelf}
                  className="w-full h-9 pl-9 pr-3 text-xs bg-white dark:bg-slate-800 border border-[#E5E7EB] dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#F97316] text-[#111827] dark:text-white disabled:bg-gray-100 dark:disabled:bg-slate-800/50 disabled:text-gray-400 dark:disabled:text-slate-600"
                />
              </div>
            </div>

            {/* Employee Selector List */}
            <div className="flex-1 overflow-y-auto max-h-56 min-h-[140px] border border-[#E5E7EB] dark:border-slate-700 rounded-xl divide-y divide-[#E5E7EB] dark:divide-slate-800 bg-white dark:bg-slate-800/80">
              {isLoadingEmployees ? (
                <div className="py-8 text-center text-xs text-[#6B7280] dark:text-slate-400 space-y-1.5">
                  <div className="w-6 h-6 border-2 border-[#F97316] dark:border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p>Memuat daftar pegawai belum terhubung...</p>
                </div>
              ) : filteredEmployees.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#6B7280] dark:text-slate-400 px-4 space-y-1">
                  <UserCheck className="w-6 h-6 text-[#9CA3AF] dark:text-slate-500 mx-auto mb-1" />
                  <p className="font-semibold text-[#111827] dark:text-white">
                    {employees.length === 0
                      ? 'Tidak ada pegawai yang belum terhubung'
                      : 'Pegawai tidak ditemukan'}
                  </p>
                  <p className="text-[11px] text-[#9CA3AF] dark:text-slate-500">
                    {employees.length === 0
                      ? 'Seluruh data pegawai aktif sudah memiliki akun terkait.'
                      : 'Coba ubah kata kunci pencarian pegawai.'}
                  </p>
                </div>
              ) : (
                filteredEmployees.map((emp) => {
                  const isSelected = selectedEmployee?.id === emp.id;
                  return (
                    <div
                      key={emp.id}
                      onClick={() => handleSelectEmployee(emp)}
                      className={`p-3 cursor-pointer transition-colors flex items-center justify-between gap-3 text-xs ${
                        isSelected
                          ? 'bg-[#FFF7ED] dark:bg-amber-950/40 border-l-4 border-l-[#F97316] dark:border-l-amber-500'
                          : 'hover:bg-[#F9FAFB] dark:hover:bg-slate-750'
                      }`}
                    >
                      <div className="min-w-0 space-y-0.5">
                        <p
                          className={`font-semibold truncate ${
                            isSelected ? 'text-[#F97316] dark:text-amber-400' : 'text-[#111827] dark:text-white'
                          }`}
                        >
                          {emp.full_name}
                        </p>
                        <div className="flex items-center flex-wrap gap-2 text-[11px] text-[#6B7280] dark:text-slate-400">
                          <span className="flex items-center gap-1">
                            <IdCard className="w-3 h-3 text-[#9CA3AF] dark:text-slate-500" />
                            {emp.nip ? `NIP: ${emp.nip}` : 'NIP: -'}
                          </span>
                          {emp.department_name && (
                            <span className="flex items-center gap-1">
                              <Building2 className="w-3 h-3 text-[#9CA3AF] dark:text-slate-500" />
                              {emp.department_name}
                            </span>
                          )}
                          {emp.position_name && (
                            <span className="flex items-center gap-1">
                              <Briefcase className="w-3 h-3 text-[#9CA3AF] dark:text-slate-500" />
                              {emp.position_name}
                            </span>
                          )}
                        </div>
                      </div>

                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                          isSelected
                            ? 'border-[#F97316] bg-[#F97316] text-white'
                            : 'border-[#D1D5DB] dark:border-slate-600 bg-white dark:bg-slate-800'
                        }`}
                      >
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer Buttons */}
            <div className="pt-3 border-t border-[#E5E7EB] dark:border-slate-800 flex items-center justify-end gap-2.5">
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
                type="submit"
                variant="primary"
                size="sm"
                disabled={
                  isSubmitting ||
                  !selectedEmployee ||
                  !user.is_active ||
                  isSelf ||
                  !isAuthorized
                }
              >
                Lanjutkan
              </Button>
            </div>
          </form>
        ) : (
          /* Confirmation State */
          <div className="space-y-4 pt-1">
            <div className="p-3.5 rounded-xl bg-orange-50/80 dark:bg-amber-950/40 border border-orange-200 dark:border-amber-900 text-xs text-orange-950 dark:text-amber-200 space-y-2">
              <div className="flex items-center gap-2 font-bold text-[#F97316] dark:text-amber-400">
                <AlertTriangle className="w-4 h-4 text-[#F97316] dark:text-amber-400" />
                <span>Konfirmasi Hubungkan Akun</span>
              </div>
              <p>
                Apakah Anda yakin ingin menghubungkan akun pengguna{' '}
                <strong>{user.full_name}</strong> dengan data pegawai{' '}
                <strong>{selectedEmployee?.full_name}</strong>?
              </p>
              <div className="p-2.5 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-orange-200/60 dark:border-amber-900/60 text-[11px] space-y-1 text-[#374151] dark:text-slate-300">
                <div className="flex justify-between">
                  <span className="text-[#6B7280] dark:text-slate-400">Pegawai:</span>
                  <span className="font-semibold text-[#111827] dark:text-white">
                    {selectedEmployee?.full_name}
                  </span>
                </div>
                {selectedEmployee?.nip && (
                  <div className="flex justify-between">
                    <span className="text-[#6B7280] dark:text-slate-400">NIP:</span>
                    <span>{selectedEmployee.nip}</span>
                  </div>
                )}
                {selectedEmployee?.department_name && (
                  <div className="flex justify-between">
                    <span className="text-[#6B7280] dark:text-slate-400">Departemen:</span>
                    <span>{selectedEmployee.department_name}</span>
                  </div>
                )}
                {selectedEmployee?.position_name && (
                  <div className="flex justify-between">
                    <span className="text-[#6B7280] dark:text-slate-400">Jabatan:</span>
                    <span>{selectedEmployee.position_name}</span>
                  </div>
                )}
              </div>
              <p className="text-[11px] text-[#6B7280] dark:text-slate-400">
                Data akun dan data pegawai akan terhubung secara 1-ke-1.
              </p>
            </div>

            <div className="pt-2 border-t border-[#E5E7EB] dark:border-slate-800 flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowConfirm(false)}
                disabled={isSubmitting}
              >
                Kembali
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                isLoading={isSubmitting}
                onClick={handleConfirmSubmit}
                leftIcon={<Link2 className="w-3.5 h-3.5" />}
              >
                {isSubmitting ? 'Menghubungkan...' : 'Hubungkan'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
