import React from 'react';
import { X, User, Shield, CheckCircle2, AlertCircle, Clock, Calendar, Briefcase, Link2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { RoleBadge, Badge } from '../ui/Badge';
import { UserAvatar } from '../ui/UserAvatar';
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
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[#E5E7EB] dark:border-slate-800 shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150 flex flex-col space-y-4 text-slate-900 dark:text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB] dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FFF7ED] dark:bg-amber-950/50 border border-orange-200 dark:border-amber-900/50 text-[#F97316] dark:text-amber-400 flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#111827] dark:text-white">
                Rincian Pengguna
              </h3>
              <p className="text-xs text-[#6B7280] dark:text-slate-400">
                Informasi akun dan status integrasi kepegawaian
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#9CA3AF] dark:text-slate-400 hover:text-[#111827] dark:hover:text-white hover:bg-[#F3F4F6] dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Profile Card */}
        <div className="p-4 rounded-xl bg-[#F9FAFB] dark:bg-slate-800/60 border border-[#E5E7EB] dark:border-slate-800 space-y-3">
          <div className="flex items-center gap-3.5">
            <UserAvatar
              userId={user.id}
              avatarUrl={user.avatar_url}
              photoUrl={user.photo_url}
              name={user.full_name}
              className="w-12 h-12 rounded-full object-cover border border-[#E5E7EB] dark:border-slate-700 shrink-0"
            />
            <div className="space-y-0.5 min-w-0 flex-1">
              <h4 className="text-sm font-bold text-[#111827] dark:text-white truncate">
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
          <div className="flex items-center justify-between py-1.5 border-b border-[#F3F4F6] dark:border-slate-800">
            <span className="text-[#6B7280] dark:text-slate-400">ID Pengguna:</span>
            <span className="font-mono text-[11px] text-[#111827] dark:text-slate-200 max-w-[200px] truncate">
              {user.id}
            </span>
          </div>

          <div className="flex items-center justify-between py-1.5 border-b border-[#F3F4F6] dark:border-slate-800">
            <span className="text-[#6B7280] dark:text-slate-400">Status Hubungan Pegawai:</span>
            {user.employee_id ? (
              <span className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Terhubung ({user.employee_name})</span>
              </span>
            ) : (
              <span className="font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Belum Terhubung</span>
              </span>
            )}
          </div>

          <div className="flex items-center justify-between py-1.5 border-b border-[#F3F4F6] dark:border-slate-800">
            <span className="text-[#6B7280] dark:text-slate-400">Login Terakhir:</span>
            <span className="font-mono text-[#111827] dark:text-slate-200">
              {user.last_login_at
                ? new Date(user.last_login_at).toLocaleString('id-ID', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })
                : 'Belum pernah login'}
            </span>
          </div>

          <div className="flex items-center justify-between py-1.5">
            <span className="text-[#6B7280] dark:text-slate-400">Tanggal Dibuat:</span>
            <span className="text-[#111827] dark:text-slate-200">
              {new Date(user.created_at).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-[#E5E7EB] dark:border-slate-800 flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            Tutup
          </Button>
        </div>
      </div>
    </div>
  );
};
