import React from 'react';
import { RecapStatistics } from '../../types/attendanceRecap.types';
import { PieChart, TrendingUp, Building2, Clock, CheckCircle2, AlertTriangle, UserX } from 'lucide-react';

interface RecapStatisticsSectionProps {
  statistics: RecapStatistics | null;
  loading: boolean;
}

export const RecapStatisticsSection: React.FC<RecapStatisticsSectionProps> = ({
  statistics,
  loading,
}) => {
  if (loading) {
    return (
      <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-5 shadow-2xs space-y-4 animate-pulse">
        <div className="h-5 bg-[#F3F4F6] rounded w-1/3" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-40 bg-[#F3F4F6] rounded-xl" />
          <div className="h-40 bg-[#F3F4F6] rounded-xl" />
        </div>
      </div>
    );
  }

  if (!statistics) {
    return (
      <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-6 text-center text-xs text-[#6B7280]">
        Belum ada data statistik untuk ditampilkan.
      </div>
    );
  }

  const { checkInStatusStats, checkOutStatusStats, dailyTrend, departmentStats } = statistics;

  const maxDailyPresent = Math.max(
    1,
    ...dailyTrend.map((d) => d.onTime + d.late + d.absent)
  );

  const maxDeptEmp = Math.max(1, ...departmentStats.map((d) => d.totalEmployees));

  return (
    <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-5 sm:p-6 shadow-2xs space-y-6">
      {/* Section Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
        <div>
          <h3 className="text-base font-bold text-[#111827] flex items-center gap-2">
            <PieChart className="w-4 h-4 text-[#F97316]" />
            Statistik Presensi
          </h3>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Visualisasi distribusi kehadiran, tren harian, dan perbandingan departemen
          </p>
        </div>
      </div>

      {/* Grid 1: Status Distribution Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Check-in Status Card */}
        <div className="p-4 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#111827] flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#F97316]" />
              Statistik Status Masuk
            </span>
            <span className="text-[11px] font-semibold text-[#6B7280]">
              Total: {checkInStatusStats.onTimeCount + checkInStatusStats.lateCount}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="h-3 w-full bg-[#E5E7EB] rounded-full overflow-hidden flex">
            <div
              style={{ width: `${checkInStatusStats.onTimePercentage}%`, backgroundColor: 'var(--color-status-present)' }}
              className="h-full transition-all duration-500"
              title={`Tepat Waktu: ${checkInStatusStats.onTimePercentage}%`}
            />
            <div
              style={{ width: `${checkInStatusStats.latePercentage}%`, backgroundColor: 'var(--color-status-late)' }}
              className="h-full transition-all duration-500"
              title={`Terlambat: ${checkInStatusStats.latePercentage}%`}
            />
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
            <div className="p-2.5 rounded-lg border" style={{ backgroundColor: 'var(--color-status-present-bg)', borderColor: 'var(--color-status-present)' }}>
              <span className="font-semibold block flex items-center gap-1" style={{ color: 'var(--color-status-present)', fontSize: '10px' }}>
                <CheckCircle2 className="w-3 h-3" />
                Tepat Waktu
              </span>
              <span className="text-base font-bold mt-0.5 block" style={{ color: 'var(--color-status-present)' }}>
                {checkInStatusStats.onTimeCount}{' '}
                <span className="text-xs font-medium" style={{ color: 'var(--color-status-present)' }}>
                  ({checkInStatusStats.onTimePercentage}%)
                </span>
              </span>
            </div>

            <div className="p-2.5 rounded-lg border" style={{ backgroundColor: 'var(--color-status-late-bg)', borderColor: 'var(--color-status-late)' }}>
              <span className="font-semibold block flex items-center gap-1" style={{ color: 'var(--color-status-late)', fontSize: '10px' }}>
                <AlertTriangle className="w-3 h-3" />
                Terlambat
              </span>
              <span className="text-base font-bold mt-0.5 block" style={{ color: 'var(--color-status-late)' }}>
                {checkInStatusStats.lateCount}{' '}
                <span className="text-xs font-medium" style={{ color: 'var(--color-status-late)' }}>
                  ({checkInStatusStats.latePercentage}%)
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Check-out Status Card */}
        <div className="p-4 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#111827] flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
              Statistik Status Check-out
            </span>
            <span className="text-[11px] font-semibold text-[#6B7280]">
              Total: {checkOutStatusStats.checkedOutCount + checkOutStatusStats.notCheckedOutCount}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="h-3 w-full bg-[#E5E7EB] rounded-full overflow-hidden flex">
            <div
              style={{ width: `${checkOutStatusStats.checkedOutPercentage}%` }}
              className="bg-blue-500 h-full transition-all duration-500"
              title={`Sudah Check-out: ${checkOutStatusStats.checkedOutPercentage}%`}
            />
            <div
              style={{ width: `${checkOutStatusStats.notCheckedOutPercentage}%`, backgroundColor: 'var(--color-status-absent)' }}
              className="h-full transition-all duration-500"
              title={`Belum Check-out: ${checkOutStatusStats.notCheckedOutPercentage}%`}
            />
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
            <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200">
              <span className="text-[10px] text-blue-800 font-semibold block flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-blue-600" />
                Sudah Check-out
              </span>
              <span className="text-base font-bold text-blue-700 mt-0.5 block">
                {checkOutStatusStats.checkedOutCount}{' '}
                <span className="text-xs font-medium text-blue-600">
                  ({checkOutStatusStats.checkedOutPercentage}%)
                </span>
              </span>
            </div>

            <div className="p-2.5 rounded-lg border" style={{ backgroundColor: 'var(--color-status-absent-bg)', borderColor: 'var(--color-status-absent-bg)' }}>
              <span className="font-semibold block flex items-center gap-1" style={{ color: 'var(--color-status-absent-text)', fontSize: '10px' }}>
                <UserX className="w-3 h-3" style={{ color: 'var(--color-status-absent)' }} />
                Belum Check-out
              </span>
              <span className="text-base font-bold mt-0.5 block" style={{ color: 'var(--color-status-absent)' }}>
                {checkOutStatusStats.notCheckedOutCount}{' '}
                <span className="text-xs font-medium" style={{ color: 'var(--color-status-absent)' }}>
                  ({checkOutStatusStats.notCheckedOutPercentage}%)
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid 2: Daily Trend Chart */}
      {dailyTrend.length > 0 && (
        <div className="p-4 sm:p-5 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#111827] flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-[#F97316]" />
              Tren Presensi Harian
            </span>
            <div className="flex items-center gap-3 text-[10px] font-semibold text-[#6B7280]">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'var(--color-status-present)' }} />
                Tepat Waktu
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'var(--color-status-late)' }} />
                Terlambat
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'var(--color-status-absent)' }} />
                Tidak Presensi
              </span>
            </div>
          </div>

          {/* Daily Bar Chart */}
          <div className="overflow-x-auto pb-2">
            <div className="min-w-[480px] h-36 flex items-end gap-2 pt-4 px-2 border-b border-[#E5E7EB]">
              {dailyTrend.map((pt, idx) => {
                const totalPt = pt.onTime + pt.late + pt.absent;
                const barHeight = Math.max(10, Math.round((totalPt / maxDailyPresent) * 100));

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative">
                    {/* Tooltip */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full mb-2 bg-[#111827] text-white text-[10px] p-2 rounded-lg shadow-lg pointer-events-none z-20 whitespace-nowrap">
                      <p className="font-bold border-b border-gray-700 pb-1">{pt.dateLabel}</p>
                      <p style={{ color: 'var(--color-status-present)' }}>Tepat Waktu: {pt.onTime}</p>
                      <p style={{ color: 'var(--color-status-late)' }}>Terlambat: {pt.late}</p>
                      <p style={{ color: 'var(--color-status-absent)' }}>Tidak Presensi: {pt.absent}</p>
                    </div>

                    {/* Stacked Bar */}
                    <div
                      style={{ height: `${barHeight}%` }}
                      className="w-full max-w-[28px] rounded-t-sm overflow-hidden flex flex-col justify-end bg-gray-100"
                    >
                      {pt.absent > 0 && (
                        <div
                          style={{ flex: pt.absent, backgroundColor: 'var(--color-status-absent)' }}
                          className="w-full transition-all"
                        />
                      )}
                      {pt.late > 0 && (
                        <div
                          style={{ flex: pt.late, backgroundColor: 'var(--color-status-late)' }}
                          className="w-full transition-all"
                        />
                      )}
                      {pt.onTime > 0 && (
                        <div
                          style={{ flex: pt.onTime, backgroundColor: 'var(--color-status-present)' }}
                          className="w-full transition-all"
                        />
                      )}
                    </div>

                    {/* X Label */}
                    <span className="text-[10px] text-[#6B7280] font-medium tracking-tight">
                      {pt.dateLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Grid 3: Department Comparison */}
      {departmentStats.length > 0 && (
        <div className="p-4 sm:p-5 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#111827] flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-[#F97316]" />
              Presensi Berdasarkan Departemen
            </span>
          </div>

          <div className="space-y-3">
            {departmentStats.map((dept) => {
              const totalPt = dept.onTime + dept.late + dept.absent;
              const onTimePct = totalPt > 0 ? Math.round((dept.onTime / totalPt) * 100) : 0;
              const latePct = totalPt > 0 ? Math.round((dept.late / totalPt) * 100) : 0;
              const absentPct = totalPt > 0 ? Math.round((dept.absent / totalPt) * 100) : 0;

              return (
                <div key={dept.departmentId} className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between font-medium">
                    <span className="text-[#111827] font-bold">{dept.departmentName}</span>
                    <span className="text-[#6B7280] text-[11px]">
                      {dept.totalEmployees} Pegawai · {dept.totalAttendance} Presensi
                    </span>
                  </div>

                  {/* Stacked Progress Bar */}
                  <div className="h-2.5 w-full bg-[#E5E7EB] rounded-full overflow-hidden flex">
                    <div
                      style={{ width: `${onTimePct}%`, backgroundColor: 'var(--color-status-present)' }}
                      className="h-full"
                      title={`Tepat Waktu: ${dept.onTime}`}
                    />
                    <div
                      style={{ width: `${latePct}%`, backgroundColor: 'var(--color-status-late)' }}
                      className="h-full"
                      title={`Terlambat: ${dept.late}`}
                    />
                    <div
                      style={{ width: `${absentPct}%`, backgroundColor: 'var(--color-status-absent)' }}
                      className="h-full"
                      title={`Tidak Presensi: ${dept.absent}`}
                    />
                  </div>

                  <div className="flex items-center gap-4 text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>
                    <span className="font-medium" style={{ color: 'var(--color-status-present)' }}>Tepat Waktu: {dept.onTime}</span>
                    <span className="font-medium" style={{ color: 'var(--color-status-late)' }}>Terlambat: {dept.late}</span>
                    <span className="font-medium" style={{ color: 'var(--color-status-absent)' }}>Tidak Presensi: {dept.absent}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
