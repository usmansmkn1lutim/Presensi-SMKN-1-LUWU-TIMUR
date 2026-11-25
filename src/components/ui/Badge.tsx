import React from 'react';
import { UserRole } from '../../types/auth';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className = '',
}) => {
  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 font-medium',
    md: 'text-xs px-2.5 py-1 font-semibold',
  };

  const variantStyles = {
    default:
      'bg-[#F3F4F6] text-[#4B5563] border border-[#E5E7EB] dark:bg-[#303030] dark:text-[#D4D4D4] dark:border-[#404040]',
    primary:
      'bg-[#FFF7ED] text-[#EA580C] border border-orange-200 dark:bg-[#431F0B] dark:text-[#FDBA74] dark:border-[#9A3412]/60',
    success:
      'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60',
    warning:
      'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60',
    danger:
      'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800/60',
    info:
      'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/60',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md tracking-tight ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
};

export const RoleBadge: React.FC<{ role: UserRole; size?: 'sm' | 'md' }> = ({ role, size = 'sm' }) => {
  switch (role) {
    case 'super_admin':
      return <Badge variant="danger" size={size}>Super Admin</Badge>;
    case 'admin':
      return <Badge variant="primary" size={size}>Admin</Badge>;
    case 'headmaster':
      return <Badge variant="warning" size={size}>Kepala Sekolah</Badge>;
    case 'employee':
    default:
      return <Badge variant="default" size={size}>Pegawai</Badge>;
  }
};
