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
  ArrowRight,
  Check,
  Info,
  Users,
  KeyRound,
  Eye,
  EyeOff,
  ShieldAlert,
  RefreshCw,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { DepartmentRow, PositionRow } from '../../types/database.types';
import { departmentService } from '../../services/departmentService';
import { positionService } from '../../services/positionService';
import {
  buildEmployeeAccountCandidates,
  deduplicateChunkErrorMessages,
  downloadEmployeeImportTemplate,
  employeeImportService,
  exportImportResultReport,
  getBulkAccountStatusBadge,
  getRetryableEmployeeIds,
  hasNewlyCreatedAccounts,
  mergeAccountResultsIntoImportSummary,
  validateBatchInitialPassword,
} from '../../services/employeeImportService';
import {
  BULK_ACCOUNT_CHUNK_SIZE,
  BulkCreateAccountsAggregatedSummary,
  BulkEmployeeImportSummaryResponse,
  EMPLOYEE_IMPORT_MAX_FILE_SIZE_BYTES,
  EMPLOYEE_IMPORT_MAX_ROWS,
  EmployeeAccountCandidate,
  ImportRowValidationStatus,
  WorkbookValidationSummary,
} from '../../types/employeeImport.types';

interface EmployeeImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportCompleted: (summary: BulkEmployeeImportSummaryResponse) => void;
  onAccountsCreated?: () => void;
}

type ModalStep =
  | 'upload'
  | 'preview'
  | 'result'
  | 'account-prep'
  | 'account-confirm'
  | 'account-progress'
  | 'account-report';
type PreviewFilter = 'all' | ImportRowValidationStatus;

