import React from 'react';
import { ATTENDANCE_STATUS_TOKENS, AttendanceStatusTokenKey } from '../../config/statusColors';

export interface StatusBadgeProps {
  statusKey: AttendanceStatusTokenKey;
  children: React.ReactNode;
  size?: 'sm' | 'md';
  className?: string;
  title?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  statusKey,
  children,
  size = 'sm',
  className = '',
  title,
}) => {
  const token = ATTENDANCE_STATUS_TOKENS[statusKey];
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center rounded-md font-semibold border ${sizeClasses} ${className}`}
      style={{
        backgroundColor: token.bgHex,
        color: token.textHex,
        borderColor: token.borderHex,
      }}
      title={title}
    >
      {children}
    </span>
  );
};
