import React, { useState, useRef, useEffect } from 'react';
import { Search, SlidersHorizontal, Check } from 'lucide-react';
import { RequestStatus } from '../../types/request.types';

interface RequestMobileSearchFilterProps {
  search: string;
  onSearchChange: (val: string) => void;
  status: RequestStatus | 'all';
  onStatusChange: (status: RequestStatus | 'all') => void;
  placeholder?: string;
}

const STATUS_OPTIONS: { value: RequestStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Semua' },
  { value: 'pending', label: 'Menunggu' },
  { value: 'approved', label: 'Disetujui' },
  { value: 'rejected', label: 'Ditolak' },
  { value: 'cancelled', label: 'Dibatalkan' },
];

export const RequestMobileSearchFilter: React.FC<RequestMobileSearchFilterProps> = ({
  search,
  onSearchChange,
  status,
  onStatusChange,
  placeholder = 'Cari pengajuan...',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const activeLabel = STATUS_OPTIONS.find((opt) => opt.value === status)?.label || 'Semua';
  const isFiltered = status !== 'all';

  return (
    <div className="relative font-sans" ref={dropdownRef}>
      {/* Search Bar with integrated filter button */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-1.5 pl-3.5 shadow-2xs flex items-center gap-2 focus-within:border-[#F97316] transition-colors">
        <Search className="w-4 h-4 text-[#9CA3AF] shrink-0" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent border-none text-xs sm:text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:outline-hidden"
        />
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          title="Filter status"
          aria-label="Filter status"
          className={`p-2 rounded-xl transition-colors shrink-0 flex items-center justify-center cursor-pointer ${
            isFiltered || isOpen
              ? 'bg-[#FFF7ED] text-[#F97316] border border-[#FFEDD5]'
              : 'hover:bg-[#F3F4F6] text-[#6B7280]'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* Filter Dropdown Popup */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-[#E5E7EB] rounded-2xl shadow-lg z-30 p-1.5 animate-in fade-in zoom-in-95">
          <div className="px-3 py-2 border-b border-[#F3F4F6]">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#9CA3AF]">
              Filter Status
            </span>
          </div>
          <div className="py-1 space-y-0.5">
            {STATUS_OPTIONS.map((opt) => {
              const isSelected = status === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onStatusChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#FFF7ED] text-[#F97316] font-bold'
                      : 'text-[#374151] hover:bg-[#F9FAFB]'
                  }`}
                >
                  <span>{opt.label}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#F97316]" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
