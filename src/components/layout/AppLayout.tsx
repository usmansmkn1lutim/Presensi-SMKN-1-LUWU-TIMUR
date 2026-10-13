import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileBottomNav } from './MobileNav';

const SIDEBAR_COLLAPSED_KEY = 'tamaki-sidebar-collapsed';

export const AppLayout: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      return saved === 'true';
    } catch (e) {
      console.warn('Gagal membaca preferensi sidebar:', e);
      return false;
    }
  });

  const handleToggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      } catch (e) {
        console.warn('Gagal menyimpan preferensi sidebar:', e);
      }
      return next;
    });
  };

  return (
    <div className="min-h-screen lg:h-screen flex bg-white lg:bg-[#F97316] text-[#111827] lg:overflow-hidden">
      {/* Desktop Sidebar ONLY (Fixed left, responsive width lg:w-64 / lg:w-20 on desktop lg: 1024px+). No sidebar on mobile/tablet. */}
      <div
        className={`hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 z-30 transition-all duration-300 ease-in-out ${
          isCollapsed ? 'lg:w-20' : 'lg:w-64'
        }`}
      >
        <Sidebar isCollapsed={isCollapsed} onToggleCollapse={handleToggleCollapse} />
      </div>

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 min-h-screen lg:h-screen transition-all duration-300 ease-in-out ${
          isCollapsed ? 'lg:pl-20' : 'lg:pl-64'
        }`}
      >
        {/* Kanvas Utama Desktop (lg: dan ke atas) / Alur Konten Standar (mobile & tablet) */}
        <div className="flex-1 flex flex-col min-w-0 bg-white lg:rounded-l-[32px] lg:rounded-r-none lg:bg-[#F2F2F2] lg:shadow-xl lg:overflow-y-auto lg:overflow-x-hidden lg:h-screen [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {/* Header Global di dalam Kanvas */}
          <Header />

          {/* Konten Halaman */}
          <main className="flex-1 pb-24 lg:pb-8 p-4 sm:p-6 lg:p-8 bg-white lg:bg-transparent">
            <div className="max-w-7xl mx-auto w-full">
              <Outlet />
            </div>
          </main>
        </div>

        {/* Mobile & Tablet Bottom Navigation Bar (Sole navigation on mobile/tablet) */}
        <MobileBottomNav />
      </div>
    </div>
  );
};


