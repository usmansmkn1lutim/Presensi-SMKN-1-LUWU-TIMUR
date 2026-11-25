import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'accent';
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  hoverable = false,
  className = '',
  ...props
}) => {
  const variantStyles = {
    default: 'bg-[#FFFFFF] border border-[#E5E7EB] dark:bg-[#262626] dark:border-[#404040]',
    secondary: 'bg-[#F9FAFB] border border-[#E5E7EB] dark:bg-[#303030] dark:border-[#404040]',
    accent: 'bg-[#FFF7ED] border border-orange-200 dark:bg-[#431F0B] dark:border-orange-800/60',
  };

  return (
    <div
      className={`rounded-2xl p-5 md:p-6 transition-all duration-150 ${variantStyles[variant]} ${
        hoverable ? 'hover:border-[#D1D5DB] dark:hover:border-[#525252] hover:shadow-xs' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
