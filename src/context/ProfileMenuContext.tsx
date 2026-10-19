import React, { createContext, useContext, useState, useCallback } from 'react';

export type ProfileMenuModalType = 'security' | 'about' | null;

interface ProfileMenuContextType {
  isOpen: boolean;
  openMenu: () => void;
  closeMenu: () => void;
  toggleMenu: () => void;
  activeModal: ProfileMenuModalType;
  setActiveModal: (modal: ProfileMenuModalType) => void;
  closeModal: () => void;
}

const ProfileMenuContext = createContext<ProfileMenuContextType | undefined>(undefined);

export const ProfileMenuProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<ProfileMenuModalType>(null);

  const openMenu = useCallback(() => setIsOpen(true), []);
  const closeMenu = useCallback(() => setIsOpen(false), []);
  const toggleMenu = useCallback(() => setIsOpen((prev) => !prev), []);
  const closeModal = useCallback(() => setActiveModal(null), []);

  return (
    <ProfileMenuContext.Provider
      value={{
        isOpen,
        openMenu,
        closeMenu,
        toggleMenu,
        activeModal,
        setActiveModal,
        closeModal,
      }}
    >
      {children}
    </ProfileMenuContext.Provider>
  );
};

export const useProfileMenu = (): ProfileMenuContextType => {
  const context = useContext(ProfileMenuContext);
  if (!context) {
    throw new Error('useProfileMenu must be used within a ProfileMenuProvider');
  }
  return context;
};
