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
    default: 'bg-[#FFFFFF] border border-[#E5E7EB]',
    secondary: 'bg-[#F9FAFB] border border-[#E5E7EB]',
    accent: 'bg-[#FFF7ED] border border-orange-200',
  };

  return (
    <div
      className={`rounded-2xl p-5 md:p-6 transition-all duration-150 ${variantStyles[variant]} ${
        hoverable ? 'hover:border-[#D1D5DB] hover:shadow-xs' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
