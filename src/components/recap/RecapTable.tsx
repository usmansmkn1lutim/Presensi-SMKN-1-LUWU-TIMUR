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
    <div className="hidden md:block bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl overflow-hidden shadow-2xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB] text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">
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
          <tbody className="divide-y divide-[#E5E7EB] text-xs text-[#111827]">
            {records.map((row, idx) => (
              <tr key={row.employeeId} className="hover:bg-[#F9FAFB] transition-colors">
                {/* No */}
                <td className="py-3.5 px-3 text-center font-semibold text-[#6B7280]">
                  {idx + 1}
                </td>

                {/* Pegawai */}
                <td className="py-3.5 px-4 font-medium text-[#111827]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#F3F4F6] text-[#6B7280] flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-[#F97316]" />
                    </div>
                    <div>
                      <span className="font-bold block text-[#111827]">
                        {row.fullName}
                      </span>
                      <span className="text-[11px] text-[#6B7280] block">
                        NIP: {row.nip || '-'}
                      </span>
                    </div>
                  </div>
                </td>

                {/* Departemen */}
                <td className="py-3.5 px-4 text-[#6B7280]">
                  <span className="inline-flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-[#9CA3AF]" />
                    {row.departmentName}
                  </span>
                </td>

                {/* Hari Kerja */}
                <td className="py-3.5 px-3 text-center font-bold text-[#111827]">
                  {row.effectiveWorkingDays}
                </td>

                {/* Presensi */}
                <td className="py-3.5 px-3 text-center font-bold text-[#EA580C]">
                  {row.totalAttendance}
                </td>

                {/* Tepat Waktu */}
                <td className="py-3.5 px-3 text-center">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {row.onTimeCount}
                  </span>
                </td>

                {/* Terlambat */}
                <td className="py-3.5 px-3 text-center">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                    {row.lateCount}
                  </span>
                </td>

                {/* Tidak Presensi */}
                <td className="py-3.5 px-3 text-center">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                    {row.absentCount}
                  </span>
                </td>

                {/* Check-out */}
                <td className="py-3.5 px-3 text-center font-semibold text-[#374151]">
                  {row.checkedOutCount}
                </td>

                {/* Aksi */}
                <td className="py-3.5 px-4 text-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onSelectEmployee(row)}
                    className="text-[11px] h-8 px-2.5 rounded-lg border-[#E5E7EB] text-[#374151] hover:text-[#EA580C] hover:border-[#FFEDD5] hover:bg-[#FFF7ED]"
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
