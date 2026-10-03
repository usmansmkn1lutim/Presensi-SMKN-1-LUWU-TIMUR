import React from 'react';
import { EmployeeRecapRecord } from '../../types/attendanceRecap.types';
import { User, Eye } from 'lucide-react';
import { Button } from '../ui/Button';

interface RecapMobileListProps {
  records: EmployeeRecapRecord[];
  onSelectEmployee: (record: EmployeeRecapRecord) => void;
}

export const RecapMobileList: React.FC<RecapMobileListProps> = ({
  records,
  onSelectEmployee,
}) => {
  return (
    <div className="md:hidden space-y-3">
      {records.map((row) => (
        <div
          key={row.employeeId}
          className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-4 shadow-2xs space-y-3"
        >
          {/* Header Info */}
          <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-[#E5E7EB]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#F3F4F6] text-[#6B7280] flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-[#F97316]" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#111827]">{row.fullName}</h4>
                <p className="text-[11px] text-[#6B7280]">
                  NIP: {row.nip || '-'} · {row.departmentName}
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onSelectEmployee(row)}
              className="text-[11px] h-7 px-2 rounded-lg shrink-0"
            >
              <Eye className="w-3 h-3 mr-1 text-[#F97316]" />
              Detail
            </Button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB]">
              <span className="text-[10px] text-[#6B7280] block font-medium">
                Hari Kerja
              </span>
              <span className="text-sm font-bold text-[#111827]">
                {row.effectiveWorkingDays}
              </span>
            </div>

            <div className="p-2 rounded-xl bg-[#FFF7ED] border border-[#FFEDD5]">
              <span className="text-[10px] text-[#EA580C] block font-semibold">
                Presensi
              </span>
              <span className="text-sm font-bold text-[#EA580C]">
                {row.totalAttendance}
              </span>
            </div>

            <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200">
              <span className="text-[10px] text-emerald-700 block font-semibold">
                Tepat Waktu
              </span>
              <span className="text-sm font-bold text-emerald-700">
                {row.onTimeCount}
              </span>
            </div>

            <div className="p-2 rounded-xl bg-amber-50 border border-amber-200">
              <span className="text-[10px] text-amber-800 block font-semibold">
                Terlambat
              </span>
              <span className="text-sm font-bold text-amber-800">
                {row.lateCount}
              </span>
            </div>

            <div className="p-2 rounded-xl bg-rose-50 border border-rose-200">
              <span className="text-[10px] text-rose-700 block font-semibold">
                Tidak Presensi
              </span>
              <span className="text-sm font-bold text-rose-700">
                {row.absentCount}
              </span>
            </div>

            <div className="p-2 rounded-xl bg-blue-50 border border-blue-200">
              <span className="text-[10px] text-blue-700 block font-semibold">
                Check-out
              </span>
              <span className="text-sm font-bold text-blue-700">
                {row.checkedOutCount}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
