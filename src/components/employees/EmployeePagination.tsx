import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../ui/Button';

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

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

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
        'bg-[#FFFFFF] border-t border-[#E5E7EB] p-4 sm:p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-[#6B7280]'
      }
    >
      {/* Left: Range Info & Page Size Selector */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-[#374151]">
          Menampilkan <strong className="text-[#111827] font-semibold">{startItem}–{endItem}</strong> dari{' '}
          <strong className="text-[#111827] font-semibold">{totalItems}</strong> pegawai
        </span>

        <div className="flex items-center gap-1.5 pl-2 sm:border-l sm:border-[#E5E7EB]">
          <span className="text-[11px] text-[#9CA3AF]">Tampilkan:</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="h-8 px-2 bg-white border border-[#E5E7EB] rounded-lg text-xs font-semibold text-[#111827] focus:outline-none focus:border-[#F97316] cursor-pointer"
            aria-label="Pilih jumlah data per halaman"
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt} / hal
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Right: Page Navigation Buttons */}
      <div className="flex items-center gap-1 self-center sm:self-auto">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="Halaman Sebelumnya"
          className="h-8 w-8 p-0 flex items-center justify-center text-[#6B7280] disabled:opacity-40"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        <div className="flex items-center gap-1 mx-1">
          {getPageNumbers().map((page, index) => {
            if (page === '...') {
              return (
                <span
                  key={`ellipsis-${index}`}
                  className="w-8 h-8 flex items-center justify-center text-[#9CA3AF] text-xs font-mono"
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
                onClick={() => onPageChange(pageNum)}
                aria-current={isActive ? 'page' : undefined}
                className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center cursor-pointer ${
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

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label="Halaman Berikutnya"
          className="h-8 w-8 p-0 flex items-center justify-center text-[#6B7280] disabled:opacity-40"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
