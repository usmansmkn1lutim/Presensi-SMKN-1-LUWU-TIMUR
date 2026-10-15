import React, { useState } from 'react';
import {
  Trophy,
  AlertTriangle,
  Sparkles,
  Calendar,
  CheckCircle2,
  Clock,
  Info,
  Medal,
} from 'lucide-react';
import {
  DisciplineLeaderboard as DisciplineLeaderboardData,
  LeaderboardItem,
} from '../../services/dashboardExecutiveService';

export interface DisciplineLeaderboardProps {
  /**
   * Data leaderboard yang mencakup topDisciplined, topLate, dan monthLabel.
   */
  leaderboard?: DisciplineLeaderboardData | null;
  /**
   * Status loading skeleton.
   */
  loading?: boolean;
  /**
   * State error message jika terjadi kegagalan pengambilan data.
   */
  error?: string | null;
  /**
   * Optional CSS className override untuk container utama.
   */
  className?: string;
}

/**
 * Helper untuk mengambil inisial dari nama GTK jika avatar gagal dimuat atau null
 */
function getInitials(name: string): string {
  if (!name) return 'GTK';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Badge peringkat 1, 2, 3 dengan visual khusus medali, dan angka standar untuk peringkat 4-5
 */
const RankBadge: React.FC<{ rank: number; variant: 'disciplined' | 'late' }> = ({
  rank,
  variant,
}) => {
  if (variant === 'disciplined') {
    if (rank === 1) {
      return (
        <span
          className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-amber-500 text-white font-bold text-xs shadow-xs ring-2 ring-amber-100"
          title="Peringkat 1 (Emas)"
        >
          <Medal className="w-4 h-4" />
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span
          className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-slate-400 text-white font-bold text-xs shadow-xs ring-2 ring-slate-100"
          title="Peringkat 2 (Perak)"
        >
          <Medal className="w-3.5 h-3.5" />
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span
          className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-amber-700 text-white font-bold text-xs shadow-xs ring-2 ring-amber-100"
          title="Peringkat 3 (Perunggu)"
        >
          <Medal className="w-3.5 h-3.5" />
        </span>
      );
    }
    return (
      <span
        className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-slate-100 text-slate-600 font-semibold text-xs border border-slate-200"
        title={`Peringkat ${rank}`}
      >
        {rank}
      </span>
    );
  }

  // Variant late: Peringkat keterlambatan (Amber / Rose)
  if (rank === 1) {
    return (
      <span
        className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-rose-500 text-white font-bold text-xs shadow-xs ring-2 ring-rose-100"
        title="Frekuensi Terlambat Tertinggi #1"
      >
        1
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span
        className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-rose-400 text-white font-bold text-xs shadow-xs ring-2 ring-rose-100"
        title="Frekuensi Terlambat Tertinggi #2"
      >
        2
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span
        className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-amber-500 text-white font-bold text-xs shadow-xs ring-2 ring-amber-100"
        title="Frekuensi Terlambat Tertinggi #3"
      >
        3
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-slate-100 text-slate-600 font-semibold text-xs border border-slate-200"
      title={`Peringkat ${rank}`}
    >
      {rank}
    </span>
  );
};

/**
 * Avatar komponen dengan fallback inisial nama yang elegan dan penanganan image error
 */
const EmployeeAvatar: React.FC<{
  photoUrl: string | null;
  name: string;
  variant: 'disciplined' | 'late';
}> = ({ photoUrl, name, variant }) => {
  const [imageError, setImageError] = useState(false);

  const initialsBg =
    variant === 'disciplined'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : 'bg-amber-50 text-amber-700 border-amber-200';

  if (!photoUrl || imageError) {
    return (
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold border shrink-0 ${initialsBg}`}
        aria-hidden="true"
      >
        {getInitials(name)}
      </div>
    );
  }

  return (
    <img
      src={photoUrl}
      alt={`Foto ${name}`}
      onError={() => setImageError(true)}
      className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0"
      loading="lazy"
    />
  );
};

export const DisciplineLeaderboard: React.FC<DisciplineLeaderboardProps> = ({
  leaderboard,
  loading = false,
  error = null,
  className = '',
}) => {
  // Skeleton Loader State
  if (loading) {
    return (
      <div
        className={`grid grid-cols-1 lg:grid-cols-2 gap-5 ${className}`}
        aria-busy="true"
        aria-label="Memuat papan peringkat kedisiplinan GTK"
      >
        {[1, 2].map((cardIdx) => (
          <div
            key={cardIdx}
            className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-4 animate-pulse"
          >
            {/* Header skeleton */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-100" />
                <div className="space-y-1.5">
                  <div className="h-4 bg-slate-200 rounded w-36" />
                  <div className="h-3 bg-slate-100 rounded w-24" />
                </div>
              </div>
              <div className="h-6 bg-slate-100 rounded-full w-20" />
            </div>

            {/* List items skeleton */}
            <div className="space-y-2.5">
              {[1, 2, 3, 4, 5].map((itemIdx) => (
                <div
                  key={itemIdx}
                  className="p-3 rounded-xl border border-slate-100 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-xl bg-slate-100 shrink-0" />
                    <div className="w-10 h-10 rounded-full bg-slate-200 shrink-0" />
                    <div className="space-y-1.5 min-w-0">
                      <div className="h-3.5 bg-slate-200 rounded w-32" />
                      <div className="h-2.5 bg-slate-100 rounded w-24" />
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <div className="h-4 bg-slate-200 rounded w-16" />
                    <div className="h-2.5 bg-slate-100 rounded w-12" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div
        className={`bg-white border border-rose-200 rounded-2xl p-6 text-center shadow-2xs ${className}`}
        role="alert"
      >
        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-500 mx-auto flex items-center justify-center mb-3">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-semibold text-slate-800 mb-1">
          Gagal Memuat Papan Peringkat Kedisiplinan
        </h4>
        <p className="text-xs text-slate-500 max-w-md mx-auto">{error}</p>
      </div>
    );
  }

  const topDisciplined = leaderboard?.topDisciplined ?? [];
  const topLate = leaderboard?.topLate ?? [];
  const monthLabel = leaderboard?.monthLabel || 'Bulan Berjalan';

  return (
    <div className={`space-y-3.5 ${className}`}>
      {/* Grid 2 Kolom untuk Top 5 Terdisiplin & Top 5 Sering Terlambat */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* ============================================================ */}
        {/* KOLOM 1: TOP 5 KETEPATAN WAKTU TERBAIK                       */}
        {/* ============================================================ */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
          <div>
            {/* Header Kolom 1 */}
            <div className="flex items-start justify-between gap-3 pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-2xs shrink-0" style={{ backgroundColor: 'var(--color-status-present-bg)', borderColor: 'var(--color-status-present)', color: 'var(--color-status-present)' }}>
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-semibold text-slate-900 tracking-tight">
                      Top 5 GTK Paling Disiplin
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Konsistensi ketepatan waktu hadir terbaik
                  </p>
                </div>
              </div>

              {/* Badge Periode Bulan */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-2xs font-medium shrink-0" style={{ backgroundColor: 'var(--color-status-present-bg)', color: 'var(--color-status-present)' }}>
                <Calendar className="w-3 h-3" style={{ color: 'var(--color-status-present)' }} />
                <span>{monthLabel}</span>
              </div>
            </div>

            {/* List GTK Terdisiplin */}
            <div className="mt-3.5 space-y-2">
              {topDisciplined.length === 0 ? (
                <div className="py-10 px-4 text-center rounded-xl bg-slate-50/70 border border-dashed border-slate-200 my-2">
                  <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-2">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-medium text-slate-700">
                    Belum Ada Data Presensi Bulan Ini
                  </p>
                  <p className="text-2xs text-slate-400 mt-0.5 max-w-xs mx-auto">
                    Data peringkat ketepatan waktu akan muncul setelah GTK melakukan presensi masuk.
                  </p>
                </div>
              ) : (
                topDisciplined.map((item: LeaderboardItem, index: number) => {
                  const rank = index + 1;
                  return (
                    <div
                      key={item.employeeId}
                      className="group flex items-center justify-between gap-3 p-2.5 sm:p-3 rounded-xl border border-slate-100 hover:border-[var(--color-status-present)] hover:bg-[var(--color-status-present-bg)] transition-colors duration-150"
                    >
                      {/* Left: Rank, Avatar, Name & Dept */}
                      <div className="flex items-center gap-3 min-w-0">
                        <RankBadge rank={rank} variant="disciplined" />

                        <div className="min-w-0">
                          <p
                            className="text-xs sm:text-sm font-semibold text-slate-900 truncate group-hover:text-emerald-950"
                            title={item.fullName}
                          >
                            {item.fullName}
                          </p>
                        </div>
                      </div>

                      {/* Right: Metrics */}
                      <div className="flex flex-col items-end shrink-0 pl-2">
                        <div className="flex items-center gap-1">
                          <span className="text-xs sm:text-sm font-bold font-mono" style={{ color: 'var(--color-status-present)' }}>
                            {item.onTimeCount}
                          </span>
                          <span className="text-2xs text-slate-500 font-medium">
                            / {item.attendanceCount} hadir
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Catatan Transparansi / Denominator di Footer Kolom 1 */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-start gap-2 text-2xs text-slate-500 bg-slate-50/60 p-2.5 rounded-lg border border-slate-100">
            <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Diurutkan berdasarkan jumlah hadir tepat waktu dan rasio kepatuhan terhadap total hari kehadiran bulan berjalan.
            </p>
          </div>
        </div>

        {/* ============================================================ */}
        {/* KOLOM 2: TOP 5 FREKUENSI KETERLAMBATAN TERTINGGI              */}
        {/* ============================================================ */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
          <div>
            {/* Header Kolom 2 */}
            <div className="flex items-start justify-between gap-3 pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-2xs shrink-0" style={{ backgroundColor: 'var(--color-status-late-bg)', borderColor: 'var(--color-status-late)', color: 'var(--color-status-late)' }}>
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-semibold text-slate-900 tracking-tight">
                      Top 5 Sering Terlambat
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Frekuensi keterlambatan presensi masuk tertinggi
                  </p>
                </div>
              </div>

              {/* Badge Periode Bulan */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-2xs font-medium shrink-0" style={{ backgroundColor: 'var(--color-status-late-bg)', color: 'var(--color-status-late)' }}>
                <Calendar className="w-3 h-3" style={{ color: 'var(--color-status-late)' }} />
                <span>{monthLabel}</span>
              </div>
            </div>

            {/* List GTK Terlambat */}
            <div className="mt-3.5 space-y-2">
              {topLate.length === 0 ? (
                <div className="py-10 px-4 text-center rounded-xl bg-emerald-50/40 border border-dashed border-emerald-200/80 my-2">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center mb-2">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-semibold text-emerald-800">
                    Nihil Keterlambatan Bulan Ini
                  </p>
                  <p className="text-2xs text-emerald-700/80 mt-0.5 max-w-xs mx-auto">
                    Seluruh GTK yang melakukan presensi hadir tepat waktu tanpa ada catatan keterlambatan.
                  </p>
                </div>
              ) : (
                topLate.map((item: LeaderboardItem, index: number) => {
                  const rank = index + 1;
                  return (
                    <div
                      key={item.employeeId}
                      className="group flex items-center justify-between gap-3 p-2.5 sm:p-3 rounded-xl border border-slate-100 hover:border-[var(--color-status-late)] hover:bg-[var(--color-status-late-bg)] transition-colors duration-150"
                    >
                      {/* Left: Rank, Avatar, Name & Dept */}
                      <div className="flex items-center gap-3 min-w-0">
                        <RankBadge rank={rank} variant="late" />

                        <div className="min-w-0">
                          <p
                            className="text-xs sm:text-sm font-semibold text-slate-900 truncate group-hover:text-amber-950"
                            title={item.fullName}
                          >
                            {item.fullName}
                          </p>
                        </div>
                      </div>

                      {/* Right: Metrics */}
                      <div className="flex flex-col items-end shrink-0 pl-2">
                        <div className="flex items-center gap-1">
                          <span className="text-xs sm:text-sm font-bold font-mono" style={{ color: 'var(--color-status-late)' }}>
                            {item.lateCount} kali
                          </span>
                          <span className="text-2xs text-slate-500 font-medium">
                            terlambat
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Catatan Evaluasi di Footer Kolom 2 */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-start gap-2 text-2xs text-slate-500 bg-slate-50/60 p-2.5 rounded-lg border border-slate-100">
            <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Hanya menampilkan GTK dengan catatan keterlambatan &gt; 0 sebagai rujukan evaluasi pembinaan disiplin kerja.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DisciplineLeaderboard;
