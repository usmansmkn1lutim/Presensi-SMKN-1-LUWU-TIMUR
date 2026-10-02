import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileBottomNav } from './MobileNav';

export const AppLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex bg-[#FFFFFF] text-[#111827]">
      {/* Desktop Sidebar ONLY (Fixed left, width 256px / 16rem on desktop lg: 1024px+). No sidebar on mobile/tablet. */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 z-30">
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0 min-h-screen">
        <Header />

        <main className="flex-1 pb-24 lg:pb-8 p-4 sm:p-6 lg:p-8 bg-[#FFFFFF]">
          <div className="max-w-6xl mx-auto w-full">
            <Outlet />
          </div>
        </main>

        {/* Mobile & Tablet Bottom Navigation Bar (Sole navigation on mobile/tablet) */}
        <MobileBottomNav />
      </div>
    </div>
  );
};


