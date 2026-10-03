export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type AppRole =
  | 'super_admin'
  | 'admin'
  | 'headmaster'
  | 'employee';

export type EmployeeStatus = 'active' | 'inactive';
export type Gender = 'male' | 'female';
export type LocationType = 'office' | 'teacher_room' | 'laboratory' | 'other';
export type HolidayType = 'national' | 'collective_leave' | 'school' | 'special' | 'other';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          role: AppRole;
          is_active: boolean;
          last_login_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: AppRole;
          is_active?: boolean;
          last_login_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: AppRole;
          is_active?: boolean;
          last_login_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'profiles_id_fkey';
            columns: ['id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      departments: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      positions: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      employees: {
        Row: {
          id: string;
          profile_id: string | null;
          nip: string | null;
          nik: string | null;
          employee_number: string | null;
          full_name: string;
          gender: Gender | null;
          employee_type: string | null;
          position_id: string | null;
          department_id: string | null;
          phone: string | null;
          email: string | null;
          photo_url: string | null;
          join_date: string | null;
          status: EmployeeStatus;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id?: string | null;
          nip?: string | null;
          nik?: string | null;
          employee_number?: string | null;
          full_name: string;
          gender?: Gender | null;
          employee_type?: string | null;
          position_id?: string | null;
          department_id?: string | null;
          phone?: string | null;
          email?: string | null;
          photo_url?: string | null;
          join_date?: string | null;
          status?: EmployeeStatus;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string | null;
          nip?: string | null;
          nik?: string | null;
          employee_number?: string | null;
          full_name?: string;
          gender?: Gender | null;
          employee_type?: string | null;
          position_id?: string | null;
          department_id?: string | null;
          phone?: string | null;
          email?: string | null;
          photo_url?: string | null;
          join_date?: string | null;
          status?: EmployeeStatus;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'employees_profile_id_fkey';
            columns: ['profile_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'employees_department_id_fkey';
            columns: ['department_id'];
            referencedRelation: 'departments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'employees_position_id_fkey';
            columns: ['position_id'];
            referencedRelation: 'positions';
            referencedColumns: ['id'];
          }
        ];
      };
      locations: {
        Row: {
          id: string;
          name: string;
          code: string;
          description: string | null;
          location_type: LocationType;
          latitude: number | null;
          longitude: number | null;
          radius_meters: number;
          is_attendance_enabled: boolean;
          is_active: boolean;
          address: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          code: string;
          description?: string | null;
          location_type?: LocationType;
          latitude?: number | null;
          longitude?: number | null;
          radius_meters?: number;
          is_attendance_enabled?: boolean;
          is_active?: boolean;
          address?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          code?: string;
          description?: string | null;
          location_type?: LocationType;
          latitude?: number | null;
          longitude?: number | null;
          radius_meters?: number;
          is_attendance_enabled?: boolean;
          is_active?: boolean;
          address?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      holidays: {
        Row: {
          id: string;
          name: string;
          holiday_date: string;
          holiday_type: HolidayType;
          description: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          holiday_date: string;
          holiday_type: HolidayType;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          holiday_date?: string;
          holiday_type?: HolidayType;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      work_schedules: {
        Row: {
          id: string;
          name: string;
          code: string;
          description: string | null;
          check_in_start_time: string;
          check_in_on_time_end: string;
          check_in_end_time: string;
          work_start_time: string;
          operational_end_time: string;
          work_end_time: string;
          check_out_start_time: string;
          check_out_end_time: string;
          working_days: string[];
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          code: string;
          description?: string | null;
          check_in_start_time: string;
          check_in_on_time_end: string;
          check_in_end_time: string;
          work_start_time: string;
          operational_end_time: string;
          work_end_time: string;
          check_out_start_time: string;
          check_out_end_time: string;
          working_days: string[];
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          code?: string;
          description?: string | null;
          check_in_start_time?: string;
          check_in_on_time_end?: string;
          check_in_end_time?: string;
          work_start_time?: string;
          operational_end_time?: string;
          work_end_time?: string;
          check_out_start_time?: string;
          check_out_end_time?: string;
          working_days?: string[];
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      record_last_login: {
        Args: Record<PropertyKey, never>;
        Returns: void;
      };
      get_linkable_profiles: {
        Args: Record<PropertyKey, never>;
        Returns: {
          id: string;
          full_name: string | null;
          role: AppRole;
          is_active: boolean;
          last_login_at: string | null;
          avatar_url: string | null;
        }[];
      };
      is_holiday: {
        Args: {
          check_date: string;
        };
        Returns: boolean;
      };
      get_active_work_schedule: {
        Args: Record<PropertyKey, never>;
        Returns: Database['public']['Tables']['work_schedules']['Row'][];
      };
    };
    Enums: {
      app_role: AppRole;
      employee_status: EmployeeStatus;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

export type ProfileRow = Database['public']['Tables']['profiles']['Row'];
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

export type DepartmentRow = Database['public']['Tables']['departments']['Row'];
export type DepartmentInsert = Database['public']['Tables']['departments']['Insert'];
export type DepartmentUpdate = Database['public']['Tables']['departments']['Update'];

export type PositionRow = Database['public']['Tables']['positions']['Row'];
export type PositionInsert = Database['public']['Tables']['positions']['Insert'];
export type PositionUpdate = Database['public']['Tables']['positions']['Update'];

export type EmployeeRow = Database['public']['Tables']['employees']['Row'];
export type EmployeeInsert = Database['public']['Tables']['employees']['Insert'];
export type EmployeeUpdate = Database['public']['Tables']['employees']['Update'];

export type LocationRow = Database['public']['Tables']['locations']['Row'];
export type LocationInsert = Database['public']['Tables']['locations']['Insert'];
export type LocationUpdate = Database['public']['Tables']['locations']['Update'];

export type HolidayRow = Database['public']['Tables']['holidays']['Row'];
export type HolidayInsert = Database['public']['Tables']['holidays']['Insert'];
export type HolidayUpdate = Database['public']['Tables']['holidays']['Update'];

export type WorkScheduleRow = Database['public']['Tables']['work_schedules']['Row'];
export type WorkScheduleInsert = Database['public']['Tables']['work_schedules']['Insert'];
export type WorkScheduleUpdate = Database['public']['Tables']['work_schedules']['Update'];
