import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  disabled,
  className = '',
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316] focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer select-none rounded-xl';

  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 h-8 gap-1.5',
    md: 'text-sm px-4 py-2.5 h-11 gap-2',
    lg: 'text-base px-6 py-3 h-12 gap-2.5',
  };

  const variantStyles = {
    primary: 'bg-[#F97316] hover:bg-[#EA580C] text-white active:bg-[#C2410C] shadow-sm',
    secondary: 'bg-[#F3F4F6] hover:bg-[#E5E7EB] text-[#374151] active:bg-[#D1D5DB]',
    outline: 'bg-transparent border border-[#E5E7EB] hover:bg-[#F3F4F6] text-[#374151] active:bg-[#E5E7EB]',
    danger: 'bg-red-600 hover:bg-red-700 text-white active:bg-red-800',
    ghost: 'bg-transparent hover:bg-[#F3F4F6] text-[#6B7280] hover:text-[#111827]',
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current" />
      ) : (
        leftIcon
      )}
      <span>{children}</span>
      {!isLoading && rightIcon}
    </button>
  );
};
