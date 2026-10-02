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
    default: 'bg-[#F3F4F6] text-[#4B5563] border border-[#E5E7EB]',
    primary: 'bg-[#FFF7ED] text-[#EA580C] border border-orange-200',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border border-amber-200',
    danger: 'bg-red-50 text-red-700 border border-red-200',
    info: 'bg-blue-50 text-blue-700 border border-blue-200',
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
    case 'verifier':
      return <Badge variant="info" size={size}>Verifikator</Badge>;
    case 'employee':
    default:
      return <Badge variant="default" size={size}>Pegawai</Badge>;
  }
};
