import * as XLSX from 'xlsx';
import {
  AttendanceReportFilter,
  DailyAttendanceSummary,
  EmployeeAttendanceSummary,
  MonthlyAttendanceSummary,
  AttendanceDetailItem,
} from '../types/attendanceReport.types';
import { formatMakassarShortDate } from './attendanceReportService';

/**
 * Attendance Excel Export Service (PHASE 9D)
 *
 * Client-side XLSX generation for school attendance reports.
 * Respects active filters, Asia/Makassar timezone, and active tab.
 */
export const attendanceExcelExportService = {
  /**
   * Generates filename based on tab type and date filter
   */
  getFilename(tab: 'daily' | 'employee' | 'monthly' | 'detail', filter: AttendanceReportFilter): string {
    const start = filter.startDate.replace(/-/g, '');
    const end = filter.endDate.replace(/-/g, '');
    const suffix = `${start}_${end}`;

    switch (tab) {
      case 'daily':
        return `Laporan_Presensi_Harian_${suffix}.xlsx`;
      case 'employee':
        return `Laporan_Presensi_Pegawai_${suffix}.xlsx`;
      case 'monthly':
        return `Laporan_Presensi_Bulanan_${suffix}.xlsx`;
      case 'detail':
        return `Laporan_Presensi_Detail_${suffix}.xlsx`;
      default:
        return `Laporan_Presensi_${suffix}.xlsx`;
    }
  },

  /**
   * Export Daily Summary
   */
  exportDailySummary(data: DailyAttendanceSummary[], filter: AttendanceReportFilter): boolean {
    if (!data || data.length === 0) {
      throw new Error('Tidak ada data rekap harian untuk diekspor berdasarkan filter yang dipilih.');
    }

    const rows = data.map((row) => {
      const [y, m, d] = row.attendanceDate.split('-').map(Number);
      const dayOfWeek = new Date(y, m - 1, d, 12, 0, 0).getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      return {
        'Tanggal': row.dateLabel,
        'Hari': row.dayName,
        'Status Hari': isWeekend ? 'Akhir Pekan' : 'Hari Kerja',
        'Total Hadir': row.totalPresent,
        'Tepat Waktu': row.totalOnTime,
        'Terlambat': row.totalLate,
        'Sudah Check-out': row.totalCheckedOut,
        'Belum Check-out': row.totalNotCheckedOut,
        'Tidak Hadir': isWeekend ? 'Libur' : row.totalAbsent,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);

    // Auto-fit column widths
    const colWidths = [
      { wch: 15 }, // Tanggal
      { wch: 12 }, // Hari
      { wch: 14 }, // Status Hari
      { wch: 12 }, // Hadir
      { wch: 14 }, // Tepat Waktu
      { wch: 12 }, // Terlambat
      { wch: 16 }, // Sudah Check-out
      { wch: 16 }, // Belum Check-out
      { wch: 14 }, // Tidak Hadir
    ];
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Harian');

    const filename = this.getFilename('daily', filter);
    XLSX.writeFile(workbook, filename);
    return true;
  },

  /**
   * Export Employee Summary
   */
  exportEmployeeSummary(data: EmployeeAttendanceSummary[], filter: AttendanceReportFilter): boolean {
    if (!data || data.length === 0) {
      throw new Error('Tidak ada data rekap pegawai untuk diekspor berdasarkan filter yang dipilih.');
    }

    const rows = data.map((row) => {
      const isHistorical = row.employeeName.includes('(Arsip)');

      return {
        'Nama Pegawai': row.employeeName,
        'NIP': row.nip || '-',
        'Departemen / Unit': row.departmentName,
        'Status Pegawai': isHistorical ? 'Arsip' : 'Aktif',
        'Hari Kerja Efektif': `${row.totalWorkDays} Hari`,
        'Total Hadir': row.totalAttendance,
        'Tepat Waktu': row.totalOnTime,
        'Terlambat': row.totalLate,
        'Sudah Check-out': row.totalCheckedOut,
        'Belum Check-out': row.totalNotCheckedOut,
        'Tidak Hadir': row.totalAbsent,
        'Persentase Kehadiran': `${row.attendancePercentage}%`,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);

    const colWidths = [
      { wch: 26 }, // Nama
      { wch: 18 }, // NIP
      { wch: 22 }, // Dept
      { wch: 15 }, // Status
      { wch: 18 }, // Hari Kerja
      { wch: 12 }, // Hadir
      { wch: 14 }, // Tepat Waktu
      { wch: 12 }, // Terlambat
      { wch: 16 }, // Checkout
      { wch: 16 }, // Belum checkout
      { wch: 12 }, // Tidak hadir
      { wch: 20 }, // Persentase
    ];
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Pegawai');

    const filename = this.getFilename('employee', filter);
    XLSX.writeFile(workbook, filename);
    return true;
  },

  /**
   * Export Monthly Summary
   */
  exportMonthlySummary(data: MonthlyAttendanceSummary[], filter: AttendanceReportFilter): boolean {
    if (!data || data.length === 0) {
      throw new Error('Tidak ada data rekap bulanan untuk diekspor berdasarkan filter yang dipilih.');
    }

    const rows = data.map((row) => ({
      'Bulan': row.monthLabel,
      'Hari Kerja Efektif': `${row.effectiveWorkingDays} Hari`,
      'Total Hadir': row.totalAttendance,
      'Tepat Waktu': row.totalOnTime,
      'Terlambat': row.totalLate,
      'Sudah Check-out': row.totalCheckedOut,
      'Belum Check-out': row.totalNotCheckedOut,
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);

    const colWidths = [
      { wch: 20 }, // Bulan
      { wch: 20 }, // Hari Kerja
      { wch: 14 }, // Hadir
      { wch: 14 }, // Tepat Waktu
      { wch: 12 }, // Terlambat
      { wch: 18 }, // Checkout
      { wch: 18 }, // Belum checkout
    ];
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Bulanan');

    const filename = this.getFilename('monthly', filter);
    XLSX.writeFile(workbook, filename);
    return true;
  },

  /**
   * Export Unpaginated Full Attendance Details
   */
  exportAttendanceDetails(records: AttendanceDetailItem[], filter: AttendanceReportFilter): boolean {
    if (!records || records.length === 0) {
      throw new Error('Tidak ada data detail presensi untuk diekspor berdasarkan filter yang dipilih.');
    }

    const rows = records.map((row) => ({
      'Tanggal': row.attendanceDate,
      'Nama Pegawai': row.employeeName,
      'NIP': row.nip || '-',
      'Departemen': row.departmentName,
      'Jam Masuk (WITA)': row.checkInTimeFormatted !== '-' ? `${row.checkInTimeFormatted} WITA` : '-',
      'Status Masuk': row.checkInStatusLabel,
      'Lokasi Masuk': row.checkInLocation || '-',
      'Jam Pulang (WITA)': row.checkOutAt ? `${row.checkOutTimeFormatted} WITA` : '-',
      'Status Pulang': row.checkOutStatusLabel,
      'Lokasi Pulang': row.checkOutLocation || '-',
      'Catatan': row.notes || '-',
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);

    const colWidths = [
      { wch: 14 }, // Tanggal
      { wch: 26 }, // Nama
      { wch: 18 }, // NIP
      { wch: 20 }, // Dept
      { wch: 18 }, // Jam Masuk
      { wch: 15 }, // Status Masuk
      { wch: 22 }, // Lokasi Masuk
      { wch: 18 }, // Jam Pulang
      { wch: 16 }, // Status Pulang
      { wch: 22 }, // Lokasi Pulang
      { wch: 25 }, // Catatan
    ];
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Detail Presensi');

    const filename = this.getFilename('detail', filter);
    XLSX.writeFile(workbook, filename);
    return true;
  },
};
