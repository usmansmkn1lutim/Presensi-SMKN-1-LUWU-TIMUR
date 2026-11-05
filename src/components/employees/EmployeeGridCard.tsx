import React, { useState, useRef, useEffect } from 'react';
import {
  MoreVertical,
  Eye,
  Edit2,
  Power,
  Trash2,
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import { UserAvatar } from '../ui/UserAvatar';
import { EmployeeWithRelations } from '../../types/employee';

interface EmployeeGridCardProps {
  employee: EmployeeWithRelations;
  canManage: boolean;
  onViewDetail: (employee: EmployeeWithRelations) => void;
  onEdit: (employee: EmployeeWithRelations) => void;
  onToggleStatus: (employee: EmployeeWithRelations) => void;
  onDelete: (employee: EmployeeWithRelations) => void;
}

export const EmployeeGridCard: React.FC<EmployeeGridCardProps> = ({
  employee,
  canManage,
  onViewDetail,
  onEdit,
  onToggleStatus,
  onDelete,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside or escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen]);

  // Format gender label
  const formatGender = (gender: string | null | undefined) => {
    if (!gender) return '—';
    if (gender === 'male' || gender === 'L') return 'Laki-laki';
    if (gender === 'female' || gender === 'P') return 'Perempuan';
    return gender;
  };

  const renderDropdownMenu = () => (
    <div
      ref={menuRef}
      className="absolute right-0 top-full mt-1.5 w-48 bg-white border border-[#E5E7EB] rounded-2xl shadow-xl py-1.5 z-30 text-left animate-in fade-in duration-150"
    >
      <div className="px-3 py-1.5 text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider border-b border-[#F3F4F6] truncate">
        {employee.full_name}
      </div>

      {/* Detail */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsMenuOpen(false);
          onViewDetail(employee);
        }}
        className="w-full px-3 py-2 text-xs font-medium text-[#374151] hover:bg-orange-50 hover:text-[#F97316] flex items-center gap-2.5 transition-colors cursor-pointer"
      >
        <Eye className="w-3.5 h-3.5 text-[#6B7280]" />
        <span>Detail Pegawai</span>
      </button>

      {canManage && (
        <>
          {/* Edit */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsMenuOpen(false);
              onEdit(employee);
            }}
            className="w-full px-3 py-2 text-xs font-medium text-[#374151] hover:bg-gray-50 hover:text-[#111827] flex items-center gap-2.5 transition-colors cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5 text-[#6B7280]" />
            <span>Edit Data</span>
          </button>

          {/* Status Toggle */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsMenuOpen(false);
              onToggleStatus(employee);
            }}
            className={`w-full px-3 py-2 text-xs font-medium flex items-center gap-2.5 transition-colors cursor-pointer ${
              employee.status === 'active'
                ? 'text-amber-700 hover:bg-amber-50'
                : 'text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            <span>{employee.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'}</span>
          </button>

          <div className="my-1 border-t border-[#F3F4F6]" />

          {/* Delete */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsMenuOpen(false);
              onDelete(employee);
            }}
            className="w-full px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-2.5 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-500" />
            <span>Hapus Pegawai</span>
          </button>
        </>
      )}
    </div>
  );

  return (
    <>
      {/* DESKTOP CARD (≥1024px) - 100% Untouched Main Card */}
      <div
        onClick={() => onViewDetail(employee)}
        className="hidden lg:flex bg-[#FFFFFF] border border-[#E5E7EB] hover:border-orange-300 rounded-2xl p-4 sm:p-5 shadow-2xs hover:shadow-md transition-all duration-200 flex-col items-center justify-between group cursor-pointer relative aspect-[4/5] text-center"
      >
        {/* Top Right: Minimal Three-dot More Menu Button */}
        <div className="absolute top-3 right-3 z-20">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsMenuOpen((prev) => !prev);
            }}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-[#6B7280] hover:text-[#111827] hover:bg-gray-100/80 active:bg-gray-200/80 transition-all cursor-pointer bg-transparent border-0 shadow-none"
            aria-label="Menu aksi pegawai"
            title="Menu Aksi"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {isMenuOpen && renderDropdownMenu()}
        </div>

        {/* Top Center: Profile Avatar, Name, NIP, and Unified Info Panel */}
        <div className="flex flex-col items-center w-full my-auto">
          {/* Avatar */}
          <UserAvatar
            userId={employee.profile_id}
            photoUrl={employee.photo_url}
            name={employee.full_name}
            className="w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-full object-cover border border-[#E5E7EB] mx-auto shrink-0"
          />

          {/* Full Name (Max 2 lines) */}
          <h3 className="font-bold text-xs sm:text-sm text-[#111827] group-hover:text-[#F97316] transition-colors mt-3.5 line-clamp-2 px-1 leading-snug">
            {employee.full_name}
          </h3>

          {/* NIP */}
          <p className="text-[11px] text-[#6B7280] font-mono mt-1.5 truncate">
            NIP: {employee.nip || '—'}
          </p>

          {/* Unified Information Panel */}
          <div className="w-full mt-3.5 bg-[#F3F4F6] rounded-xl p-3 text-left space-y-2 border border-[#E5E7EB]/50">
            {/* Baris 1: Departemen */}
            <div className="flex items-start justify-between gap-2 text-[11px]">
              <span className="font-bold text-[#374151] shrink-0">Departemen:</span>
              <span className="text-[#4B5563] text-right truncate" title={employee.departments?.name || '—'}>
                {employee.departments?.name || '—'}
              </span>
            </div>

            <div className="border-b border-[#E5E7EB]" />

            {/* Baris 2: Jabatan */}
            <div className="flex items-start justify-between gap-2 text-[11px]">
              <span className="font-bold text-[#374151] shrink-0">Jabatan:</span>
              <span className="text-[#4B5563] text-right truncate" title={employee.positions?.name || '—'}>
                {employee.positions?.name || '—'}
              </span>
            </div>

            <div className="border-b border-[#E5E7EB]" />

            {/* Baris 3: Jenis Kelamin */}
            <div className="flex items-start justify-between gap-2 text-[11px]">
              <span className="font-bold text-[#374151] shrink-0">Jenis Kelamin:</span>
              <span className="text-[#4B5563] text-right truncate">
                {formatGender(employee.gender)}
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Area: Employee Type and Status Badge */}
        <div className="w-full pt-3 mt-auto border-t border-[#F3F4F6] flex items-center justify-between gap-2 px-1">
          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-semibold bg-gray-100 text-[#374151]">
            {employee.employee_type || 'PNS'}
          </span>

          <Badge
            variant={employee.status === 'active' ? 'success' : 'danger'}
            size="sm"
          >
            {employee.status === 'active' ? 'Aktif' : 'Nonaktif'}
          </Badge>
        </div>
      </div>

      {/* MOBILE / TABLET CARD (<1024px) */}
      <div
        onClick={() => onViewDetail(employee)}
        className="flex lg:hidden bg-[#FFFFFF] border border-[#E5E7EB] hover:border-orange-300 rounded-2xl p-4 shadow-2xs transition-all duration-200 flex-col justify-between group cursor-pointer relative"
      >
        {/* Top Header Row: Avatar (left), Name & NIP (middle), Minimal Action Button (top right) */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <UserAvatar
              userId={employee.profile_id}
              photoUrl={employee.photo_url}
              name={employee.full_name}
              className="w-12 h-12 rounded-full object-cover border border-[#E5E7EB] shrink-0"
            />
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-sm text-[#111827] group-hover:text-[#F97316] transition-colors truncate">
                {employee.full_name}
              </h3>
              <p className="text-[11px] text-[#6B7280] font-mono mt-0.5 truncate">
                NIP: {employee.nip || '—'}
              </p>
            </div>
          </div>

          <div className="relative shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsMenuOpen((prev) => !prev);
              }}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-[#6B7280] hover:text-[#111827] hover:bg-gray-100/80 active:bg-gray-200/80 transition-all cursor-pointer bg-transparent border-0 shadow-none"
              aria-label="Menu aksi pegawai"
              title="Menu Aksi"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {isMenuOpen && renderDropdownMenu()}
          </div>
        </div>

        {/* Middle Gray Information Panel (#F3F4F6) */}
        <div className="w-full my-3 bg-[#F3F4F6] rounded-xl p-3 space-y-2 border border-[#E5E7EB]/50 text-xs">
          {/* Row 1: Departemen */}
          <div className="flex items-center justify-between gap-2 text-[11px]">
            <span className="font-bold text-[#374151] shrink-0">Departemen:</span>
            <span className="text-[#4B5563] text-right truncate font-medium" title={employee.departments?.name || '—'}>
              {employee.departments?.name || '—'}
            </span>
          </div>

          <div className="border-b border-[#E5E7EB]" />

          {/* Row 2: Jabatan */}
          <div className="flex items-center justify-between gap-2 text-[11px]">
            <span className="font-bold text-[#374151] shrink-0">Jabatan:</span>
            <span className="text-[#4B5563] text-right truncate font-medium" title={employee.positions?.name || '—'}>
              {employee.positions?.name || '—'}
            </span>
          </div>

          <div className="border-b border-[#E5E7EB]" />

          {/* Row 3: Jenis Kelamin */}
          <div className="flex items-center justify-between gap-2 text-[11px]">
            <span className="font-bold text-[#374151] shrink-0">Jenis Kelamin:</span>
            <span className="text-[#4B5563] text-right truncate font-medium">
              {formatGender(employee.gender)}
            </span>
          </div>
        </div>

        {/* Bottom Row: Plain Text Employee Type & Status Badge */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#F3F4F6]">
          <span className="text-xs font-semibold text-[#374151]">
            {employee.employee_type || 'PNS'}
          </span>

          <Badge
            variant={employee.status === 'active' ? 'success' : 'danger'}
            size="sm"
          >
            {employee.status === 'active' ? 'Aktif' : 'Nonaktif'}
          </Badge>
        </div>
      </div>
    </>
  );
};

