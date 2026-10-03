import React, { useState, useEffect } from 'react';
import { Eye, AlertCircle, Users, RefreshCw, Info } from 'lucide-react';
import { attendanceMonitoringService } from '../../services/attendanceMonitoringService';
import {
  DepartmentOption,
  MonitoringRecord,
  MonitoringSummary,
} from '../../types/attendanceMonitoring.types';

import { MonitoringSummaryCards } from '../../components/monitoring/MonitoringSummaryCards';
import { MonitoringFilterBar } from '../../components/monitoring/MonitoringFilterBar';
import { MonitoringTable } from '../../components/monitoring/MonitoringTable';
import { MonitoringMobileList } from '../../components/monitoring/MonitoringMobileList';
import { Button } from '../../components/ui/Button';

export const AttendanceMonitoringPage: React.FC = () => {
  const getTodayString = () => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  };

  const [date, setDate] = useState<string>(getTodayString());
  const [departmentId, setDepartmentId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorState, setErrorState] = useState<string | null>(null);

  const [records, setRecords] = useState<MonitoringRecord[]>([]);
  const [summary, setSummary] = useState<MonitoringSummary | null>(null);

  // Load departments once
  useEffect(() => {
    const loadDepts = async () => {
      const depts = await attendanceMonitoringService.getDepartments();
      setDepartments(depts);
    };
    loadDepts();
  }, []);

  const loadMonitoringData = async () => {
    setLoading(true);
    setErrorState(null);

    try {
      const res = await attendanceMonitoringService.getAttendanceMonitoring({
        date,
        departmentId,
        statusFilter: statusFilter as any,
        searchQuery,
      });

      setRecords(res.records);
      setSummary(res.summary);
    } catch (err: any) {
      console.error('Failed to load attendance monitoring data:', err);
      setErrorState('Data presensi belum dapat dimuat. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMonitoringData();
  }, [date, departmentId, statusFilter, searchQuery]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      {/* Header Banner */}
      <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-5 sm:p-6 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF] flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-[#F97316]" />
            Pengawasan Kehadiran Realtime
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-[#111827] mt-0.5">
            Monitoring Presensi
          </h2>
          <p className="text-xs sm:text-sm text-[#6B7280] mt-1">
            Pantau status kehadiran seluruh pegawai aktif secara realtime
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadMonitoringData}
          disabled={loading}
          className="text-xs self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          Segarkan
        </Button>
      </div>

      {/* Summary Cards */}
      <MonitoringSummaryCards summary={summary} loading={loading} />

      {/* Filter & Search Bar */}
      <MonitoringFilterBar
        date={date}
        departmentId={departmentId}
        statusFilter={statusFilter}
        searchQuery={searchQuery}
        departments={departments}
        loading={loading}
        onChangeDate={setDate}
        onChangeDepartment={setDepartmentId}
        onChangeStatus={setStatusFilter}
        onChangeSearch={setSearchQuery}
        onRefresh={loadMonitoringData}
      />

      {/* Error State */}
      {errorState && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-amber-800 space-y-3">
          <div className="flex items-center gap-2 font-bold text-sm">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <span>Gagal Memuat Data Monitoring</span>
          </div>
          <p className="text-xs leading-relaxed">{errorState}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={loadMonitoringData}
            className="mt-2 text-xs"
          >
            Coba Lagi
          </Button>
        </div>
      )}

      {/* Loading Skeleton / Records Content */}
      {loading ? (
        <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-6 shadow-2xs space-y-4 animate-pulse">
          <div className="h-4 bg-[#F3F4F6] rounded w-1/4" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-12 bg-[#F3F4F6] rounded-xl" />
            ))}
          </div>
        </div>
      ) : !errorState && records.length === 0 ? (
        /* Empty State */
        <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-10 text-center shadow-2xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#F3F4F6] text-[#9CA3AF] flex items-center justify-center mx-auto">
            <Users className="w-6 h-6 text-[#9CA3AF]" />
          </div>
          <h4 className="text-base font-bold text-[#111827]">Tidak Ada Data Presensi</h4>
          <p className="text-xs text-[#6B7280] max-w-sm mx-auto">
            Tidak ditemukan pegawai yang sesuai dengan filter atau kata kunci pencarian pada tanggal ini.
          </p>
        </div>
      ) : !errorState ? (
        /* Records Content */
        <div className="space-y-4">
          <MonitoringTable records={records} />
          <MonitoringMobileList records={records} />

          <div className="text-xs text-[#6B7280] text-right font-medium pr-1">
            Menampilkan <strong className="text-[#111827]">{records.length}</strong> pegawai
          </div>
        </div>
      ) : null}

      {/* Information Footer */}
      <div className="p-4 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] flex items-start gap-3 text-xs text-[#6B7280]">
        <Info className="w-4 h-4 text-[#F97316] shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-[#111827]">Monitoring Hak Baca (Read-Only):</span> Halaman
          monitoring ini diperuntukkan khusus pimpinan dan administrator untuk pemantauan kehadiran
          sekolah.
        </div>
      </div>
    </div>
  );
};
