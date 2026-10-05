import React, { useState } from 'react';
import { Users, Search, ArrowUpDown, Building2 } from 'lucide-react';
import { EmployeeAttendanceSummary } from '../../types/attendanceReport.types';
import { Badge } from '../ui/Badge';

interface EmployeeReportTableProps {
  data: EmployeeAttendanceSummary[];
  isLoading: boolean;
}

export const EmployeeReportTable: React.FC<EmployeeReportTableProps> = ({ data, isLoading }) => {
  const [sortField, setSortField] = useState<keyof EmployeeAttendanceSummary>('attendancePercentage');
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [localSearch, setLocalSearch] = useState<string>('');

  if (isLoading) {
    return (
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-2xs space-y-3">
        <div className="h-6 bg-gray-100 rounded w-48 animate-pulse mb-4" />
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-10 bg-gray-50 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-12 text-center shadow-2xs">
        <div className="w-12 h-12 rounded-2xl bg-gray-50 text-gray-400 flex items-center justify-center mx-auto mb-3">
          <Users className="w-6 h-6" />
        </div>
        <h4 className="text-base font-bold text-[#111827]">Belum Ada Data Rekap Pegawai</h4>
        <p className="text-xs text-[#6B7280] max-w-sm mx-auto mt-1">
          Tidak ditemukan data kehadiran pegawai pada filter yang ditentukan.
        </p>
      </div>
    );
  }

  // Filter local search
  const filtered = data.filter((row) => {
    if (!localSearch.trim()) return true;
    const q = localSearch.toLowerCase().trim();
    const nameMatch = row.employeeName.toLowerCase().includes(q);
    const nipMatch = row.nip ? row.nip.toLowerCase().includes(q) : false;
    const deptMatch = row.departmentName.toLowerCase().includes(q);
    return nameMatch || nipMatch || deptMatch;
  });

  // Sort rows
  const sorted = [...filtered].sort((a, b) => {
    const valA = a[sortField];
    const valB = b[sortField];

    if (typeof valA === 'number' && typeof valB === 'number') {
      return sortAsc ? valA - valB : valB - valA;
    }
    if (typeof valA === 'string' && typeof valB === 'string') {
      return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    return 0;
  });

  const handleToggleSort = (field: keyof EmployeeAttendanceSummary) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false); // default desc for numbers
    }
  };

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-2xs overflow-hidden">
      {/* Table Header and Search */}
      <div className="p-4 sm:p-5 border-b border-[#F3F4F6] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-[#111827] flex items-center gap-2">
            <Users className="w-4 h-4 text-[#F97316]" />
            Rekap Kehadiran Per Pegawai
          </h3>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Akumulasi kehadiran, keterlambatan, dan persentase kehadiran per pegawai
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-60">
            <Search className="w-3.5 h-3.5 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari pegawai di tabel..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl pl-8 pr-3 py-1.5 text-xs text-[#111827] focus:outline-none focus:ring-1 focus:ring-[#F97316]"
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-[#F9FAFB] text-[#4B5563] border-b border-[#E5E7EB] font-semibold text-[11px] uppercase tracking-wider">
              <th className="py-3 px-4">Pegawai</th>
              <th className="py-3 px-3">Departemen</th>
              <th className="py-3 px-3 text-center">Hari Kerja</th>
              <th
                className="py-3 px-3 text-center cursor-pointer hover:text-[#111827]"
                onClick={() => handleToggleSort('totalAttendance')}
              >
                <div className="inline-flex items-center gap-1">
                  <span>Hadir</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-3 text-center">Tepat Waktu</th>
              <th
                className="py-3 px-3 text-center cursor-pointer hover:text-[#111827]"
                onClick={() => handleToggleSort('totalLate')}
              >
                <div className="inline-flex items-center gap-1">
                  <span>Terlambat</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-3 text-center">Check-out</th>
              <th className="py-3 px-3 text-center">Belum Pulang</th>
              <th className="py-3 px-3 text-center">Tidak Hadir</th>
              <th
                className="py-3 px-4 text-center cursor-pointer hover:text-[#111827]"
                onClick={() => handleToggleSort('attendancePercentage')}
              >
                <div className="inline-flex items-center gap-1">
                  <span>Persentase</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F3F4F6]">
            {sorted.map((row) => {
              const isHistorical = row.employeeName.includes('(Arsip)');
              const perc = row.attendancePercentage;

              let percColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
              if (perc < 75) percColor = 'text-red-700 bg-red-50 border-red-200';
              else if (perc < 90) percColor = 'text-amber-700 bg-amber-50 border-amber-200';

              return (
                <tr key={row.employeeId} className="hover:bg-[#F9FAFB]/70 transition-colors">
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#FFF7ED] text-[#EA580C] font-bold text-xs flex items-center justify-center shrink-0">
                        {row.employeeName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-[#111827] flex items-center gap-1.5">
                          <span>{row.employeeName}</span>
                          {isHistorical && (
                            <Badge variant="warning" size="sm">
                              Arsip
                            </Badge>
                          )}
                        </div>
                        <div className="text-[11px] text-[#6B7280]">
                          {row.nip ? `NIP: ${row.nip}` : 'NIP: -'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap text-[#4B5563]">
                    <div className="flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-[#9CA3AF]" />
                      <span>{row.departmentName}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-center text-[#6B7280] font-medium">
                    {row.totalWorkDays} hr
                  </td>
                  <td className="py-3 px-3 text-center font-bold text-blue-600">
                    {row.totalAttendance}
                  </td>
                  <td className="py-3 px-3 text-center font-semibold text-emerald-600">
                    {row.totalOnTime}
                  </td>
                  <td className="py-3 px-3 text-center font-semibold text-amber-600">
                    {row.totalLate}
                  </td>
                  <td className="py-3 px-3 text-center font-semibold text-purple-600">
                    {row.totalCheckedOut}
                  </td>
                  <td className="py-3 px-3 text-center font-semibold text-rose-600">
                    {row.totalNotCheckedOut}
                  </td>
                  <td className="py-3 px-3 text-center text-[#6B7280]">
                    {row.totalAbsent > 0 ? (
                      <span className="font-semibold text-rose-500">{row.totalAbsent}</span>
                    ) : (
                      <span className="text-emerald-600 font-semibold">0</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${percColor}`}
                    >
                      {perc}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="p-3 bg-[#F9FAFB] border-t border-[#E5E7EB] text-[11px] text-[#6B7280] flex items-center justify-between">
        <span>Menampilkan {sorted.length} dari total {data.length} pegawai</span>
        <span>Hari kerja efektif mengecualikan Sabtu, Minggu, & Hari Libur</span>
      </div>
    </div>
  );
};
