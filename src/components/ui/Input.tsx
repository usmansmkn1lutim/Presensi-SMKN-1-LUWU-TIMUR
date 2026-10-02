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
            className="block text-xs font-semibold text-[#374151] mb-1.5"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3.5 flex items-center pointer-events-none text-[#9CA3AF]">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={`w-full h-11 text-sm text-[#111827] bg-[#F9FAFB] border rounded-xl transition-all duration-150 placeholder:text-[#9CA3AF] focus:outline-none focus:bg-white focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/20 disabled:bg-[#F3F4F6] disabled:text-[#9CA3AF] ${
              leftIcon ? 'pl-10' : 'pl-3.5'
            } ${rightIcon ? 'pr-10' : 'pr-3.5'} ${
              error
                ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
                : 'border-[#E5E7EB]'
            } ${className}`}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3.5 flex items-center text-[#9CA3AF]">
              {rightIcon}
            </div>
          )}
        </div>
        {error ? (
          <p className="mt-1.5 text-xs text-red-600 font-medium">{error}</p>
        ) : helperText ? (
          <p className="mt-1.5 text-xs text-[#6B7280]">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