export const EmployeeImportModal: React.FC<EmployeeImportModalProps> = ({
  isOpen,
  onClose,
  onImportCompleted,
  onAccountsCreated,
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

  // Unified Account Creation States
  const [accountCandidates, setAccountCandidates] = useState<EmployeeAccountCandidate[]>([]);
  const [batchPassword, setBatchPassword] = useState('');
  const [confirmBatchPassword, setConfirmBatchPassword] = useState('');
  const [showBatchPassword, setShowBatchPassword] = useState(false);
  const [showConfirmBatchPassword, setShowConfirmBatchPassword] = useState(false);
  const [isCreatingAccounts, setIsCreatingAccounts] = useState(false);
  const [accountSummary, setAccountSummary] =
    useState<BulkCreateAccountsAggregatedSummary | null>(null);

  // Retry-specific temporary password state (cleared immediately on completion/cancel)
  const [retryPassword, setRetryPassword] = useState('');
  const [confirmRetryPassword, setConfirmRetryPassword] = useState('');
  const [showRetryPassword, setShowRetryPassword] = useState(false);
  const [showConfirmRetryPassword, setShowConfirmRetryPassword] = useState(false);
  const [isRetryingAccounts, setIsRetryingAccounts] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isSubmittingAccountsRef = useRef(false);

  const clearSensitivePasswordState = () => {
    setBatchPassword('');
    setConfirmBatchPassword('');
    setShowBatchPassword(false);
    setShowConfirmBatchPassword(false);
    setRetryPassword('');
    setConfirmRetryPassword('');
    setShowRetryPassword(false);
    setShowConfirmRetryPassword(false);
  };

  useEffect(() => {
    if (!isOpen) {
      clearSensitivePasswordState();
      return;
    }

    setStep('upload');
    setErrorMessage(null);
    setValidationSummary(null);
    setImportResult(null);
    setPreviewFilter('all');
    setIsParsing(false);
    setIsImporting(false);
    setAccountCandidates([]);
    setAccountSummary(null);
    setIsCreatingAccounts(false);
    setIsRetryingAccounts(false);
    isSubmittingAccountsRef.current = false;
    clearSensitivePasswordState();

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

  const eligibleCandidates = useMemo(
    () => accountCandidates.filter((c) => c.eligible && c.employeeId),
    [accountCandidates]
  );

  const selectedCandidates = useMemo(
    () => accountCandidates.filter((c) => c.eligible && c.selected && c.employeeId),
    [accountCandidates]
  );

  const ineligibleCandidatesCount = useMemo(
    () => accountCandidates.filter((c) => !c.eligible).length,
    [accountCandidates]
  );

  const retryableEmployeeIds = useMemo(
    () => getRetryableEmployeeIds(accountSummary),
    [accountSummary]
  );

  const allEligibleSelected =
    eligibleCandidates.length > 0 &&
    eligibleCandidates.every((c) => c.selected);

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
      setAccountCandidates(buildEmployeeAccountCandidates(res));
      setAccountSummary(null);
      clearSensitivePasswordState();
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

  const handleToggleCandidate = (excelRowNumber: number) => {
    setAccountCandidates((prev) =>
      prev.map((item) => {
        if (item.excelRowNumber !== excelRowNumber || !item.eligible) {
          return item;
        }
        return { ...item, selected: !item.selected };
      })
    );
  };

  const handleToggleAllEligible = () => {
    const nextValue = !allEligibleSelected;
    setAccountCandidates((prev) =>
      prev.map((item) => (item.eligible ? { ...item, selected: nextValue } : item))
    );
  };

  const handleProceedToAccountPrep = () => {
    if (!importResult) return;
    setErrorMessage(null);
    if (accountCandidates.length === 0) {
      setAccountCandidates(buildEmployeeAccountCandidates(importResult));
    }
    setStep('account-prep');
  };

  const handleProceedToConfirmAccounts = () => {
    setErrorMessage(null);
    if (selectedCandidates.length === 0) {
      setErrorMessage('Pilih minimal 1 pegawai yang eligible untuk dibuatkan akun.');
      return;
    }

    const pwdError = validateBatchInitialPassword(batchPassword, confirmBatchPassword);
    if (pwdError) {
      setErrorMessage(pwdError);
      return;
    }

    setStep('account-confirm');
  };

  const handleExecuteBulkAccountCreation = async () => {
    if (isSubmittingAccountsRef.current || isCreatingAccounts) return;
    if (selectedCandidates.length === 0) return;

    const pwdError = validateBatchInitialPassword(batchPassword, confirmBatchPassword);
    if (pwdError) {
      setErrorMessage(pwdError);
      setStep('account-prep');
      return;
    }

    isSubmittingAccountsRef.current = true;
    setErrorMessage(null);
    setIsCreatingAccounts(true);
    setStep('account-progress');

    const targets = selectedCandidates
      .filter((c): c is EmployeeAccountCandidate & { employeeId: string } => Boolean(c.employeeId))
      .map((c) => ({
        employeeId: c.employeeId,
        fullName: c.fullName,
        email: c.email,
      }));

    const totalChunks = Math.ceil(targets.length / BULK_ACCOUNT_CHUNK_SIZE);
    setAccountSummary({
      totalAttempted: 0,
      createdCount: 0,
      alreadyLinkedCount: 0,
      authExistsCount: 0,
      ineligibleCount: 0,
      failedCount: 0,
      reconciliationRequiredCount: 0,
      completedChunks: 0,
      totalChunks,
      chunkErrors: [],
      resultsByEmployeeId: {},
    });

    const submittedPassword = batchPassword;
    try {
      const finalSummary = await employeeImportService.executeBulkAccountCreation(
        targets,
        submittedPassword,
        {
          chunkSize: BULK_ACCOUNT_CHUNK_SIZE,
          onChunkProgress: (progressSummary) => {
            setAccountSummary(progressSummary);
          },
        }
      );

      setAccountSummary(finalSummary);
      setStep('account-report');
      if (hasNewlyCreatedAccounts(0, finalSummary.createdCount)) {
        onAccountsCreated?.();
      }
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Terjadi kesalahan saat memproses pembuatan akun massal.'
      );
      setStep('account-report');
    } finally {
      clearSensitivePasswordState();
      setIsCreatingAccounts(false);
      isSubmittingAccountsRef.current = false;
    }
  };

  const handleRetryFailedAccounts = async () => {
    if (isSubmittingAccountsRef.current || isRetryingAccounts) return;
    if (!accountSummary || retryableEmployeeIds.length === 0) return;

    const pwdError = validateBatchInitialPassword(retryPassword, confirmRetryPassword);
    if (pwdError) {
      setErrorMessage(pwdError);
      return;
    }

    isSubmittingAccountsRef.current = true;
    setErrorMessage(null);
    setIsRetryingAccounts(true);
    setStep('account-progress');

    const retrySet = new Set(retryableEmployeeIds);
    const retryTargets = accountCandidates
      .filter(
        (c): c is EmployeeAccountCandidate & { employeeId: string } =>
          typeof c.employeeId === 'string' &&
          c.employeeId.length > 0 &&
          retrySet.has(c.employeeId)
      )
      .map((c) => ({
        employeeId: c.employeeId,
        fullName: c.fullName,
        email: c.email,
      }));

    const previousCreatedCount = accountSummary.createdCount;
    const submittedRetryPassword = retryPassword;
    try {
      const updatedSummary = await employeeImportService.executeBulkAccountCreation(
        retryTargets,
        submittedRetryPassword,
        {
          chunkSize: BULK_ACCOUNT_CHUNK_SIZE,
          initialSummary: accountSummary,
          onChunkProgress: (progressSummary) => {
            setAccountSummary(progressSummary);
          },
        }
      );

      setAccountSummary(updatedSummary);
      setStep('account-report');
      if (hasNewlyCreatedAccounts(previousCreatedCount, updatedSummary.createdCount)) {
        onAccountsCreated?.();
      }
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Terjadi kesalahan saat mencoba ulang pembuatan akun.'
      );
      setStep('account-report');
    } finally {
      clearSensitivePasswordState();
      setIsRetryingAccounts(false);
      isSubmittingAccountsRef.current = false;
    }
  };

  const handleDownloadResultReport = () => {
    if (!importResult) return;
    try {
      const mergedRows = mergeAccountResultsIntoImportSummary(
        importResult.results,
        accountSummary
      );
      exportImportResultReport(
        mergedRows,
        validationSummary?.fileName || 'Pegawai.xlsx',
        accountSummary
      );
    } catch {
      setErrorMessage('Gagal mengunduh laporan hasil impor.');
    }
  };

  const isBusy = isParsing || isImporting || isCreatingAccounts || isRetryingAccounts;

  const handleSafeClose = () => {
    if (isBusy) return;
    clearSensitivePasswordState();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-2xs p-3 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="employee-import-modal-title"
    >
      <div className="bg-white dark:bg-[#222222] rounded-2xl border border-[#E5E7EB] dark:border-[#404040] shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-[#E5E7EB] dark:border-[#404040] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#FFEDD5] dark:bg-orange-950/50 border border-orange-200 dark:border-orange-800 text-[#F97316] flex items-center justify-center shrink-0">
              {step === 'account-prep' ||
              step === 'account-confirm' ||
              step === 'account-progress' ||
              step === 'account-report' ? (
                <Users className="w-5 h-5" />
              ) : (
                <FileSpreadsheet className="w-5 h-5" />
              )}
            </div>
            <div className="min-w-0">
              <h3
                id="employee-import-modal-title"
                className="text-sm sm:text-base font-bold text-[#111827] dark:text-[#F9FAFB] truncate"
              >
                Impor Pegawai Massal & Pembuatan Akun
              </h3>
              <p className="text-[11px] sm:text-xs text-[#6B7280] dark:text-[#A3A3A3] truncate">
                {step === 'upload' &&
                  'Unduh template resmi Tamaki, isi data pegawai, lalu unggah untuk pratinjau.'}
                {step === 'preview' &&
                  `Pratinjau & validasi file: ${validationSummary?.fileName || ''}`}
                {step === 'result' && 'Ringkasan hasil eksekusi impor pegawai ke database.'}
                {step === 'account-prep' &&
                  'Persiapan pembuatan akun login massal & kata sandi awal bersama.'}
                {step === 'account-confirm' &&
                  'Konfirmasi pembuatan akun login & pengaitan otomatis ke data pegawai.'}
                {step === 'account-progress' &&
                  'Memproses pembuatan akun massal secara bertahap per batch...'}
                {step === 'account-report' &&
                  'Laporan akhir impor pegawai dan pembuatan akun massal.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSafeClose}
            disabled={isBusy}
            aria-label="Tutup modal impor"
            className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#111827] dark:hover:text-[#F9FAFB] hover:bg-[#F3F4F6] dark:hover:bg-[#303030] transition-colors cursor-pointer disabled:opacity-40"
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
          {/* STEP 4: ACCOUNT PREPARATION */}
          {step === 'account-prep' && importResult && (
            <div className="space-y-4">
              {/* Summary Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
                    Total Baris
                  </span>
                  <p className="text-lg font-bold text-[#111827] mt-0.5">
                    {accountCandidates.length}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                    Eligible
                  </span>
                  <p className="text-lg font-bold text-emerald-700 mt-0.5">
                    {eligibleCandidates.length}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-[#FFEDD5]/70 border border-orange-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#EA580C]">
                    Dipilih Admin
                  </span>
                  <p className="text-lg font-bold text-[#EA580C] mt-0.5">
                    {selectedCandidates.length}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
                    Tidak Eligible
                  </span>
                  <p className="text-lg font-bold text-[#4B5563] mt-0.5">
                    {ineligibleCandidatesCount}
                  </p>
                </div>
              </div>

              {importResult.authCheckStatus === 'unavailable' && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-[11px] text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    Pemeriksaan awal email Supabase Auth tidak tersedia saat pratinjau. Email yang ternyata sudah terdaftar di Supabase Auth akan otomatis dilewati oleh server tanpa menautkan akun lama.
                  </span>
                </div>
              )}

              {/* Shared Batch Initial Password Box */}
              <div className="p-4 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] space-y-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#FFEDD5] text-[#F97316] flex items-center justify-center shrink-0">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-[#111827]">
                      Kata Sandi Awal Bersama (Satu Batch)
                    </p>
                    <p className="text-[11px] text-[#6B7280] leading-relaxed">
                      Berlaku untuk seluruh pegawai terpilih dengan peran terkunci sebagai{' '}
                      <span className="font-semibold text-[#111827]">Pegawai (employee)</span>.
                      Semua akun baru wajib mengganti kata sandi saat login pertama.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-[#374151]">
                      Kata Sandi Awal <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showBatchPassword ? 'text' : 'password'}
                        value={batchPassword}
                        onChange={(e) => setBatchPassword(e.target.value)}
                        placeholder="Minimal 6 karakter"
                        autoComplete="new-password"
                        className="w-full h-9 pl-3 pr-9 text-xs bg-white border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#F97316] text-[#111827]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowBatchPassword((v) => !v)}
                        aria-label={
                          showBatchPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'
                        }
                        className="absolute right-2.5 top-2 text-[#9CA3AF] hover:text-[#4B5563] cursor-pointer"
                      >
                        {showBatchPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-[#374151]">
                      Konfirmasi Kata Sandi Awal <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmBatchPassword ? 'text' : 'password'}
                        value={confirmBatchPassword}
                        onChange={(e) => setConfirmBatchPassword(e.target.value)}
                        placeholder="Ulangi kata sandi awal"
                        autoComplete="new-password"
                        className="w-full h-9 pl-3 pr-9 text-xs bg-white border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#F97316] text-[#111827]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmBatchPassword((v) => !v)}
                        aria-label={
                          showConfirmBatchPassword
                            ? 'Sembunyikan konfirmasi kata sandi'
                            : 'Tampilkan konfirmasi kata sandi'
                        }
                        className="absolute right-2.5 top-2 text-[#9CA3AF] hover:text-[#4B5563] cursor-pointer"
                      >
                        {showConfirmBatchPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Candidate Selection Table */}
              <div className="border border-[#E5E7EB] rounded-xl overflow-hidden">
                <div className="px-3.5 py-2.5 bg-[#F9FAFB] border-b border-[#E5E7EB] flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-[#374151]">
                    Daftar Pegawai Hasil Impor
                  </span>
                  {eligibleCandidates.length > 0 && (
                    <button
                      type="button"
                      onClick={handleToggleAllEligible}
                      className="text-[11px] font-semibold text-[#EA580C] hover:underline cursor-pointer"
                    >
                      {allEligibleSelected
                        ? 'Batalkan Semua Pilihan'
                        : `Pilih Semua Eligible (${eligibleCandidates.length})`}
                    </button>
                  )}
                </div>

                <div className="overflow-x-auto max-h-[260px]">
                  <table className="w-full text-left border-collapse min-w-[640px] text-xs">
                    <thead className="sticky top-0 bg-[#F9FAFB] border-b border-[#E5E7EB] text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3 w-12 text-center">Pilih</th>
                        <th className="py-2.5 px-3 w-14 text-center">Baris</th>
                        <th className="py-2.5 px-3">Nama & Email</th>
                        <th className="py-2.5 px-3 w-32">Kelayakan</th>
                        <th className="py-2.5 px-3">Keterangan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E7EB] bg-white">
                      {accountCandidates.map((cand) => (
                        <tr
                          key={`${cand.excelRowNumber}-${cand.employeeId || cand.email}`}
                          className={!cand.eligible ? 'bg-[#F9FAFB]/80 text-[#6B7280]' : ''}
                        >
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={cand.eligible && cand.selected}
                              disabled={!cand.eligible}
                              onChange={() => handleToggleCandidate(cand.excelRowNumber)}
                              aria-label={`Pilih ${cand.fullName}`}
                              className="w-4 h-4 rounded border-[#D1D5DB] text-[#F97316] focus:ring-[#F97316] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                            />
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-[#6B7280]">
                            {cand.excelRowNumber}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-[#111827]">{cand.fullName}</div>
                            <div className="text-[11px] text-[#6B7280] font-mono">
                              {cand.email || '—'}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            {cand.eligible ? (
                              <Badge variant="success" size="sm">
                                Eligible
                              </Badge>
                            ) : (
                              <Badge variant="default" size="sm">
                                Tidak Eligible
                              </Badge>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-[11px] leading-relaxed">
                            {cand.eligible ? (
                              <span className="text-emerald-700">
                                Siap dibuatkan akun login (role: Pegawai)
                              </span>
                            ) : (
                              <span className="text-[#6B7280]">{cand.ineligibleReason}</span>
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

          {/* STEP 5: CONFIRMATION */}
          {step === 'account-confirm' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1.5 text-xs text-amber-950">
                  <p className="font-bold text-sm text-amber-900">
                    Konfirmasi Pembuatan & Pengaitan {selectedCandidates.length} Akun Pegawai
                  </p>
                  <ul className="list-disc pl-4 space-y-1 text-[11px] leading-relaxed">
                    <li>
                      Sistem akan membuat{' '}
                      <span className="font-bold">{selectedCandidates.length} akun baru</span>{' '}
                      (dalam {Math.ceil(selectedCandidates.length / BULK_ACCOUNT_CHUNK_SIZE)} batch)
                      dengan role terkunci <span className="font-mono font-semibold">employee</span>{' '}
                      dan langsung mengaitkannya ke <span className="font-mono">employees.profile_id</span>.
                    </li>
                    <li>
                      <span className="font-bold">Wajib Ganti Kata Sandi:</span> Seluruh akun baru
                      diatur <span className="font-mono">must_change_password = true</span> sehingga
                      pegawai wajib mengganti kata sandi saat login pertama.
                    </li>
                    <li>
                      Kata sandi awal tidak disimpan pada log audit maupun penyimpanan browser.
                      Pastikan Anda membagikan kata sandi awal kepada pegawai melalui kanal yang aman.
                    </li>
                  </ul>
                </div>
              </div>

              <div className="border border-[#E5E7EB] rounded-xl overflow-hidden">
                <div className="px-3.5 py-2.5 bg-[#F9FAFB] border-b border-[#E5E7EB] text-[11px] font-bold text-[#374151]">
                  Daftar Pegawai Terpilih ({selectedCandidates.length})
                </div>
                <div className="overflow-x-auto max-h-[260px]">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="sticky top-0 bg-[#F9FAFB] border-b border-[#E5E7EB] text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">
                      <tr>
                        <th className="py-2 px-3 w-16 text-center">Baris</th>
                        <th className="py-2 px-3">Nama Pegawai</th>
                        <th className="py-2 px-3">Alamat Email Login</th>
                        <th className="py-2 px-3 w-28">Role</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E7EB] bg-white">
                      {selectedCandidates.map((c) => (
                        <tr key={c.employeeId}>
                          <td className="py-2 px-3 text-center font-mono text-[#6B7280]">
                            {c.excelRowNumber}
                          </td>
                          <td className="py-2 px-3 font-semibold text-[#111827]">{c.fullName}</td>
                          <td className="py-2 px-3 font-mono text-[11px] text-[#4B5563]">
                            {c.email}
                          </td>
                          <td className="py-2 px-3">
                            <Badge variant="default" size="sm">
                              Pegawai
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: PROGRESS */}
          {step === 'account-progress' && accountSummary && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-5 h-5 border-2 border-[#F97316] border-t-transparent rounded-full animate-spin shrink-0" />
                    <span className="text-sm font-bold text-[#111827]">
                      Membuat & Mengaitkan Akun Pegawai...
                    </span>
                  </div>
                  <span className="text-xs font-mono font-semibold text-[#EA580C]">
                    Batch {accountSummary.completedChunks} / {accountSummary.totalChunks}
                  </span>
                </div>

                <div className="w-full h-2.5 bg-[#E5E7EB] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#F97316] transition-all duration-300"
                    style={{
                      width: `${
                        accountSummary.totalChunks > 0
                          ? Math.round(
                              (accountSummary.completedChunks / accountSummary.totalChunks) * 100
                            )
                          : 0
                      }%`,
                    }}
                  />
                </div>

                <p className="text-[11px] text-[#6B7280]">
                  Jangan menutup jendela ini hingga seluruh batch selesai diproses. Berhasil:{' '}
                  <span className="font-bold text-emerald-700">{accountSummary.createdCount}</span>
                  {' · '}Gagal:{' '}
                  <span className="font-bold text-red-700">
                    {accountSummary.failedCount + accountSummary.reconciliationRequiredCount}
                  </span>
                </p>
              </div>

              {Object.keys(accountSummary.resultsByEmployeeId).length > 0 && (
                <div className="border border-[#E5E7EB] rounded-xl overflow-hidden">
                  <div className="px-3.5 py-2 bg-[#F9FAFB] border-b border-[#E5E7EB] text-[11px] font-bold text-[#374151]">
                    Status Sementara Per Pegawai (
                    {Object.keys(accountSummary.resultsByEmployeeId).length} Diproses)
                  </div>
                  <div className="overflow-x-auto max-h-[220px]">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="sticky top-0 bg-[#F9FAFB] border-b border-[#E5E7EB] text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">
                        <tr>
                          <th className="py-2 px-3">Nama & Email</th>
                          <th className="py-2 px-3 w-44">Status</th>
                          <th className="py-2 px-3">Keterangan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E5E7EB] bg-white">
                        {Object.values(accountSummary.resultsByEmployeeId).map((item) => {
                          const badgeInfo = getBulkAccountStatusBadge(item.status, item.retryable);
                          return (
                            <tr key={item.employeeId}>
                              <td className="py-2 px-3">
                                <div className="font-semibold text-[#111827]">{item.fullName}</div>
                                <div className="text-[11px] text-[#6B7280] font-mono">
                                  {item.email || '—'}
                                </div>
                              </td>
                              <td className="py-2 px-3 whitespace-nowrap">
                                <Badge variant={badgeInfo.variant} size="sm">
                                  {badgeInfo.label}
                                </Badge>
                              </td>
                              <td className="py-2 px-3 text-[11px] text-[#4B5563]">
                                {item.message}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 7: FINAL UNIFIED REPORT */}
          {step === 'account-report' && importResult && accountSummary && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] flex items-start gap-3">
                {accountSummary.failedCount === 0 &&
                accountSummary.reconciliationRequiredCount === 0 ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <p className="text-sm font-bold text-[#111827]">
                    Proses Impor & Pembuatan Akun Selesai
                  </p>
                  <p className="text-[11px] text-[#6B7280] leading-relaxed">
                    Seluruh kata sandi awal telah dibersihkan dari memori aplikasi. Akun baru wajib mengganti kata sandi pada saat login pertama.
                  </p>
                </div>
              </div>

              {accountSummary.chunkErrors.length > 0 && (() => {
                const uniqueChunkMessages = deduplicateChunkErrorMessages(
                  accountSummary.chunkErrors
                ).filter((msg) => msg !== errorMessage);
                const unsentBatches = Math.max(
                  0,
                  accountSummary.totalChunks - accountSummary.completedChunks
                );

                if (uniqueChunkMessages.length === 0 && unsentBatches === 0) {
                  return null;
                }

                return (
                  <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-800">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div className="space-y-1 flex-1">
                      <p className="font-bold text-red-900">
                        Kendala Pemrosesan Batch ({accountSummary.chunkErrors.length} Batch)
                      </p>
                      {uniqueChunkMessages.length > 0 && (
                        <ul className="list-disc pl-4 space-y-0.5 text-[11px] leading-relaxed">
                          {uniqueChunkMessages.map((msg, idx) => (
                            <li key={idx}>{msg}</li>
                          ))}
                        </ul>
                      )}
                      {unsentBatches > 0 && (
                        <p className="text-[11px] font-medium text-red-700">
                          Pengiriman {unsentBatches} batch berikutnya dihentikan. Pegawai pada batch yang belum dikirim belum diproses.
                        </p>
                      )}
                    </div>
                  </div>
                );
              })()}

              {accountSummary.reconciliationRequiredCount > 0 && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-800">
                  <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">
                      {accountSummary.reconciliationRequiredCount} Pegawai Memerlukan Rekonsiliasi Manual
                    </p>
                    <p className="text-[11px] mt-0.5 leading-relaxed">
                      Terjadi kegagalan pengaitan dan pembatalan akun Auth tidak tuntas. Baris tersebut tidak dapat dicoba ulang otomatis untuk mencegah akun ganda. Periksa di menu Pengguna & Data Pegawai.
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                    Akun Dibuat
                  </span>
                  <p className="text-lg font-bold text-emerald-700 mt-0.5">
                    {accountSummary.createdCount}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
                    Sudah Tertaut
                  </span>
                  <p className="text-lg font-bold text-[#374151] mt-0.5">
                    {accountSummary.alreadyLinkedCount}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-[#FFEDD5]/60 border border-orange-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#EA580C]">
                    Auth Ada / Dilewati
                  </span>
                  <p className="text-lg font-bold text-[#EA580C] mt-0.5">
                    {accountSummary.authExistsCount + accountSummary.ineligibleCount}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-red-50/70 border border-red-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-red-700">
                    Gagal / Rekonsiliasi
                  </span>
                  <p className="text-lg font-bold text-red-700 mt-0.5">
                    {accountSummary.failedCount + accountSummary.reconciliationRequiredCount}
                  </p>
                </div>
              </div>

              {/* Retry Section ONLY for safely retryable failed rows */}
              {retryableEmployeeIds.length > 0 && (
                <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-3">
                  <div className="flex items-start gap-2.5">
                    <RefreshCw className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-amber-950">
                        Coba Ulang {retryableEmployeeIds.length} Pegawai yang Gagal
                      </p>
                      <p className="text-[11px] text-amber-900 leading-relaxed">
                        Hanya baris yang gagal dan aman dicoba ulang yang akan diproses. Pegawai yang sudah berhasil, sudah tertaut, atau memerlukan rekonsiliasi tidak akan diulang. Masukkan kata sandi awal untuk percobaan ulang:
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="relative">
                      <input
                        type={showRetryPassword ? 'text' : 'password'}
                        value={retryPassword}
                        onChange={(e) => setRetryPassword(e.target.value)}
                        placeholder="Kata sandi awal (min. 6 karakter)"
                        autoComplete="new-password"
                        className="w-full h-9 pl-3 pr-9 text-xs bg-white border border-amber-300 rounded-xl focus:outline-none focus:border-[#F97316] text-[#111827]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRetryPassword((v) => !v)}
                        aria-label={
                          showRetryPassword
                            ? 'Sembunyikan kata sandi retry'
                            : 'Tampilkan kata sandi retry'
                        }
                        className="absolute right-2.5 top-2 text-[#9CA3AF] hover:text-[#4B5563] cursor-pointer"
                      >
                        {showRetryPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    <div className="relative">
                      <input
                        type={showConfirmRetryPassword ? 'text' : 'password'}
                        value={confirmRetryPassword}
                        onChange={(e) => setConfirmRetryPassword(e.target.value)}
                        placeholder="Konfirmasi kata sandi awal"
                        autoComplete="new-password"
                        className="w-full h-9 pl-3 pr-9 text-xs bg-white border border-amber-300 rounded-xl focus:outline-none focus:border-[#F97316] text-[#111827]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmRetryPassword((v) => !v)}
                        aria-label={
                          showConfirmRetryPassword
                            ? 'Sembunyikan konfirmasi retry'
                            : 'Tampilkan konfirmasi retry'
                        }
                        className="absolute right-2.5 top-2 text-[#9CA3AF] hover:text-[#4B5563] cursor-pointer"
                      >
                        {showConfirmRetryPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={handleRetryFailedAccounts}
                      isLoading={isRetryingAccounts}
                      disabled={isRetryingAccounts}
                      leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                    >
                      Coba Lagi {retryableEmployeeIds.length} Baris Gagal
                    </Button>
                  </div>
                </div>
              )}

              {/* Unified Report Table */}
              <div className="border border-[#E5E7EB] rounded-xl overflow-hidden">
                <div className="overflow-x-auto max-h-[280px]">
                  <table className="w-full text-left border-collapse min-w-[700px] text-xs">
                    <thead className="sticky top-0 bg-[#F9FAFB] border-b border-[#E5E7EB] text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3 w-14 text-center">Baris</th>
                        <th className="py-2.5 px-3">Nama & Email</th>
                        <th className="py-2.5 px-3 w-36">Status Impor</th>
                        <th className="py-2.5 px-3 w-44">Status Akun</th>
                        <th className="py-2.5 px-3">Keterangan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E7EB] bg-white">
                      {importResult.results.map((row) => {
                        const accRes = row.employeeId
                          ? accountSummary.resultsByEmployeeId[row.employeeId]
                          : undefined;
                        const badgeInfo = accRes
                          ? getBulkAccountStatusBadge(accRes.status, accRes.retryable)
                          : null;

                        return (
                          <tr key={`${row.excelRowNumber}-${row.email}`}>
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-[#6B7280]">
                              {row.excelRowNumber}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-semibold text-[#111827]">{row.fullName}</div>
                              <div className="text-[11px] text-[#6B7280] font-mono">
                                {row.email || '—'}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              {row.status === 'imported' && (
                                <Badge variant="success" size="sm">
                                  Berhasil
                                </Badge>
                              )}
                              {row.status === 'imported_with_warning' && (
                                <Badge variant="warning" size="sm">
                                  Berhasil (Peringatan)
                                </Badge>
                              )}
                              {row.status === 'failed' && (
                                <Badge variant="danger" size="sm">
                                  Gagal DB
                                </Badge>
                              )}
                              {row.status === 'skipped' && (
                                <Badge variant="default" size="sm">
                                  Dilewati
                                </Badge>
                              )}
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              {badgeInfo ? (
                                <Badge variant={badgeInfo.variant} size="sm">
                                  {badgeInfo.label}
                                </Badge>
                              ) : (
                                <span className="text-[11px] text-[#9CA3AF]">
                                  Tidak Diproses
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-[11px] leading-relaxed text-[#4B5563]">
                              {accRes?.message || row.errorReason || row.warnings.join('; ') || '—'}
                            </td>
                          </tr>
                        );
                      })}
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
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSafeClose}
                >
                  {importResult.importedCount > 0 ? 'Selesai Tanpa Buat Akun' : 'Selesai'}
                </Button>
                {importResult.importedCount > 0 && (
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={handleProceedToAccountPrep}
                    rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                  >
                    Lanjut Buat Akun Pegawai
                  </Button>
                )}
              </div>
            </>
          )}

          {step === 'account-prep' && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setErrorMessage(null);
                  setStep('result');
                }}
                leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
              >
                Kembali ke Hasil Impor
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSafeClose}
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  disabled={selectedCandidates.length === 0}
                  onClick={handleProceedToConfirmAccounts}
                  rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                >
                  Lanjut Konfirmasi ({selectedCandidates.length} Akun)
                </Button>
              </div>
            </>
          )}

          {step === 'account-confirm' && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isCreatingAccounts}
                onClick={() => {
                  setErrorMessage(null);
                  setStep('account-prep');
                }}
                leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
              >
                Ubah Pilihan / Kata Sandi
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isCreatingAccounts}
                  onClick={handleSafeClose}
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  isLoading={isCreatingAccounts}
                  disabled={isCreatingAccounts || selectedCandidates.length === 0}
                  onClick={handleExecuteBulkAccountCreation}
                  leftIcon={<Check className="w-3.5 h-3.5" />}
                >
                  Konfirmasi & Buat {selectedCandidates.length} Akun
                </Button>
              </div>
            </>
          )}

          {step === 'account-progress' && (
            <>
              <span className="text-[11px] text-[#6B7280]">
                Sedang memproses batch ke server...
              </span>
              <Button type="button" variant="outline" size="sm" disabled>
                Menunggu Selesai
              </Button>
            </>
          )}

          {step === 'account-report' && importResult && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownloadResultReport}
                leftIcon={<Download className="w-3.5 h-3.5 text-[#F97316]" />}
              >
                Unduh Laporan Akhir (.xlsx)
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
