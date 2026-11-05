import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface EmployeePaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
  className?: string;
}

export const EmployeePagination: React.FC<EmployeePaginationProps> = ({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 12, 20],
  className,
}) => {
  if (totalItems === 0) {
    return null;
  }

  // Generate page numbers to display with smart ellipsis if necessary
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  return (
    <div
      className={
        className ||
        'bg-[#FFFFFF] border-t border-[#E5E7EB] px-3.5 py-3 sm:px-5 sm:py-4 flex flex-row items-center justify-between gap-2 text-xs text-[#6B7280] w-full overflow-hidden'
      }
    >
      {/* Kelompok Kiri — Informasi Jumlah Data */}
      <div className="flex items-center gap-1.5 text-xs text-[#374151] whitespace-nowrap shrink-0">
        <span>Tampilkan</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="h-7 px-1.5 bg-white border border-[#E5E7EB] rounded-lg text-xs font-semibold text-[#111827] focus:outline-none focus:border-[#F97316] cursor-pointer"
          aria-label="Pilih jumlah data per halaman"
        >
          {pageSizeOptions.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <span>
          dari <strong className="font-semibold text-[#111827]">{totalItems}</strong> pegawai
        </span>
      </div>

      {/* Kelompok Kanan — Navigasi Halaman */}
      <div className="flex items-center gap-1 shrink-0 justify-end">
        {/* Tombol Halaman Sebelumnya */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="Halaman Sebelumnya"
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg border border-[#E5E7EB] bg-white flex items-center justify-center text-[#6B7280] hover:text-[#111827] hover:bg-gray-50 disabled:opacity-35 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        {/* Daftar Nomor Halaman */}
        <div className="flex items-center gap-0.5 sm:gap-1">
          {getPageNumbers().map((page, index) => {
            if (page === '...') {
              return (
                <span
                  key={`ellipsis-${index}`}
                  className="w-6 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-[#9CA3AF] text-[11px] sm:text-xs font-mono select-none"
                >
                  ...
                </span>
              );
            }

            const pageNum = Number(page);
            const isActive = pageNum === currentPage;

            return (
              <button
                key={pageNum}
                type="button"
                onClick={() => onPageChange(pageNum)}
                aria-current={isActive ? 'page' : undefined}
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center cursor-pointer ${
                  isActive
                    ? 'bg-[#FFF7ED] text-[#F97316] border border-[#F97316] font-bold shadow-2xs'
                    : 'text-[#4B5563] hover:text-[#111827] hover:bg-[#F3F4F6] border border-transparent'
                }`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        {/* Tombol Halaman Berikutnya */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label="Halaman Berikutnya"
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg border border-[#E5E7EB] bg-white flex items-center justify-center text-[#6B7280] hover:text-[#111827] hover:bg-gray-50 disabled:opacity-35 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>
      </div>
    </div>
  );
};

