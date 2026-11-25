import React, { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, leftIcon, rightIcon, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold text-[#374151] dark:text-[#D4D4D4] mb-1.5"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3.5 flex items-center pointer-events-none text-[#9CA3AF] dark:text-[#A3A3A3]">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={`w-full h-11 text-sm text-[#111827] dark:text-[#F9FAFB] bg-[#F9FAFB] dark:bg-[#303030] border rounded-xl transition-all duration-150 placeholder:text-[#9CA3AF] dark:placeholder:text-[#A3A3A3] focus:outline-none focus:bg-white dark:focus:bg-[#303030] focus:border-[#F97316] dark:focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/20 disabled:bg-[#F3F4F6] dark:disabled:bg-[#262626] disabled:text-[#9CA3AF] dark:disabled:text-[#737373] ${
              leftIcon ? 'pl-10' : 'pl-3.5'
            } ${rightIcon ? 'pr-10' : 'pr-3.5'} ${
              error
                ? 'border-red-400 focus:border-red-500 focus:ring-red-200 dark:border-red-500/70 dark:focus:border-red-500 dark:focus:ring-red-500/20'
                : 'border-[#E5E7EB] dark:border-[#404040]'
            } ${className}`}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3.5 flex items-center text-[#9CA3AF] dark:text-[#A3A3A3]">
              {rightIcon}
            </div>
          )}
        </div>
        {error ? (
          <p className="mt-1.5 text-xs text-red-600 dark:text-red-400 font-medium">{error}</p>
        ) : helperText ? (
          <p className="mt-1.5 text-xs text-[#6B7280] dark:text-[#A3A3A3]">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
