import {
  EmployeeRow,
  EmployeeInsert,
  EmployeeUpdate,
  DepartmentRow,
  PositionRow,
  ProfileRow,
  EmployeeStatus,
  Gender,
} from './database.types';

export type { EmployeeStatus, Gender };

export interface EmployeeWithRelations extends EmployeeRow {
  departments?: DepartmentRow | null;
  positions?: PositionRow | null;
  profiles?: ProfileRow | null;
}

export interface EmployeeFilterParams {
  searchQuery?: string;
  status?: 'all' | 'active' | 'inactive';
  departmentId?: string;
  positionId?: string;
  employeeType?: string;
}

export interface EmployeeStats {
  total: number;
  active: number;
  inactive: number;
  linkedToAccount: number;
}

export interface EmployeeFormData {
  full_name: string;
  nip: string;
  nik: string;
  employee_number: string;
  gender: Gender | '';
  employee_type: string;
  position_id: string;
  department_id: string;
  phone: string;
  email: string;
  photo_url: string;
  join_date: string;
  status: EmployeeStatus;
  notes: string;
  profile_id?: string | null;
}

export const COMMON_EMPLOYEE_TYPES = [
  'PNS',
  'PPPK',
  'GTT (Guru Tidak Tetap)',
  'PTT (Pegawai Tidak Tetap)',
  'Honorer Sekolah',
  'Tenaga Kependidikan',
  'Guru Tetap Yayasan',
  'Lainnya',
];
