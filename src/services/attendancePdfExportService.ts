import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  AttendanceReportFilter,
  DailyAttendanceSummary,
  EmployeeAttendanceSummary,
  MonthlyAttendanceSummary,
  AttendanceDetailItem,
} from '../types/attendanceReport.types';
import { formatMakassarShortDate } from './attendanceReportService';

/**
 * Attendance PDF Export Service (PHASE 9D)
 *
 * Client-side PDF generation formatted for school administration.
 * Strictly respects active filters, Asia/Makassar timezone, and active tab.
 */
export const attendancePdfExportService = {
  /**
   * Helper to format current WITA print timestamp
   */
  getPrintTimestamp(): string {
    try {
      const now = new Date();
      const datePart = new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Makassar',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }).format(now);

      const timePart = new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Makassar',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(now);

      return `${datePart}, ${timePart} WITA`;
    } catch {
      return new Date().toLocaleString('id-ID');
    }
  },

  /**
   * Generates PDF Header block
   */
  drawPdfHeader(
    doc: jsPDF,
    title: string,
    filter: AttendanceReportFilter,
    filterLabels?: { employee?: string; department?: string; location?: string }
  ): number {
    const pageWidth = doc.internal.pageSize.width;

    // Main School Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(17, 24, 39); // #111827
    doc.text('PRESENSI PEGAWAI SEKOLAH', pageWidth / 2, 14, { align: 'center' });

    doc.setFontSize(11);
    doc.setTextColor(249, 115, 22); // #F97316
    doc.text('REKAP DAN LAPORAN PRESENSI', pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(55, 65, 81); // #374151
    doc.text(title.toUpperCase(), pageWidth / 2, 26, { align: 'center' });

    // Divider Line
    doc.setDrawColor(229, 231, 235); // #E5E7EB
    doc.setLineWidth(0.5);
    doc.line(14, 29, pageWidth - 14, 29);

    // Filter Metadata Subheader
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128); // #6B7280

    const periStr = `Periode: ${formatMakassarShortDate(filter.startDate)} - ${formatMakassarShortDate(filter.endDate)}`;
    const empStr = `Pegawai: ${filterLabels?.employee || 'Semua'}`;
    const deptStr = `Departemen: ${filterLabels?.department || 'Semua'}`;
    const locStr = `Lokasi: ${filterLabels?.location || 'Semua'}`;
    const inStatusStr = `Status Masuk: ${filter.checkInStatus === 'on_time' ? 'Tepat Waktu' : filter.checkInStatus === 'late' ? 'Terlambat' : 'Semua'}`;
    const outStatusStr = `Status Pulang: ${filter.checkOutStatus === 'operational' ? 'Jam Operasional' : filter.checkOutStatus === 'after_work' ? 'Jam Pulang' : 'Semua'}`;

    doc.text(periStr, 14, 34);
    doc.text(empStr, 14, 38);
    doc.text(deptStr, 120, 34);
    doc.text(locStr, 120, 38);
    doc.text(inStatusStr, pageWidth - 14, 34, { align: 'right' });
    doc.text(outStatusStr, pageWidth - 14, 38, { align: 'right' });

    return 43; // Y coordinate after header
  },

  /**
   * Helper to attach page numbering footer
   */
  attachFooter(doc: jsPDF, printTimestamp: string): void {
    const totalPages = (doc as any).internal.getNumberOfPages();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(156, 163, 175); // #9CA3AF

      doc.text(`Dicetak pada: ${printTimestamp}`, 14, pageHeight - 8);
      doc.text(`Halaman ${i} dari ${totalPages}`, pageWidth - 14, pageHeight - 8, {
        align: 'right',
      });
    }
  },

  /**
   * Export Daily Summary PDF
   */
  exportDailySummary(
    data: DailyAttendanceSummary[],
    filter: AttendanceReportFilter,
    filterLabels?: { employee?: string; department?: string; location?: string }
  ): boolean {
    if (!data || data.length === 0) {
      throw new Error('Tidak ada data rekap harian untuk diekspor berdasarkan filter yang dipilih.');
    }

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const startY = this.drawPdfHeader(doc, 'Rekap Kehadiran Harian', filter, filterLabels);

    const head = [
      ['Tanggal', 'Hari', 'Status Hari', 'Hadir', 'Tepat Waktu', 'Terlambat', 'Sudah Check-out', 'Belum Check-out', 'Tidak Hadir'],
    ];

    const body = data.map((row) => {
      const [y, m, d] = row.attendanceDate.split('-').map(Number);
      const dayOfWeek = new Date(y, m - 1, d, 12, 0, 0).getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      return [
        row.dateLabel,
        row.dayName,
        isWeekend ? 'Akhir Pekan' : 'Hari Kerja',
        row.totalPresent,
        row.totalOnTime,
        row.totalLate,
        row.totalCheckedOut,
        row.totalNotCheckedOut,
        isWeekend ? 'Libur' : row.totalAbsent,
      ];
    });

    autoTable(doc, {
      startY,
      head,
      body,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [249, 115, 22], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 32 },
        3: { halign: 'center' },
        4: { halign: 'center' },
        5: { halign: 'center' },
        6: { halign: 'center' },
        7: { halign: 'center' },
        8: { halign: 'center' },
      },
    });

    const printTs = this.getPrintTimestamp();
    this.attachFooter(doc, printTs);

    doc.save(`Laporan_Presensi_Harian_${filter.startDate}_${filter.endDate}.pdf`);
    return true;
  },

  /**
   * Export Employee Summary PDF
   */
  exportEmployeeSummary(
    data: EmployeeAttendanceSummary[],
    filter: AttendanceReportFilter,
    filterLabels?: { employee?: string; department?: string; location?: string }
  ): boolean {
    if (!data || data.length === 0) {
      throw new Error('Tidak ada data rekap pegawai untuk diekspor berdasarkan filter yang dipilih.');
    }

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const startY = this.drawPdfHeader(doc, 'Rekap Kehadiran Per Pegawai', filter, filterLabels);

    const head = [
      ['Nama Pegawai', 'NIP', 'Departemen', 'Status', 'Hari Kerja', 'Hadir', 'Tepat Waktu', 'Terlambat', 'Check-out', 'Belum Pulang', 'Tidak Hadir', 'Persentase'],
    ];

    const body = data.map((row) => {
      const isHistorical = row.employeeName.includes('(Arsip)');
      return [
        row.employeeName,
        row.nip || '-',
        row.departmentName,
        isHistorical ? 'Arsip' : 'Aktif',
        `${row.totalWorkDays} Hari`,
        row.totalAttendance,
        row.totalOnTime,
        row.totalLate,
        row.totalCheckedOut,
        row.totalNotCheckedOut,
        row.totalAbsent,
        `${row.attendancePercentage}%`,
      ];
    });

    autoTable(doc, {
      startY,
      head,
      body,
      theme: 'grid',
      styles: { fontSize: 7.5, cellPadding: 2 },
      headStyles: { fillColor: [249, 115, 22], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 45 },
        5: { halign: 'center' },
        6: { halign: 'center' },
        7: { halign: 'center' },
        8: { halign: 'center' },
        9: { halign: 'center' },
        10: { halign: 'center' },
        11: { halign: 'center', fontStyle: 'bold' },
      },
    });

    const printTs = this.getPrintTimestamp();
    this.attachFooter(doc, printTs);

    doc.save(`Laporan_Presensi_Pegawai_${filter.startDate}_${filter.endDate}.pdf`);
    return true;
  },

  /**
   * Export Monthly Summary PDF
   */
  exportMonthlySummary(
    data: MonthlyAttendanceSummary[],
    filter: AttendanceReportFilter,
    filterLabels?: { employee?: string; department?: string; location?: string }
  ): boolean {
    if (!data || data.length === 0) {
      throw new Error('Tidak ada data rekap bulanan untuk diekspor berdasarkan filter yang dipilih.');
    }

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const startY = this.drawPdfHeader(doc, 'Rekap Kehadiran Bulanan', filter, filterLabels);

    const head = [
      ['Bulan', 'Hari Kerja Efektif', 'Total Hadir', 'Tepat Waktu', 'Terlambat', 'Sudah Check-out', 'Belum Check-out'],
    ];

    const body = data.map((row) => [
      row.monthLabel,
      `${row.effectiveWorkingDays} Hari`,
      row.totalAttendance,
      row.totalOnTime,
      row.totalLate,
      row.totalCheckedOut,
      row.totalNotCheckedOut,
    ]);

    autoTable(doc, {
      startY,
      head,
      body,
      theme: 'grid',
      styles: { fontSize: 8.5, cellPadding: 3 },
      headStyles: { fillColor: [249, 115, 22], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      columnStyles: {
        0: { fontStyle: 'bold' },
        2: { halign: 'center' },
        3: { halign: 'center' },
        4: { halign: 'center' },
        5: { halign: 'center' },
        6: { halign: 'center' },
      },
    });

    const printTs = this.getPrintTimestamp();
    this.attachFooter(doc, printTs);

    doc.save(`Laporan_Presensi_Bulanan_${filter.startDate}_${filter.endDate}.pdf`);
    return true;
  },

  /**
   * Export Unpaginated Full Attendance Details PDF
   */
  exportAttendanceDetails(
    records: AttendanceDetailItem[],
    filter: AttendanceReportFilter,
    filterLabels?: { employee?: string; department?: string; location?: string }
  ): boolean {
    if (!records || records.length === 0) {
      throw new Error('Tidak ada data detail presensi untuk diekspor berdasarkan filter yang dipilih.');
    }

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const startY = this.drawPdfHeader(doc, 'Detail Rincian Presensi', filter, filterLabels);

    const head = [
      ['Tanggal', 'Nama Pegawai', 'NIP', 'Departemen', 'Jam Masuk', 'Status', 'Lokasi Masuk', 'Jam Pulang', 'Status', 'Lokasi Pulang', 'Catatan'],
    ];

    const body = records.map((row) => [
      row.attendanceDate,
      row.employeeName,
      row.nip || '-',
      row.departmentName,
      row.checkInTimeFormatted !== '-' ? `${row.checkInTimeFormatted} WITA` : '-',
      row.checkInStatusLabel,
      row.checkInLocation || '-',
      row.checkOutAt ? `${row.checkOutTimeFormatted} WITA` : '-',
      row.checkOutStatusLabel,
      row.checkOutLocation || '-',
      row.notes || '-',
    ]);

    autoTable(doc, {
      startY,
      head,
      body,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [249, 115, 22], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { fontStyle: 'bold', cellWidth: 35 },
        2: { cellWidth: 22 },
        3: { cellWidth: 24 },
        4: { cellWidth: 22 },
        5: { cellWidth: 20 },
        7: { cellWidth: 22 },
        8: { cellWidth: 22 },
      },
    });

    const printTs = this.getPrintTimestamp();
    this.attachFooter(doc, printTs);

    doc.save(`Laporan_Presensi_Detail_${filter.startDate}_${filter.endDate}.pdf`);
    return true;
  },
};
