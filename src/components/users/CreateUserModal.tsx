import React, { useState } from 'react';
import { UserPlus, X, AlertCircle, CheckCircle2, Shield, Mail, User } from 'lucide-react';
import { Button } from '../ui/Button';
import { useAuth } from '../../context/AuthContext';
import { userService, ActiveAppRole, CreateUserResponse } from '../../services/userService';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result: CreateUserResponse) => void;
}

export const CreateUserModal: React.FC<CreateUserModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user: currentUser } = useAuth();
  const isSuperAdmin = currentUser?.role === 'super_admin';

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<ActiveAppRole>('employee');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedName || trimmedName.length < 2) {
      setErrorMessage('Nama lengkap wajib diisi (minimal 2 karakter).');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      setErrorMessage('Format alamat email tidak valid.');
      return;
    }

    // Role safety check for Admin
    if (!isSuperAdmin && (role === 'admin' || role === 'super_admin')) {
      setErrorMessage('Admin hanya dapat membuat akun dengan role Kepala Sekolah atau Pegawai.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await userService.createUser({
        full_name: trimmedName,
        email: trimmedEmail,
        role: role,
      });

      onSuccess(response);
      onClose();
      // Reset form
      setFullName('');
      setEmail('');
      setRole('employee');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Terjadi kesalahan saat membuat pengguna.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
      <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FFF7ED] border border-orange-200 text-[#F97316] flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#111827]">
                Tambah Pengguna Baru
              </h3>
              <p className="text-xs text-[#6B7280]">
                Buat akun login aplikasi melalui Supabase Auth
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#111827] hover:bg-[#F3F4F6] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#374151]">
              Nama Lengkap <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-2.5 text-[#9CA3AF]" />
              <input
                type="text"
                required
                disabled={isLoading}
                placeholder="Masukkan nama lengkap"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full h-9 pl-9 pr-3 text-xs bg-white border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#F97316] text-[#111827]"
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#374151]">
              Alamat Email <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-2.5 text-[#9CA3AF]" />
              <input
                type="email"
                required
                disabled={isLoading}
                placeholder="nama@sekolah.sch.id"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-9 pl-9 pr-3 text-xs bg-white border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#F97316] text-[#111827]"
              />
            </div>
            <p className="text-[11px] text-[#9CA3AF]">
              Email akan digunakan pengguna untuk login dan pemulihan akun.
            </p>
          </div>

          {/* Role Selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#374151]">
              Peran (Role) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Shield className="w-4 h-4 absolute left-3 top-2.5 text-[#9CA3AF]" />
              <select
                disabled={isLoading}
                value={role}
                onChange={(e) => setRole(e.target.value as ActiveAppRole)}
                className="w-full h-9 pl-9 pr-3 text-xs bg-white border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#F97316] text-[#111827]"
              >
                {isSuperAdmin && (
                  <option value="super_admin">Super Admin</option>
                )}
                {isSuperAdmin && (
                  <option value="admin">Admin</option>
                )}
                <option value="headmaster">Kepala Sekolah</option>
                <option value="employee">Pegawai</option>
              </select>
            </div>
            {!isSuperAdmin && (
              <p className="text-[11px] text-[#6B7280]">
                Admin hanya berwenang membuat akun dengan peran Kepala Sekolah atau Pegawai.
              </p>
            )}
          </div>

          {/* Notice Box */}
          <div className="p-3 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] text-[11px] text-[#6B7280] space-y-1">
            <p className="font-semibold text-[#111827]">Keamanan Kata Sandi</p>
            <p>
              Akun akan dibuat secara aman. Pengguna dapat menetapkan kata sandi melalui tautan reset kata sandi atau email aktivasi.
            </p>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 border-t border-[#E5E7EB] flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isLoading}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isLoading}
              leftIcon={<UserPlus className="w-3.5 h-3.5" />}
            >
              {isLoading ? 'Membuat Pengguna...' : 'Buat Pengguna'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
