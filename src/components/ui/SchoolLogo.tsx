import React from 'react';

interface SchoolLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'light' | 'dark';
}

export const SchoolLogo: React.FC<SchoolLogoProps> = ({
  className = '',
  size = 'md',
  variant = 'light',
}) => {
  const sizeMap = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-20 h-20',
  };

  const logoSrc = variant === 'dark' ? '/logo-dark.svg' : '/logo.svg';

  return (
    <img
      src={logoSrc}
      alt="Logo Sekolah"
      className={`block border-0 outline-none ring-0 shadow-none bg-transparent object-contain ${sizeMap[size]} ${className}`.trim()}
      style={{
        border: 'none',
        outline: 'none',
        boxShadow: 'none',
        background: 'transparent',
      }}
    />
  );
};