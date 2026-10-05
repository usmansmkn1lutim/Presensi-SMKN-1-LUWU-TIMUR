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
export type CheckInStatus = 'on_time' | 'late';
export type CheckOutStatus = 'operational' | 'after_work';

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
      attendance: {
        Row: {
          id: string;
          employee_id: string;
          attendance_date: string;
          check_in_at: string | null;
          check_out_at: string | null;
          check_in_status: CheckInStatus | null;
          check_out_status: CheckOutStatus | null;
          check_in_location_id: string | null;
          check_out_location_id: string | null;
          check_in_latitude: number | null;
          check_in_longitude: number | null;
          check_out_latitude: number | null;
          check_out_longitude: number | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          employee_id: string;
          attendance_date: string;
          check_in_at?: string | null;
          check_out_at?: string | null;
          check_in_status?: CheckInStatus | null;
          check_out_status?: CheckOutStatus | null;
          check_in_location_id?: string | null;
          check_out_location_id?: string | null;
          check_in_latitude?: number | null;
          check_in_longitude?: number | null;
          check_out_latitude?: number | null;
          check_out_longitude?: number | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          employee_id?: string;
          attendance_date?: string;
          check_in_at?: string | null;
          check_out_at?: string | null;
          check_in_status?: CheckInStatus | null;
          check_out_status?: CheckOutStatus | null;
          check_in_location_id?: string | null;
          check_out_location_id?: string | null;
          check_in_latitude?: number | null;
          check_in_longitude?: number | null;
          check_out_latitude?: number | null;
          check_out_longitude?: number | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'attendance_employee_id_fkey';
            columns: ['employee_id'];
            referencedRelation: 'employees';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'attendance_check_in_location_id_fkey';
            columns: ['check_in_location_id'];
            referencedRelation: 'locations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'attendance_check_out_location_id_fkey';
            columns: ['check_out_location_id'];
            referencedRelation: 'locations';
            referencedColumns: ['id'];
          }
        ];
      };
      requests: {
        Row: {
          id: string;
          employee_id: string;
          request_type: 'leave' | 'sick' | 'official_duty' | 'other';
          start_date: string;
          end_date: string;
          reason: string;
          attachment_url: string | null;
          status: 'pending' | 'approved' | 'rejected' | 'cancelled';
          submitted_at: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
          reviewer_note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          employee_id: string;
          request_type: 'leave' | 'sick' | 'official_duty' | 'other';
          start_date: string;
          end_date: string;
          reason: string;
          attachment_url?: string | null;
          status?: 'pending' | 'approved' | 'rejected' | 'cancelled';
          submitted_at?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          reviewer_note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          employee_id?: string;
          request_type?: 'leave' | 'sick' | 'official_duty' | 'other';
          start_date?: string;
          end_date?: string;
          reason?: string;
          attachment_url?: string | null;
          status?: 'pending' | 'approved' | 'rejected' | 'cancelled';
          submitted_at?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          reviewer_note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'requests_employee_id_fkey';
            columns: ['employee_id'];
            referencedRelation: 'employees';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'requests_reviewed_by_fkey';
            columns: ['reviewed_by'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
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
      get_managed_users: {
        Args: Record<PropertyKey, never>;
        Returns: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          role: AppRole;
          is_active: boolean;
          last_login_at: string | null;
          created_at: string;
          updated_at: string;
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
      check_in: {
        Args: {
          user_latitude: number;
          user_longitude: number;
        };
        Returns: {
          attendance_id: string;
          attendance_date: string;
          check_in_at: string;
          check_in_status: string;
          location_id: string;
          location_name: string;
          distance_meters: number;
        }[];
      };
      check_out: {
        Args: {
          user_latitude: number;
          user_longitude: number;
        };
        Returns: {
          attendance_id: string;
          attendance_date: string;
          check_in_at: string;
          check_out_at: string;
          check_out_status: string;
          location_id: string;
          location_name: string;
          distance_meters: number;
        }[];
      };
      create_my_request: {
        Args: {
          p_request_type: string;
          p_start_date: string;
          p_end_date: string;
          p_reason: string;
          p_attachment_url?: string | null;
        };
        Returns: Database['public']['Tables']['requests']['Row'];
      };
      cancel_my_request: {
        Args: {
          p_request_id: string;
        };
        Returns: Database['public']['Tables']['requests']['Row'];
      };
      approve_request: {
        Args: {
          p_request_id: string;
          p_reviewer_note?: string | null;
        };
        Returns: Database['public']['Tables']['requests']['Row'];
      };
      reject_request: {
        Args: {
          p_request_id: string;
          p_reviewer_note?: string | null;
        };
        Returns: Database['public']['Tables']['requests']['Row'];
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
