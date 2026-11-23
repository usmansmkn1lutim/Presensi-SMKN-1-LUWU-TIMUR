import { EmployeeStatus, Gender } from './database.types';

export const EMPLOYEE_IMPORT_SHEET_NAME = 'Template_Impor_Pegawai';
export const EMPLOYEE_IMPORT_GUIDE_SHEET_NAME = 'Petunjuk_dan_Referensi';

export const EMPLOYEE_IMPORT_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const EMPLOYEE_IMPORT_MAX_ROWS = 500;

export const EMPLOYEE_IMPORT_HEADERS = [
  'Nama Lengkap & Gelar',
  'NIP',
  'NIK',
  'Nomor Pegawai / ID Internal',
  'Jenis Kelamin',
  'Jenis Kepegawaian',
  'Departemen / Unit Kerja',
  'Jabatan / Tugas Pokok',
  'Tanggal Bergabung',
  'Status Keaktifan',
  'Nomor Telepon / WhatsApp',
  'Alamat Email',
  'Catatan Tambahan',
] as const;

export type EmployeeImportHeader = (typeof EMPLOYEE_IMPORT_HEADERS)[number];

export type ImportRowValidationStatus = 'valid' | 'warning' | 'rejected';

export interface ParsedEmployeeImportRawRow {
  excelRowNumber: number;
  fullName: string;
  nip: string;
  nik: string;
  employeeNumber: string;
  gender: string;
  employeeType: string;
  departmentName: string;
  positionName: string;
  joinDateRaw: string | number | Date | null;
  joinDateFormatHint?: string;
  status: string;
  phone: string;
  email: string;
  notes: string;
  cellErrors: string[];
}

export interface NormalizedEmployeeImportPayload {
  full_name: string;
  nip: string | null;
  nik: string | null;
  employee_number: string | null;
  gender: Gender | null;
  employee_type: string;
  department_id: string | null;
  position_id: string | null;
  join_date: string | null;
  status: EmployeeStatus;
  phone: string | null;
  email: string;
  notes: string | null;
  profile_id: null;
}

export interface ValidatedEmployeeImportRow {
  excelRowNumber: number;
  raw: ParsedEmployeeImportRawRow;
  normalized: NormalizedEmployeeImportPayload | null;
  validationStatus: ImportRowValidationStatus;
  errors: string[];
  warnings: string[];
  existsInAuth: boolean;
  resolvedDepartmentName: string | null;
  resolvedPositionName: string | null;
}

export interface AuthEmailCheckResultItem {
  email: string;
  existsInAuth: boolean;
}

export interface AuthEmailCheckResponse {
  success: boolean;
  message?: string;
  results: AuthEmailCheckResultItem[];
}

export type AuthCheckExecutionStatus = 'idle' | 'checked' | 'unavailable';

export interface WorkbookValidationSummary {
  fileName: string;
  fileSizeBytes: number;
  totalRows: number;
  validCount: number;
  warningCount: number;
  rejectedCount: number;
  importableCount: number;
  authCheckStatus: AuthCheckExecutionStatus;
  authCheckNotice: string | null;
  rows: ValidatedEmployeeImportRow[];
}

export interface EmployeeImportServerRowInput {
  excelRowNumber: number;
  full_name: string;
  nip: string | null;
  nik: string | null;
  employee_number: string | null;
  gender: Gender | null;
  employee_type: string;
  department_name: string | null;
  position_name: string | null;
  join_date: string | null;
  status: EmployeeStatus;
  phone: string | null;
  email: string;
  notes: string | null;
}

export const BULK_ACCOUNT_CHUNK_SIZE = 20;

export type BulkAccountCreationItemStatus =
  | 'created'
  | 'already_linked'
  | 'auth_exists'
  | 'ineligible'
  | 'failed'
  | 'reconciliation_required';

export interface EmployeeImportRowExecutionResult {
  excelRowNumber: number;
  fullName: string;
  email: string;
  status: 'imported' | 'imported_with_warning' | 'failed' | 'skipped';
  employeeId: string | null;
  employeeStatus?: EmployeeStatus | null;
  existsInAuth?: boolean;
  warnings: string[];
  errorReason: string | null;
  accountCreationStatus?: BulkAccountCreationItemStatus | null;
  accountCreationMessage?: string | null;
}

export interface BulkEmployeeImportSummaryResponse {
  success: boolean;
  message: string;
  totalProcessed: number;
  importedCount: number;
  importedCleanCount: number;
  importedWithWarningCount: number;
  failedCount: number;
  skippedCount: number;
  authCheckStatus?: AuthCheckExecutionStatus;
  results: EmployeeImportRowExecutionResult[];
}

export interface EmployeeAccountCandidate {
  excelRowNumber: number;
  employeeId: string | null;
  fullName: string;
  email: string;
  importStatus: EmployeeImportRowExecutionResult['status'];
  employeeStatus: EmployeeStatus | null;
  existsInAuth: boolean;
  eligible: boolean;
  ineligibleReason: string | null;
  selected: boolean;
}

export interface BulkCreateEmployeeAccountsRequest {
  employeeIds: string[];
  password: string;
}

export interface BulkCreateEmployeeAccountRowResult {
  employeeId: string;
  fullName: string;
  email: string;
  status: BulkAccountCreationItemStatus;
  profileId: string | null;
  retryable: boolean;
  needsReconciliation: boolean;
  message: string;
}

export interface BulkCreateEmployeeAccountsChunkResponse {
  success: boolean;
  message: string;
  totalProcessed: number;
  createdCount: number;
  alreadyLinkedCount: number;
  authExistsCount: number;
  ineligibleCount: number;
  failedCount: number;
  reconciliationRequiredCount: number;
  results: BulkCreateEmployeeAccountRowResult[];
}

export interface BulkCreateAccountChunkError {
  chunkIndex: number;
  employeeIds: string[];
  message: string;
}

export interface BulkCreateAccountsAggregatedSummary {
  totalAttempted: number;
  createdCount: number;
  alreadyLinkedCount: number;
  authExistsCount: number;
  ineligibleCount: number;
  failedCount: number;
  reconciliationRequiredCount: number;
  completedChunks: number;
  totalChunks: number;
  chunkErrors: BulkCreateAccountChunkError[];
  resultsByEmployeeId: Record<string, BulkCreateEmployeeAccountRowResult>;
}

