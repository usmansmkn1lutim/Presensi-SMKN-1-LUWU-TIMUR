import * as XLSX from 'xlsx';
import XLSXStyle from 'xlsx-js-style';
import {
  AttendanceReportFilter,
  DailyAttendanceSummary,
  EmployeeAttendanceSummary,
  MonthlyAttendanceSummary,
  AttendanceDetailItem,
  MonthlyRecapReportResponse,
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

  /**
   * Export Monthly Grid Matrix Recap (PHASE 9G-EXPORT / REVISED)
   *
   * Urutan kolom:
   * 1. No | Nama Pegawai | NIP | Status Pegawai | Tanggal 1...N
   * 2. Hadir (total) | Tepat Waktu | Terlambat | Dinas Luar | Sakit | Izin | Cuti | Alfa | Persentase
   */
  exportMonthlyRecapToExcel(data: MonthlyRecapReportResponse, year: number, month: number): boolean {
    if (!data || data.rows.length === 0) {
      throw new Error('Tidak ada data rekap bulanan grid untuk diekspor.');
    }

    const rows = data.rows.map((row, index) => {
      const rowData: any = {
        'No': index + 1,
        'Nama Pegawai': row.employeeName,
        'NIP': row.nip ? String(row.nip) : '-',
        'Status Pegawai': row.employeeType,
      };

      for (let d = 1; d <= data.daysInMonth; d++) {
        rowData[String(d)] = row.dailyStatuses[d]?.code || '—';
      }

      // Calculations:
      // Hadir (total) = H + T + DL = totalPresent + totalOfficialDuty
      // Tepat Waktu = H = Math.max(0, row.totalPresent - row.totalLate)
      // Terlambat = T = row.totalLate
      // Dinas Luar = DL = row.totalOfficialDuty
      // Sakit = S = row.totalSick
      // Izin = I = row.totalPermit
      // Cuti = C = row.totalLeave
      // Alfa = A = row.totalAbsent
      // Persentase = row.attendancePercentageLabel
      const totalHadir = row.totalPresent + row.totalOfficialDuty;
      const totalTepatWaktu = Math.max(0, row.totalPresent - row.totalLate);

      rowData['Hadir (total)'] = totalHadir;
      rowData['Tepat Waktu'] = totalTepatWaktu;
      rowData['Terlambat'] = row.totalLate;
      rowData['Dinas Luar'] = row.totalOfficialDuty;
      rowData['Sakit'] = row.totalSick;
      rowData['Izin'] = row.totalPermit;
      rowData['Cuti'] = row.totalLeave;
      rowData['Alfa'] = row.totalAbsent;
      rowData['Persentase'] = row.attendancePercentageLabel;

      return rowData;
    });

    const headerKeys = [
      'No',
      'Nama Pegawai',
      'NIP',
      'Status Pegawai',
      ...Array.from({ length: data.daysInMonth }, (_, i) => String(i + 1)),
      'Hadir (total)',
      'Tepat Waktu',
      'Terlambat',
      'Dinas Luar',
      'Sakit',
      'Izin',
      'Cuti',
      'Alfa',
      'Persentase',
    ];

    const worksheet = XLSXStyle.utils.json_to_sheet(rows, { header: headerKeys });

    const colWidths = [
      { wch: 6 },  // No
      { wch: 28 }, // Nama Pegawai
      { wch: 20 }, // NIP
      { wch: 16 }, // Status Pegawai
    ];

    for (let d = 1; d <= data.daysInMonth; d++) {
      colWidths.push({ wch: 4 });
    }

    colWidths.push(
      { wch: 14 }, // Hadir (total)
      { wch: 13 }, // Tepat Waktu
      { wch: 11 }, // Terlambat
      { wch: 12 }, // Dinas Luar
      { wch: 8 },  // Sakit
      { wch: 8 },  // Izin
      { wch: 8 },  // Cuti
      { wch: 8 },  // Alfa
      { wch: 13 }  // Persentase
    );

    worksheet['!cols'] = colWidths;

    // 1. Style Header Row (Row 1):
    // - Background: #F97316 (Orange Sunset)
    // - Text: White #FFFFFF, Bold
    // - Alignment: Center (horizontal), Center (vertical)
    // Applies to all columns from No to Persentase
    for (let colIdx = 0; colIdx < headerKeys.length; colIdx++) {
      const colLetter = XLSXStyle.utils.encode_col(colIdx);
      const headerRef = `${colLetter}1`;
      if (worksheet[headerRef]) {
        worksheet[headerRef].s = {
          fill: {
            patternType: 'solid',
            fgColor: { rgb: 'F97316' },
          },
          font: {
            bold: true,
            color: { rgb: 'FFFFFF' },
          },
          alignment: {
            horizontal: 'center',
            vertical: 'center',
          },
        };
      }
    }

    // 2. Identify weekend and holiday days
    const holidayOrWeekendDays = new Set<number>();
    for (let d = 1; d <= data.daysInMonth; d++) {
      const dayOfWeek = new Date(year, month - 1, d, 12, 0, 0).getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isHoliday = isWeekend || data.rows.some((r) => r.dailyStatuses[d]?.code === 'L');
      if (isHoliday) {
        holidayOrWeekendDays.add(d);
      }
    }

    // 3. Style Body Data Cells (Rows 2 to rows.length + 1):
    // - Vertical alignment: Center for ALL cells
    // - Nama Pegawai (colIdx === 1): Left align
    // - All other columns (No, NIP, Status, Tanggal, Summary): Center align
    // - Weekend / Holiday date columns (colIdx = 3 + d, d in holidayOrWeekendDays):
    //   Light Orange fill #FFEDD5 + Center align
    for (let r = 2; r <= rows.length + 1; r++) {
      for (let colIdx = 0; colIdx < headerKeys.length; colIdx++) {
        const colLetter = XLSXStyle.utils.encode_col(colIdx);
        const cellRef = `${colLetter}${r}`;
        if (!worksheet[cellRef]) continue;

        // Check if this cell is a holiday/weekend date cell
        const isDateCol = colIdx >= 4 && colIdx <= 3 + data.daysInMonth;
        const dayNum = isDateCol ? colIdx - 3 : 0;
        const isHolidayOrWeekend = isDateCol && holidayOrWeekendDays.has(dayNum);

        if (isHolidayOrWeekend) {
          worksheet[cellRef].s = {
            fill: {
              patternType: 'solid',
              fgColor: { rgb: 'FFEDD5' },
            },
            alignment: {
              horizontal: 'center',
              vertical: 'center',
            },
          };
        } else if (colIdx === 1) {
          // Nama Pegawai: Left align, Center vertical
          worksheet[cellRef].s = {
            alignment: {
              horizontal: 'left',
              vertical: 'center',
            },
          };
        } else {
          // All other normal cells: Center horizontal, Center vertical
          worksheet[cellRef].s = {
            alignment: {
              horizontal: 'center',
              vertical: 'center',
            },
          };
        }
      }
    }

    const workbook = XLSXStyle.utils.book_new();
    XLSXStyle.utils.book_append_sheet(workbook, worksheet, 'Rekap Bulanan');

    const formattedPeriod = `${year}${String(month).padStart(2, '0')}`;
    XLSXStyle.writeFile(workbook, `Laporan_Matriks_Bulanan_${formattedPeriod}.xlsx`);
    return true;
  },
};
