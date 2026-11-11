import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  AttendanceReportFilter,
  DailyAttendanceSummary,
  EmployeeAttendanceSummary,
  MonthlyAttendanceSummary,
  AttendanceDetailItem,
  MonthlyRecapReportResponse,
} from '../types/attendanceReport.types';
import { formatMakassarShortDate } from './attendanceReportService';
import { systemSettingsService } from './systemSettingsService';

/**
 * Helper to safely convert an image URL to a Base64 data string with timeout and error protection.
 * Supports CORS blob fetch and Canvas fallback. Safely guards against non-browser test environments.
 */
async function loadImageAsBase64(
  url: string,
  timeoutMs = 3500
): Promise<{ dataUrl: string; width: number; height: number } | null> {
  if (!url) return null;
  if (typeof window === 'undefined' || typeof document === 'undefined') return null;

  return new Promise((resolve) => {
    let resolved = false;
    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve(null);
      }
    }, timeoutMs);

    // If already data URL
    if (url.startsWith('data:image/')) {
      const img = new window.Image();
      img.onload = () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          resolve({ dataUrl: url, width: img.naturalWidth || 100, height: img.naturalHeight || 100 });
        }
      };
      img.onerror = () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          resolve(null);
        }
      };
      img.src = url;
      return;
    }

    // Attempt fetch as blob -> convert to base64
    fetch(url, { mode: 'cors' })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result as string;
          const img = new window.Image();
          img.onload = () => {
            if (!resolved) {
              resolved = true;
              clearTimeout(timer);
              resolve({
                dataUrl,
                width: img.naturalWidth || 100,
                height: img.naturalHeight || 100,
              });
            }
          };
          img.onerror = () => {
            if (!resolved) {
              resolved = true;
              clearTimeout(timer);
              resolve({ dataUrl, width: 100, height: 100 });
            }
          };
          img.src = dataUrl;
        };
        reader.onerror = () => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timer);
            resolve(null);
          }
        };
        reader.readAsDataURL(blob);
      })
      .catch(() => {
        // Fallback: crossOrigin Image
        try {
          const img = new window.Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            try {
              const canvas = document.createElement('canvas');
              canvas.width = img.naturalWidth;
              canvas.height = img.naturalHeight;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(img, 0, 0);
                const dataUrl = canvas.toDataURL('image/png');
                if (!resolved) {
                  resolved = true;
                  clearTimeout(timer);
                  resolve({ dataUrl, width: img.naturalWidth, height: img.naturalHeight });
                  return;
                }
              }
            } catch {
              // Canvas tainted or unsupported
            }
            if (!resolved) {
              resolved = true;
              clearTimeout(timer);
              resolve(null);
            }
          };
          img.onerror = () => {
            if (!resolved) {
              resolved = true;
              clearTimeout(timer);
              resolve(null);
            }
          };
          img.src = url;
        } catch {
          if (!resolved) {
            resolved = true;
            clearTimeout(timer);
            resolve(null);
          }
        }
      });
  });
}

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

  /**
   * Dedicated PDF Header block for Rekap Bulanan Grid (PHASE 9G / Specification Update)
   *
   * Displays:
   * 1. Left: School Logo (from institution settings / Supabase Storage) with preserved aspect ratio
   * 2. Center: 3 Title lines:
   *    - REKAP DAN LAPORAN PRESENSI PEGAWAI
   *    - SMK NEGERI 1 LUWU TIMUR
   *    - TAHUN PELAJARAN 2026/2027
   * 3. Horizontal divider line
   * 4. Period information: "Periode: DD Mmm YYYY - DD Mmm YYYY"
   * (Omits Pegawai, Departemen, Lokasi, Status Masuk, and Status Pulang)
   */
  drawMonthlyRecapPdfHeader(
    doc: jsPDF,
    filter: AttendanceReportFilter,
    logoImage?: { dataUrl: string; width: number; height: number } | null
  ): number {
    const pageWidth = doc.internal.pageSize.width;

    // A. School Logo on Left (if available)
    if (logoImage && logoImage.dataUrl) {
      try {
        const maxH = 17;
        const maxW = 24;
        const aspect = logoImage.width && logoImage.height ? logoImage.width / logoImage.height : 1;
        let renderW = maxH * aspect;
        let renderH = maxH;
        if (renderW > maxW) {
          renderW = maxW;
          renderH = maxW / aspect;
        }
        const logoY = 9 + (maxH - renderH) / 2;
        doc.addImage(logoImage.dataUrl, 'PNG', 10, logoY, renderW, renderH);
      } catch (err) {
        console.warn('drawMonthlyRecapPdfHeader: Gagal menyematkan gambar logo:', err);
      }
    }

    // B. Title Block (Center aligned at pageWidth / 2, completely independent of left logo)
    // All 3 lines use the exact same 11pt font size
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(17, 24, 39); // #111827
    doc.text('REKAP PRESENSI PEGAWAI', pageWidth / 2, 13.5, { align: 'center' });

    doc.setFontSize(11);
    doc.setTextColor(17, 24, 39); // #111827
    doc.text('SMK NEGERI 1 LUWU TIMUR', pageWidth / 2, 19, { align: 'center' });

    doc.setFontSize(11);
    doc.setTextColor(55, 65, 81); // #374151
    doc.text('TAHUN PELAJARAN 2026/2027', pageWidth / 2, 24.5, { align: 'center' });

    // C. Divider Line
    doc.setDrawColor(229, 231, 235); // #E5E7EB
    doc.setLineWidth(0.5);
    doc.line(10, 28.5, pageWidth - 10, 28.5);

    // D. Period Subheader (Only Periode, no other filter items)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(75, 85, 99); // #4B5563
    const periStr = `Periode: ${formatMakassarShortDate(filter.startDate)} - ${formatMakassarShortDate(filter.endDate)}`;
    doc.text(periStr, 10, 33.5);

    return 36.5; // Y coordinate where table starts
  },

  /**
   * Export Monthly Grid Matrix Recap to PDF (PHASE 9G-EXPORT / REVISED)
   *
   * Formatted strictly for A4 Landscape.
   * Includes:
   * - Identitas: No, Nama Pegawai, Status
   * - Tanggal 1..N (kolom libur/akhir pekan diberi fill color oranye muda #FFEDD5 / [255, 237, 213])
   * - Ringkasan: Hadir (total), Tepat Waktu, Terlambat, Dinas Luar, Sakit, Izin, Cuti, Alfa, % Kehadiran
   */
  async exportMonthlyRecapToPdf(
    data: MonthlyRecapReportResponse,
    year: number,
    month: number,
    filter: AttendanceReportFilter,
    filterLabels?: { employee?: string; department?: string; location?: string },
    schoolLogoUrl?: string | null
  ): Promise<boolean> {
    if (!data || data.rows.length === 0) {
      throw new Error('Tidak ada data rekap bulanan grid untuk diekspor.');
    }

    // A4 Landscape is 297mm x 210mm
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    // 1. Resolve and Load School Logo
    const effectiveLogoUrl = schoolLogoUrl || systemSettingsService.getGeneralSettings().schoolLogo;
    let logoImage: { dataUrl: string; width: number; height: number } | null = null;
    if (effectiveLogoUrl) {
      try {
        logoImage = await loadImageAsBase64(effectiveLogoUrl, 3500);
      } catch (err) {
        console.warn('exportMonthlyRecapToPdf: Gagal memuat logo instansi:', err);
      }
    }

    const startY = this.drawMonthlyRecapPdfHeader(doc, filter, logoImage);

    // 2. Identify weekend and holiday days
    const holidayOrWeekendDays = new Set<number>();
    for (let d = 1; d <= data.daysInMonth; d++) {
      const dow = new Date(year, month - 1, d, 12, 0, 0).getDay();
      const isWeekend = dow === 0 || dow === 6;
      const isHoliday = isWeekend || data.rows.some((r) => r.dailyStatuses[d]?.code === 'L');
      if (isHoliday) {
        holidayOrWeekendDays.add(d);
      }
    }

    const dayNumbers = Array.from({ length: data.daysInMonth }, (_, i) => i + 1);

    // 3. Build Table Headers
    const head = [
      [
        'No',
        'Nama Pegawai',
        'Status',
        ...dayNumbers.map(String),
        'Hadir\n(total)',
        'Tepat\nWaktu',
        'Ter\nlambat',
        'Dinas\nLuar',
        'Sakit',
        'Izin',
        'Cuti',
        'Alfa',
        '%\nKehadiran',
      ],
    ];

    // 4. Build Table Body Rows
    const body = data.rows.map((row, index) => {
      const dailyCodes = dayNumbers.map((d) => row.dailyStatuses[d]?.code || '—');

      // Calculations:
      // Hadir (total) = H + T + DL = totalPresent + totalOfficialDuty
      // Tepat Waktu = H = Math.max(0, row.totalPresent - row.totalLate)
      // Terlambat = T = row.totalLate
      // Dinas Luar = DL = row.totalOfficialDuty
      // Sakit = S = row.totalSick
      // Izin = I = row.totalPermit
      // Cuti = C = row.totalLeave
      // Alfa = A = row.totalAbsent
      // % Kehadiran = row.attendancePercentageLabel
      const totalHadir = row.totalPresent + row.totalOfficialDuty;
      const totalTepatWaktu = Math.max(0, row.totalPresent - row.totalLate);

      return [
        String(index + 1),
        row.employeeName,
        row.employeeType,
        ...dailyCodes,
        String(totalHadir),
        String(totalTepatWaktu),
        String(row.totalLate),
        String(row.totalOfficialDuty),
        String(row.totalSick),
        String(row.totalPermit),
        String(row.totalLeave),
        String(row.totalAbsent),
        row.attendancePercentageLabel,
      ];
    });

    // 5. Column Styles and Widths
    const columnStyles: Record<number, any> = {
      0: { cellWidth: 5.5, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 26, halign: 'left' },
      2: { cellWidth: 10, halign: 'center' },
    };

    const firstSummaryColIdx = 3 + data.daysInMonth;
    columnStyles[firstSummaryColIdx] = { halign: 'center', fontStyle: 'bold' };     // Hadir (total)
    columnStyles[firstSummaryColIdx + 1] = { halign: 'center' };                     // Tepat Waktu
    columnStyles[firstSummaryColIdx + 2] = { halign: 'center' };                     // Terlambat
    columnStyles[firstSummaryColIdx + 3] = { halign: 'center' };                     // Dinas Luar
    columnStyles[firstSummaryColIdx + 4] = { halign: 'center' };                     // Sakit
    columnStyles[firstSummaryColIdx + 5] = { halign: 'center' };                     // Izin
    columnStyles[firstSummaryColIdx + 6] = { halign: 'center' };                     // Cuti
    columnStyles[firstSummaryColIdx + 7] = { halign: 'center', fontStyle: 'bold' }; // Alfa
    columnStyles[firstSummaryColIdx + 8] = { halign: 'center', fontStyle: 'bold' }; // % Kehadiran

    autoTable(doc, {
      startY,
      margin: { left: 7, right: 7 },
      head,
      body,
      theme: 'grid',
      styles: {
        fontSize: 4.8,
        cellPadding: 0.4,
        valign: 'middle',
        halign: 'center',
        overflow: 'ellipsize',
      },
      headStyles: {
        fillColor: [249, 115, 22],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 4.6,
        cellPadding: 0.4,
        valign: 'middle',
        halign: 'center',
      },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      columnStyles,
      didParseCell: (dataCell) => {
        const colIdx = dataCell.column.index;

        // Apply light orange fill color #FFEDD5 / [255, 237, 213] ONLY to body cells of weekend or holiday columns.
        // Date headers (section === 'head') remain uniformly orange with white text.
        if (dataCell.section === 'body') {
          if (colIdx >= 3 && colIdx <= 2 + data.daysInMonth) {
            const dayNum = colIdx - 2;
            if (holidayOrWeekendDays.has(dayNum)) {
              dataCell.cell.styles.fillColor = [255, 237, 213];
            }
          }

          // Color coding for body status codes
          const val = dataCell.cell.text[0];
          if (val === 'H') {
            dataCell.cell.styles.textColor = [16, 124, 65]; // green
            dataCell.cell.styles.fontStyle = 'bold';
          } else if (val === 'T') {
            dataCell.cell.styles.textColor = [180, 83, 9];  // amber
            dataCell.cell.styles.fontStyle = 'bold';
          } else if (val === 'S') {
            dataCell.cell.styles.textColor = [29, 78, 216]; // blue
          } else if (val === 'I') {
            dataCell.cell.styles.textColor = [79, 70, 229]; // indigo
          } else if (val === 'DL') {
            dataCell.cell.styles.textColor = [126, 34, 206]; // purple
          } else if (val === 'C') {
            dataCell.cell.styles.textColor = [15, 118, 110]; // teal
          } else if (val === 'A') {
            dataCell.cell.styles.textColor = [220, 38, 38]; // red
            dataCell.cell.styles.fontStyle = 'bold';
          } else if (val === 'L') {
            dataCell.cell.styles.textColor = [153, 27, 27]; // dark reddish-gray
          } else if (val === '—') {
            dataCell.cell.styles.textColor = [156, 163, 175]; // light gray
          }
        }
      },
    });

    const printTs = this.getPrintTimestamp();
    this.attachFooter(doc, printTs);

    const formattedPeriod = `${year}${String(month).padStart(2, '0')}`;
    doc.save(`Laporan_Matriks_Bulanan_${formattedPeriod}.pdf`);
    return true;
  },
};
