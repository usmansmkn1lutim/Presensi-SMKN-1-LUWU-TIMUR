import React from 'react';

interface SchoolLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const SchoolLogo: React.FC<SchoolLogoProps> = ({ className = '', size = 'md' }) => {
  const sizeMap = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-20 h-20',
  };

  return (
    <div className={`relative flex items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-sm ${sizeMap[size]} ${className}`}>
      {/* Education Emblem SVG */}
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-3/5 h-3/5 text-white"
      >
        {/* Open Book Base */}
        <path
          d="M24 16C20 12 11 12 8 13V35C12 34 20 34 24 37C28 34 36 34 40 35V13C37 12 28 12 24 16Z"
          fill="currentColor"
          fillOpacity="0.9"
        />
        <path
          d="M24 16V37"
          stroke="#FFFFFF"
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* Academic Cap / Torch Flame */}
        <path
          d="M24 6L33 11L24 16L15 11L24 6Z"
          fill="#FFF7ED"
        />
        <circle cx="24" cy="24" r="2.5" fill="#F97316" />
      </svg>
      {/* Subtle outer indicator */}
      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-white" />
    </div>
  );
};
