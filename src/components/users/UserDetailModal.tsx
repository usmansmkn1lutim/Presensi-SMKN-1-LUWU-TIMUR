import React from 'react';
import { X, User, Shield, CheckCircle2, AlertCircle, Clock, Calendar, Briefcase, Link2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { RoleBadge, Badge } from '../ui/Badge';
import { UserManagementItem } from '../../services/userService';

interface UserDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserManagementItem | null;
}

export const UserDetailModal: React.FC<UserDetailModalProps> = ({
  isOpen,
  onClose,
  user,
}) => {
  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
      <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150 flex flex-col space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FFF7ED] border border-orange-200 text-[#F97316] flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#111827]">
                Rincian Pengguna
              </h3>
              <p className="text-xs text-[#6B7280]">
                Informasi akun dan status integrasi kepegawaian
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

        {/* User Profile Card */}
        <div className="p-4 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] space-y-3">
          <div className="flex items-center gap-3.5">
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.full_name}
                className="w-12 h-12 rounded-xl object-cover border border-[#E5E7EB]"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-[#FFF7ED] border border-orange-200 text-[#F97316] flex items-center justify-center font-bold text-lg">
                {user.full_name.charAt(0)}
              </div>
            )}
            <div className="space-y-0.5 min-w-0 flex-1">
              <h4 className="text-sm font-bold text-[#111827] truncate">
                {user.full_name}
              </h4>
              <div className="flex items-center gap-2 pt-0.5">
                <RoleBadge role={user.role} size="sm" />
                <Badge variant={user.is_active ? 'success' : 'danger'} size="sm">
                  {user.is_active ? 'Aktif' : 'Nonaktif'}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div className="space-y-2.5 text-xs">
          <div className="flex items-center justify-between py-1.5 border-b border-[#F3F4F6]">
            <span className="text-[#6B7280]">ID Pengguna:</span>
            <span className="font-mono text-[11px] text-[#111827] max-w-[200px] truncate">
              {user.id}
            </span>
          </div>

          <div className="flex items-center justify-between py-1.5 border-b border-[#F3F4F6]">
            <span className="text-[#6B7280]">Status Hubungan Pegawai:</span>
            {user.employee_id ? (
              <span className="font-semibold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Terhubung ({user.employee_name})</span>
              </span>
            ) : (
              <span className="font-semibold text-amber-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Belum Terhubung</span>
              </span>
            )}
          </div>

          <div className="flex items-center justify-between py-1.5 border-b border-[#F3F4F6]">
            <span className="text-[#6B7280]">Login Terakhir:</span>
            <span className="font-mono text-[#111827]">
              {user.last_login_at
                ? new Date(user.last_login_at).toLocaleString('id-ID', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })
                : 'Belum pernah login'}
            </span>
          </div>

          <div className="flex items-center justify-between py-1.5">
            <span className="text-[#6B7280]">Tanggal Dibuat:</span>
            <span className="text-[#111827]">
              {new Date(user.created_at).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-[#E5E7EB] flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            Tutup
          </Button>
        </div>
      </div>
    </div>
  );
};
