import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  FileSpreadsheet,
  Download,
  Upload,
  X,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Check,
  Info,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { DepartmentRow, PositionRow } from '../../types/database.types';
import { departmentService } from '../../services/departmentService';
import { positionService } from '../../services/positionService';
import {
  downloadEmployeeImportTemplate,
  employeeImportService,
  exportImportResultReport,
} from '../../services/employeeImportService';
import {
  BulkEmployeeImportSummaryResponse,
  EMPLOYEE_IMPORT_MAX_FILE_SIZE_BYTES,
  EMPLOYEE_IMPORT_MAX_ROWS,
  ImportRowValidationStatus,
  WorkbookValidationSummary,
} from '../../types/employeeImport.types';

interface EmployeeImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportCompleted: (summary: BulkEmployeeImportSummaryResponse) => void;
}

type ModalStep = 'upload' | 'preview' | 'result';
type PreviewFilter = 'all' | ImportRowValidationStatus;

export const EmployeeImportModal: React.FC<EmployeeImportModalProps> = ({
  isOpen,
  onClose,
  onImportCompleted,
}) => {
  const [step, setStep] = useState<ModalStep>('upload');
  const [departments, setDepartments] = useState<DepartmentRow[]>([]);
  const [positions, setPositions] = useState<PositionRow[]>([]);
  const [isLoadingMaster, setIsLoadingMaster] = useState(false);

  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const [validationSummary, setValidationSummary] =
    useState<WorkbookValidationSummary | null>(null);
  const [previewFilter, setPreviewFilter] = useState<PreviewFilter>('all');
  const [importResult, setImportResult] =
    useState<BulkEmployeeImportSummaryResponse | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    setStep('upload');
    setErrorMessage(null);
    setValidationSummary(null);
    setImportResult(null);
    setPreviewFilter('all');
    setIsParsing(false);
    setIsImporting(false);

    const loadMasterData = async () => {
      setIsLoadingMaster(true);
      try {
        const [depts, pos] = await Promise.all([
          departmentService.getDepartments({ onlyActive: false }),
          positionService.getPositions({ onlyActive: false }),
        ]);
        setDepartments(depts);
        setPositions(pos);
      } catch {
        setErrorMessage('Gagal memuat data master departemen dan jabatan.');
      } finally {
        setIsLoadingMaster(false);
      }
    };

    loadMasterData();
  }, [isOpen]);

  const activeDepartments = useMemo(
    () => departments.filter((d) => d.is_active),
    [departments]
  );
  const activePositions = useMemo(
    () => positions.filter((p) => p.is_active),
    [positions]
  );

  const filteredPreviewRows = useMemo(() => {
    if (!validationSummary) return [];
    if (previewFilter === 'all') return validationSummary.rows;
    return validationSummary.rows.filter(
      (r) => r.validationStatus === previewFilter
    );
  }, [validationSummary, previewFilter]);

  if (!isOpen) return null;

  const handleDownloadTemplate = () => {
    setErrorMessage(null);
    try {
      downloadEmployeeImportTemplate(activeDepartments, activePositions);
    } catch {
      setErrorMessage('Gagal membuat file template Excel.');
    }
  };

  const processSelectedFile = async (file: File) => {
    setErrorMessage(null);

    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      setErrorMessage('Format file harus .xlsx sesuai template resmi Tamaki.');
      return;
    }

    if (file.size <= 0) {
      setErrorMessage('File Excel yang dipilih kosong.');
      return;
    }

    if (file.size > EMPLOYEE_IMPORT_MAX_FILE_SIZE_BYTES) {
      setErrorMessage('Ukuran file melebihi batas maksimal 5 MB.');
      return;
    }

    setIsParsing(true);
    try {
      const summary = await employeeImportService.parseAndValidateUploadedFile(
        file,
        departments,
        positions
      );
      setValidationSummary(summary);
      setPreviewFilter('all');
      setStep('preview');
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Gagal membaca dan memvalidasi file Excel.';
      setErrorMessage(msg);
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) {
      processSelectedFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (isParsing || isLoadingMaster) return;
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const handleConfirmImport = async () => {
    if (!validationSummary || validationSummary.importableCount === 0) return;

    setErrorMessage(null);
    setIsImporting(true);
    try {
      const res = await employeeImportService.executePartialImport(validationSummary);
      setImportResult(res);
      setStep('result');
      if (res.importedCount > 0) {
        onImportCompleted(res);
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Gagal menjalankan proses impor pegawai ke server.';
      setErrorMessage(msg);
    } finally {
      setIsImporting(false);
    }
  };

  const handleDownloadResultReport = () => {
    if (!importResult) return;
    try {
      exportImportResultReport(
        importResult.results,
        validationSummary?.fileName || 'Pegawai.xlsx'
      );
    } catch {
      setErrorMessage('Gagal mengunduh laporan hasil impor.');
    }
  };

  const handleSafeClose = () => {
    if (isParsing || isImporting) return;
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-2xs p-3 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="employee-import-modal-title"
    >
      <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-[#E5E7EB] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#FFEDD5] border border-orange-200 text-[#F97316] flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3
                id="employee-import-modal-title"
                className="text-sm sm:text-base font-bold text-[#111827] truncate"
              >
                Impor Pegawai Massal (Excel)
              </h3>
              <p className="text-[11px] sm:text-xs text-[#6B7280] truncate">
                {step === 'upload' &&
                  'Unduh template resmi Tamaki, isi data pegawai, lalu unggah untuk pratinjau.'}
                {step === 'preview' &&
                  `Pratinjau & validasi file: ${validationSummary?.fileName || ''}`}
                {step === 'result' && 'Ringkasan hasil eksekusi impor pegawai.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSafeClose}
            disabled={isParsing || isImporting}
            aria-label="Tutup modal impor"
            className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#111827] hover:bg-[#F3F4F6] transition-colors cursor-pointer disabled:opacity-40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 text-xs">
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {/* STEP 1: UPLOAD & TEMPLATE */}
          {step === 'upload' && (
            <div className="space-y-4">
              {/* Step 1A: Download Official Template */}
              <div className="p-4 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="font-bold text-[#111827]">
                    1. Unduh Template Excel Resmi Tamaki
                  </p>
                  <p className="text-[11px] text-[#6B7280] leading-relaxed">
                    Berisi 13 kolom tetap, format teks pada NIP/NIK/Nomor Pegawai/Telepon, serta sheet referensi pilihan kategori & master data aktif.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadTemplate}
                  disabled={isLoadingMaster || isParsing}
                  leftIcon={<Download className="w-3.5 h-3.5 text-[#F97316]" />}
                  className="shrink-0 !bg-white border-orange-200 text-[#EA580C] hover:!bg-[#FFEDD5]/50"
                >
                  {isLoadingMaster ? 'Memuat Master...' : 'Unduh Template (.xlsx)'}
                </Button>
              </div>

              {/* Step 1B: Upload Dropzone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-colors ${
                  isDragOver
                    ? 'border-[#F97316] bg-[#FFEDD5]/40'
                    : 'border-[#E5E7EB] bg-white hover:border-[#F97316]/60'
                }`}
              >
                <div className="w-11 h-11 rounded-xl bg-[#FFEDD5] text-[#F97316] flex items-center justify-center mx-auto mb-3">
                  {isParsing ? (
                    <div className="w-5 h-5 border-2 border-[#F97316] border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Upload className="w-5 h-5" />
                  )}
                </div>

                <p className="text-sm font-bold text-[#111827]">
                  {isParsing
                    ? 'Membaca dan memvalidasi workbook...'
                    : '2. Unggah File Excel yang Sudah Diisi'}
                </p>
                <p className="text-[11px] text-[#6B7280] mt-1 max-w-md mx-auto leading-relaxed">
                  Seret dan lepas file <span className="font-semibold text-[#111827]">.xlsx</span> di sini atau pilih dari perangkat. Maksimal 5 MB dan {EMPLOYEE_IMPORT_MAX_ROWS} baris data.
                </p>

                <div className="mt-4">
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    disabled={isParsing || isLoadingMaster}
                    onClick={() => fileInputRef.current?.click()}
                    leftIcon={<Upload className="w-3.5 h-3.5" />}
                  >
                    {isParsing ? 'Memproses...' : 'Pilih File Excel (.xlsx)'}
                  </Button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  className="hidden"
                  onChange={handleFileInputChange}
                />
              </div>

              {/* Concise Rules Reminder */}
              <div className="p-3.5 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] text-[11px] text-[#6B7280] space-y-1.5">
                <div className="flex items-center gap-1.5 font-semibold text-[#111827]">
                  <Info className="w-3.5 h-3.5 text-[#F97316]" />
                  <span>Ketentuan Impor Parsial</span>
                </div>
                <ul className="list-disc pl-5 space-y-1 leading-relaxed">
                  <li>
                    Impor hanya menambah pegawai baru (<span className="font-medium text-[#111827]">tidak mengubah/menimpa pegawai yang sudah ada</span>).
                  </li>
                  <li>
                    Baris valid tetap diimpor sementara baris tidak valid dilewati dengan alasan penolakan per nomor baris.
                  </li>
                  <li>
                    Akun login tidak dibuat otomatis; email yang sudah terdaftar di Supabase Auth akan ditandai untuk pemeriksaan manual.
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* STEP 2: PREVIEW & CONFIRM */}
          {step === 'preview' && validationSummary && (
            <div className="space-y-4">
              {/* Summary Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
                    Total Dibaca
                  </span>
                  <p className="text-lg font-bold text-[#111827] mt-0.5">
                    {validationSummary.totalRows}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                    Valid
                  </span>
                  <p className="text-lg font-bold text-emerald-700 mt-0.5">
                    {validationSummary.validCount}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-[#FFEDD5]/60 border border-orange-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#EA580C]">
                    Valid (Peringatan)
                  </span>
                  <p className="text-lg font-bold text-[#EA580C] mt-0.5">
                    {validationSummary.warningCount}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-red-50/70 border border-red-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-red-700">
                    Ditolak
                  </span>
                  <p className="text-lg font-bold text-red-700 mt-0.5">
                    {validationSummary.rejectedCount}
                  </p>
                </div>
              </div>

              {/* Auth Check Notice (if Edge Function unavailable) */}
              {validationSummary.authCheckNotice && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-[11px] text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>{validationSummary.authCheckNotice}</span>
                </div>
              )}

              {/* Filter Tabs */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  {(
                    [
                      { id: 'all', label: `Semua (${validationSummary.totalRows})` },
                      { id: 'valid', label: `Valid (${validationSummary.validCount})` },
                      {
                        id: 'warning',
                        label: `Peringatan (${validationSummary.warningCount})`,
                      },
                      {
                        id: 'rejected',
                        label: `Ditolak (${validationSummary.rejectedCount})`,
                      },
                    ] as { id: PreviewFilter; label: string }[]
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setPreviewFilter(tab.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        previewFilter === tab.id
                          ? 'bg-[#FFEDD5] text-[#EA580C] border border-orange-200'
                          : 'bg-[#F9FAFB] text-[#6B7280] border border-[#E5E7EB] hover:text-[#111827]'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview Table */}
              <div className="border border-[#E5E7EB] rounded-xl overflow-hidden">
                <div className="overflow-x-auto max-h-[340px]">
                  <table className="w-full text-left border-collapse min-w-[700px] text-xs">
                    <thead className="sticky top-0 bg-[#F9FAFB] border-b border-[#E5E7EB] text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3 w-16 text-center">Baris</th>
                        <th className="py-2.5 px-3">Pegawai & Email</th>
                        <th className="py-2.5 px-3">Jenis Kepegawaian</th>
                        <th className="py-2.5 px-3">Unit / Jabatan</th>
                        <th className="py-2.5 px-3 w-32">Status</th>
                        <th className="py-2.5 px-3">Keterangan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E7EB] bg-white">
                      {filteredPreviewRows.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="py-8 text-center text-[#6B7280]"
                          >
                            Tidak ada baris pada kategori filter ini.
                          </td>
                        </tr>
                      ) : (
                        filteredPreviewRows.map((row) => (
                          <tr
                            key={row.excelRowNumber}
                            className={
                              row.validationStatus === 'rejected'
                                ? 'bg-red-50/30'
                                : row.validationStatus === 'warning'
                                ? 'bg-[#FFEDD5]/20'
                                : ''
                            }
                          >
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-[#6B7280]">
                              {row.excelRowNumber}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-semibold text-[#111827]">
                                {row.raw.fullName || '—'}
                              </div>
                              <div className="text-[11px] text-[#6B7280] font-mono">
                                {row.normalized?.email || row.raw.email || '—'}
                              </div>
                              {(row.raw.nip || row.raw.nik) && (
                                <div className="text-[10px] text-[#9CA3AF] font-mono">
                                  {row.raw.nip ? `NIP: ${row.raw.nip}` : ''}
                                  {row.raw.nip && row.raw.nik ? ' · ' : ''}
                                  {row.raw.nik ? `NIK: ${row.raw.nik}` : ''}
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-[#374151]">
                              {row.normalized?.employee_type ||
                                row.raw.employeeType ||
                                '—'}
                            </td>
                            <td className="py-2.5 px-3 text-[11px] text-[#4B5563]">
                              <div>
                                {row.resolvedDepartmentName ||
                                  (row.raw.departmentName
                                    ? `${row.raw.departmentName} (NULL)`
                                    : '—')}
                              </div>
                              <div className="text-[#6B7280]">
                                {row.resolvedPositionName ||
                                  (row.raw.positionName
                                    ? `${row.raw.positionName} (NULL)`
                                    : '—')}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              {row.validationStatus === 'valid' && (
                                <Badge variant="success" size="sm">
                                  Valid
                                </Badge>
                              )}
                              {row.validationStatus === 'warning' && (
                                <Badge variant="warning" size="sm">
                                  Peringatan
                                </Badge>
                              )}
                              {row.validationStatus === 'rejected' && (
                                <Badge variant="danger" size="sm">
                                  Ditolak
                                </Badge>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-[11px] leading-relaxed">
                              {row.errors.length > 0 && (
                                <ul className="text-red-700 space-y-0.5 list-disc pl-4">
                                  {row.errors.map((err, i) => (
                                    <li key={i}>{err}</li>
                                  ))}
                                </ul>
                              )}
                              {row.warnings.length > 0 && (
                                <ul className="text-amber-800 space-y-0.5 list-disc pl-4">
                                  {row.warnings.map((w, i) => (
                                    <li key={i}>{w}</li>
                                  ))}
                                </ul>
                              )}
                              {row.errors.length === 0 &&
                                row.warnings.length === 0 && (
                                  <span className="text-emerald-700">
                                    Siap diimpor
                                  </span>
                                )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: EXECUTION SUMMARY */}
          {step === 'result' && importResult && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] flex items-start gap-3">
                {importResult.importedCount > 0 ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <p className="text-sm font-bold text-[#111827]">
                    {importResult.message}
                  </p>
                  <p className="text-[11px] text-[#6B7280]">
                    Pegawai berhasil diimpor memiliki akun terhubung kosong (<span className="font-mono">profile_id = NULL</span>) dan dapat dikelola/dihubungkan pada tahap terpisah.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                    Berhasil Bersih
                  </span>
                  <p className="text-lg font-bold text-emerald-700 mt-0.5">
                    {importResult.importedCleanCount}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-[#FFEDD5]/60 border border-orange-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#EA580C]">
                    Berhasil + Peringatan
                  </span>
                  <p className="text-lg font-bold text-[#EA580C] mt-0.5">
                    {importResult.importedWithWarningCount}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-red-50/70 border border-red-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-red-700">
                    Gagal Insert DB
                  </span>
                  <p className="text-lg font-bold text-red-700 mt-0.5">
                    {importResult.failedCount}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
                    Ditolak Validasi
                  </span>
                  <p className="text-lg font-bold text-[#4B5563] mt-0.5">
                    {importResult.skippedCount}
                  </p>
                </div>
              </div>

              <div className="border border-[#E5E7EB] rounded-xl overflow-hidden">
                <div className="overflow-x-auto max-h-[300px]">
                  <table className="w-full text-left border-collapse min-w-[640px] text-xs">
                    <thead className="sticky top-0 bg-[#F9FAFB] border-b border-[#E5E7EB] text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3 w-16 text-center">Baris</th>
                        <th className="py-2.5 px-3">Nama & Email</th>
                        <th className="py-2.5 px-3 w-40">Hasil</th>
                        <th className="py-2.5 px-3">Catatan / Alasan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E7EB] bg-white">
                      {importResult.results.map((item) => (
                        <tr key={`${item.excelRowNumber}-${item.email}`}>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-[#6B7280]">
                            {item.excelRowNumber}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-[#111827]">
                              {item.fullName}
                            </div>
                            <div className="text-[11px] text-[#6B7280] font-mono">
                              {item.email || '—'}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            {item.status === 'imported' && (
                              <Badge variant="success" size="sm">
                                Berhasil
                              </Badge>
                            )}
                            {item.status === 'imported_with_warning' && (
                              <Badge variant="warning" size="sm">
                                Berhasil (Peringatan)
                              </Badge>
                            )}
                            {item.status === 'failed' && (
                              <Badge variant="danger" size="sm">
                                Gagal DB
                              </Badge>
                            )}
                            {item.status === 'skipped' && (
                              <Badge variant="default" size="sm">
                                Dilewati
                              </Badge>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-[11px] leading-relaxed">
                            {item.errorReason && (
                              <p className="text-red-700">{item.errorReason}</p>
                            )}
                            {item.warnings.length > 0 && (
                              <ul className="text-amber-800 list-disc pl-4 space-y-0.5">
                                {item.warnings.map((w, idx) => (
                                  <li key={idx}>{w}</li>
                                ))}
                              </ul>
                            )}
                            {!item.errorReason && item.warnings.length === 0 && (
                              <span className="text-emerald-700">
                                Tersimpan ke database
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3.5 border-t border-[#E5E7EB] flex flex-wrap items-center justify-between gap-2.5 shrink-0 bg-[#F9FAFB] rounded-b-2xl">
          {step === 'upload' && (
            <>
              <span className="text-[11px] text-[#6B7280]">
                Hanya file <span className="font-mono">.xlsx</span> hingga 5 MB / 500 baris.
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSafeClose}
                disabled={isParsing}
              >
                Tutup
              </Button>
            </>
          )}

          {step === 'preview' && validationSummary && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setStep('upload');
                  setErrorMessage(null);
                }}
                disabled={isImporting}
                leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
              >
                Pilih File Lain
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSafeClose}
                  disabled={isImporting}
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleConfirmImport}
                  isLoading={isImporting}
                  disabled={
                    isImporting || validationSummary.importableCount === 0
                  }
                  leftIcon={<Check className="w-3.5 h-3.5" />}
                >
                  {isImporting
                    ? 'Mengimpor Pegawai...'
                    : `Impor ${validationSummary.importableCount} Pegawai Valid`}
                </Button>
              </div>
            </>
          )}

          {step === 'result' && importResult && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownloadResultReport}
                leftIcon={<Download className="w-3.5 h-3.5 text-[#F97316]" />}
              >
                Unduh Laporan Hasil (.xlsx)
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleSafeClose}
              >
                Selesai
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
