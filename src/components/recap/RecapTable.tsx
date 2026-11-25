import React from 'react';
import { EmployeeRecapRecord } from '../../types/attendanceRecap.types';
import { User, Building2, Eye } from 'lucide-react';
import { Button } from '../ui/Button';

interface RecapTableProps {
  records: EmployeeRecapRecord[];
  onSelectEmployee: (record: EmployeeRecapRecord) => void;
}

export const RecapTable: React.FC<RecapTableProps> = ({
  records,
  onSelectEmployee,
}) => {
  return (
    <div className="hidden md:block bg-[#FFFFFF] dark:bg-[#262626] border border-[#E5E7EB] dark:border-[#404040] rounded-2xl overflow-hidden shadow-2xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#F9FAFB] dark:bg-[#303030] border-b border-[#E5E7EB] dark:border-[#404040] text-[11px] font-bold text-[#6B7280] dark:text-[#A3A3A3] uppercase tracking-wider">
              <th className="py-3.5 px-3 text-center w-10">No</th>
              <th className="py-3.5 px-4">Pegawai</th>
              <th className="py-3.5 px-4">Departemen</th>
              <th className="py-3.5 px-3 text-center">Hari Kerja</th>
              <th className="py-3.5 px-3 text-center">Presensi</th>
              <th className="py-3.5 px-3 text-center">Tepat Waktu</th>
              <th className="py-3.5 px-3 text-center">Terlambat</th>
              <th className="py-3.5 px-3 text-center">Tidak Presensi</th>
              <th className="py-3.5 px-3 text-center">Check-out</th>
              <th className="py-3.5 px-4 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#404040] text-xs text-[#111827] dark:text-[#F9FAFB]">
            {records.map((row, idx) => (
              <tr key={row.employeeId} className="hover:bg-[#F9FAFB] dark:hover:bg-[#303030]/50 transition-colors">
                {/* No */}
                <td className="py-3.5 px-3 text-center font-semibold text-[#6B7280] dark:text-[#A3A3A3]">
                  {idx + 1}
                </td>

                {/* Pegawai */}
                <td className="py-3.5 px-4 font-medium text-[#111827] dark:text-[#F9FAFB]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#F3F4F6] dark:bg-[#303030] text-[#6B7280] dark:text-[#A3A3A3] flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-[#F97316]" />
                    </div>
                    <div>
                      <span className="font-bold block text-[#111827] dark:text-[#F9FAFB]">
                        {row.fullName}
                      </span>
                      <span className="text-[11px] text-[#6B7280] dark:text-[#A3A3A3] block">
                        NIP: {row.nip || '-'}
                      </span>
                    </div>
                  </div>
                </td>

                {/* Departemen */}
                <td className="py-3.5 px-4 text-[#6B7280] dark:text-[#A3A3A3]">
                  <span className="inline-flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-[#9CA3AF] dark:text-[#A3A3A3]" />
                    {row.departmentName}
                  </span>
                </td>

                {/* Hari Kerja */}
                <td className="py-3.5 px-3 text-center font-bold text-[#111827] dark:text-[#F9FAFB]">
                  {row.effectiveWorkingDays}
                </td>

                {/* Presensi */}
                <td className="py-3.5 px-3 text-center font-bold text-[#EA580C] dark:text-[#F97316]">
                  {row.totalAttendance}
                </td>

                {/* Tepat Waktu */}
                <td className="py-3.5 px-3 text-center">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold dark:!bg-emerald-950/40 dark:!text-emerald-300 dark:!border-emerald-800/50" style={{ backgroundColor: 'var(--color-status-present-bg)', color: 'var(--color-status-present)', border: '1px solid var(--color-status-present-bg)' }}>
                    {row.onTimeCount}
                  </span>
                </td>

                {/* Terlambat */}
                <td className="py-3.5 px-3 text-center">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold dark:!bg-amber-950/40 dark:!text-amber-300 dark:!border-amber-800/50" style={{ backgroundColor: 'var(--color-status-late-bg)', color: 'var(--color-status-late)', border: '1px solid var(--color-status-late-bg)' }}>
                    {row.lateCount}
                  </span>
                </td>

                {/* Tidak Presensi */}
                <td className="py-3.5 px-3 text-center">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold dark:!bg-rose-950/40 dark:!text-rose-300 dark:!border-rose-800/50" style={{ backgroundColor: 'var(--color-status-absent-bg)', color: 'var(--color-status-absent)', border: '1px solid var(--color-status-absent-bg)' }}>
                    {row.absentCount}
                  </span>
                </td>

                {/* Check-out */}
                <td className="py-3.5 px-3 text-center font-semibold text-[#374151] dark:text-[#D4D4D4]">
                  {row.checkedOutCount}
                </td>

                {/* Aksi */}
                <td className="py-3.5 px-4 text-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onSelectEmployee(row)}
                    className="text-[11px] h-8 px-2.5 rounded-lg border-[#E5E7EB] dark:border-[#404040] text-[#374151] dark:text-[#D4D4D4] hover:text-[#EA580C] dark:hover:text-[#FDBA74] hover:border-[#FFEDD5] dark:hover:border-[#9A3412]/60 hover:bg-[#FFF7ED] dark:hover:bg-[#431F0B]"
                  >
                    <Eye className="w-3.5 h-3.5 mr-1" />
                    Lihat Detail
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
