import { HolidayType as DbHolidayType } from './database.types';

export type HolidayType = DbHolidayType;

export interface HolidayModel {
  id: string;
  name: string;
  holidayDate: string; // 'YYYY-MM-DD'
  holidayType: HolidayType;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface HolidayFilters {
  year?: number;
  holidayType?: HolidayType | 'all';
  isActive?: boolean | 'all';
  search?: string;
}

export interface CreateHolidayInput {
  name: string;
  holiday_date: string;
  holiday_type: HolidayType;
  description?: string | null;
  is_active?: boolean;
}

export interface UpdateHolidayInput {
  name?: string;
  holiday_date?: string;
  holiday_type?: HolidayType;
  description?: string | null;
  is_active?: boolean;
}

export const HOLIDAY_TYPE_CONFIG: Record<
  HolidayType,
  { label: string; badgeClass: string; dotClass: string }
> = {
  national: {
    label: 'Nasional',
    badgeClass: 'bg-red-50 text-red-700 border-red-200',
    dotClass: 'bg-red-500',
  },
  collective_leave: {
    label: 'Cuti Bersama',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    dotClass: 'bg-amber-500',
  },
  school: {
    label: 'Sekolah',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    dotClass: 'bg-blue-500',
  },
  special: {
    label: 'Khusus',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    dotClass: 'bg-purple-500',
  },
  other: {
    label: 'Lainnya',
    badgeClass: 'bg-zinc-100 text-zinc-700 border-zinc-200',
    dotClass: 'bg-zinc-500',
  },
};
