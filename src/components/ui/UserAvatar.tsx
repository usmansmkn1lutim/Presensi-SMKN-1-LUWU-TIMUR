import React, { useState, useEffect } from 'react';
import { User as UserIcon } from 'lucide-react';
import { getPrivatePhotoSignedUrl } from '../../services/photoStorageService';
import { employeeService } from '../../services/employeeService';

interface UserAvatarProps {
  userId?: string | null;
  profileId?: string | null;
  avatarUrl?: string | null;
  photoUrl?: string | null;
  name?: string;
  className?: string;
  fallbackIconClassName?: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  userId,
  profileId,
  avatarUrl,
  photoUrl,
  name = 'Pegawai',
  className = 'w-9 h-9 rounded-full object-cover',
  fallbackIconClassName = 'w-4 h-4 text-[#6B7280]',
}) => {
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    const resolvePhoto = async () => {
      setIsLoading(true);
      setHasError(false);

      try {
        let activePath: string | null | undefined = null;
        const targetId = userId || profileId;

        // Rule 1: Check if user is linked to an employee (GTK)
        if (targetId) {
          const emp = await employeeService.getEmployeeByProfileId(targetId);
          if (emp?.photo_url) {
            activePath = emp.photo_url;
          }
        }

        // Rule 2: If no employee photo found, fall back to passed photoUrl or profile avatar_url
        if (!activePath) {
          activePath = photoUrl || avatarUrl;
        }

        if (activePath) {
          if (activePath.startsWith('http://') || activePath.startsWith('https://')) {
            if (isMounted) setResolvedSrc(activePath);
          } else {
            const signed = await getPrivatePhotoSignedUrl(activePath);
            if (isMounted) setResolvedSrc(signed);
          }
        } else {
          if (isMounted) setResolvedSrc(null);
        }
      } catch (err) {
        console.warn('UserAvatar resolve photo error:', err);
        if (isMounted) setResolvedSrc(null);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    resolvePhoto();
    return () => {
      isMounted = false;
    };
  }, [userId, profileId, avatarUrl, photoUrl]);

  const initials = name
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'P';

  if (resolvedSrc && !hasError) {
    return (
      <img
        src={resolvedSrc}
        alt={name}
        className={className}
        onError={() => setHasError(true)}
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <div className={`flex items-center justify-center font-bold bg-[#FFF7ED] text-[#F97316] border border-orange-200 overflow-hidden ${className}`}>
      {name && name !== 'Pegawai' && name !== 'Admin' ? (
        <span>{initials}</span>
      ) : (
        <UserIcon className={fallbackIconClassName} />
      )}
    </div>
  );
};
