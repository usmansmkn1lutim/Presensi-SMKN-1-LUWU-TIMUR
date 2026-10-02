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
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      record_last_login: {
        Args: Record<PropertyKey, never>;
        Returns: void;
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
