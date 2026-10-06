import React from 'react';
import {
  ChevronRight,
  HeartPulse,
  FileText,
  Briefcase,
  Calendar,
  HelpCircle,
} from 'lucide-react';
import {
  RequestRow,
  RequestWithRelations,
  REQUEST_STATUS_LABELS,
  formatRequestDuration,
} from '../../types/request.types';

interface RequestMobileCardProps {
  request: RequestRow | RequestWithRelations;
  onSelect: (request: RequestRow | RequestWithRelations) => void;
}

/**
 * Return appropriate label & single Orange Sunset icon for each request type
 */
function getRequestTypeDisplay(type: string): { label: string; icon: React.ReactNode } {
  const normalized = type?.toLowerCase() || '';

  switch (normalized) {
    case 'sick':
      return {
        label: 'Sakit',
        icon: <HeartPulse className="w-4 h-4 text-[#F97316] shrink-0" />,
      };
    case 'permit':
      return {
        label: 'Izin',
        icon: <FileText className="w-4 h-4 text-[#F97316] shrink-0" />,
      };
    case 'official_duty':
      return {
        label: 'Dinas Luar',
        icon: <Briefcase className="w-4 h-4 text-[#F97316] shrink-0" />,
      };
    case 'leave':
      return {
        label: 'Cuti',
        icon: <Calendar className="w-4 h-4 text-[#F97316] shrink-0" />,
      };
    case 'other':
    default:
      return {
        label: 'Lainnya',
        icon: <HelpCircle className="w-4 h-4 text-[#F97316] shrink-0" />,
      };
  }
}

/**
 * Format range e.g.:
 * Single day: '6 Okt 2026'
 * Multi day: '6 Okt – 9 Okt 2026' (or '28 Sep – 2 Okt 2026')
 */
function formatShortDateRange(startStr: string, endStr: string): string {
  if (!startStr) return '—';
  try {
    const parse = (s: string) => {
      const parts = s.split('-');
      return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    };

    const d1 = parse(startStr);
    const day1 = d1.getDate();
    const m1 = d1.toLocaleDateString('id-ID', { month: 'short' });
    const y1 = d1.getFullYear();

    if (!endStr || startStr === endStr) {
      return `${day1} ${m1} ${y1}`;
    }

    const d2 = parse(endStr);
    const day2 = d2.getDate();
    const m2 = d2.toLocaleDateString('id-ID', { month: 'short' });
    const y2 = d2.getFullYear();

    if (y1 === y2 && m1 === m2) {
      return `${day1} ${m1} – ${day2} ${m2} ${y2}`;
    }
    if (y1 === y2) {
      return `${day1} ${m1} – ${day2} ${m2} ${y2}`;
    }
    return `${day1} ${m1} ${y1} – ${day2} ${m2} ${y2}`;
  } catch {
    return `${startStr} – ${endStr}`;
  }
}

/**
 * Format submission time e.g.: 'Diajukan 5 Okt 2026 • 13.05'
 */
function formatSubmittedAt(isoStr?: string | null): string {
  if (!isoStr) return '—';
  try {
    const d = new Date(isoStr);
    const day = d.getDate();
    const month = d.toLocaleDateString('id-ID', { month: 'short' });
    const year = d.getFullYear();
    const time = d
      .toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
      .replace(':', '.');

    return `Diajukan ${day} ${month} ${year} • ${time}`;
  } catch {
    return '—';
  }
}

export const RequestMobileCard: React.FC<RequestMobileCardProps> = ({
  request,
  onSelect,
}) => {
  const { label: typeLabel, icon: typeIcon } = getRequestTypeDisplay(request.request_type);
  const statusLabel = REQUEST_STATUS_LABELS[request.status] || request.status;
  const dateRangeText = formatShortDateRange(request.start_date, request.end_date);
  const durationText = formatRequestDuration(request.start_date, request.end_date);
  const submittedText = formatSubmittedAt(request.submitted_at);

  return (
    <div
      onClick={() => onSelect(request)}
      className="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-2xs space-y-2 hover:border-slate-300 transition-colors cursor-pointer group font-sans"
    >
      {/* Baris 1: [Icon tipe] Tipe Pengajuan (kiri, Orange Sunset) | Status (kanan, Orange Sunset tanpa badge) */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {typeIcon}
          <span className="text-sm font-bold text-[#F97316] truncate">
            {typeLabel}
          </span>
        </div>
        <span className="text-xs font-semibold text-[#F97316] shrink-0">
          {statusLabel}
        </span>
      </div>

      {/* Baris 2: [Icon kalender] Tanggal pengajuan • Durasi */}
      <div className="text-xs font-medium text-[#6B7280] flex items-center gap-1.5">
        <Calendar className="w-3.5 h-3.5 text-[#F97316] shrink-0" />
        <span className="truncate">{dateRangeText}</span>
        <span className="mx-0.5">•</span>
        <span className="shrink-0">{durationText}</span>
      </div>

      {/* Baris 3: Alasan / deskripsi singkat (line clamp) */}
      {request.reason ? (
        <p className="text-xs text-[#374151] line-clamp-2 leading-relaxed">
          {request.reason}
        </p>
      ) : (
        <p className="text-xs text-[#9CA3AF] italic leading-relaxed">
          Tidak ada keterangan alasan.
        </p>
      )}

      {/* Baris 4: Diajukan tanggal • jam (kiri) | Rincian › (kanan) */}
      <div className="flex items-center justify-between pt-2 border-t border-[#F3F4F6] text-xs">
        <span className="text-[11px] sm:text-xs text-[#9CA3AF]">
          {submittedText}
        </span>
        <span className="text-xs font-semibold text-[#F97316] group-hover:text-[#EA580C] flex items-center gap-0.5">
          Rincian
          <ChevronRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </div>
  );
};
