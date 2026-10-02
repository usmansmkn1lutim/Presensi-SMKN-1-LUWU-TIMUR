import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  EmployeeRow,
  DepartmentRow,
  PositionRow,
} from '../types/database.types';

export interface EmployeeWithRelations extends EmployeeRow {
  departments?: DepartmentRow | null;
  positions?: PositionRow | null;
}

/**
 * Employee Service (Phase 2 Foundation)
 * Encapsulates core query operations for employees, departments, and positions.
 * Full CRUD and management mutations will be implemented in Phase 6.
 */
class EmployeeService {
  /**
   * Fetch employee record associated with a profile UUID.
   */
  async getEmployeeByProfileId(profileId: string): Promise<EmployeeWithRelations | null> {
    if (!isSupabaseConfigured()) {
      return null;
    }

    const { data, error } = await supabase
      .from('employees')
      .select('*, departments(*), positions(*)')
      .eq('profile_id', profileId)
      .single();

    if (error) {
      console.warn('EmployeeService.getEmployeeByProfileId error:', error.message);
      return null;
    }

    return (data as unknown) as EmployeeWithRelations;
  }

  /**
   * Fetch single employee by employee table UUID.
   */
  async getEmployeeById(employeeId: string): Promise<EmployeeWithRelations | null> {
    if (!isSupabaseConfigured()) {
      return null;
    }

    const { data, error } = await supabase
      .from('employees')
      .select('*, departments(*), positions(*)')
      .eq('id', employeeId)
      .single();

    if (error) {
      console.warn('EmployeeService.getEmployeeById error:', error.message);
      return null;
    }

    return (data as unknown) as EmployeeWithRelations;
  }

  /**
   * List active employees for directory.
   */
  async getEmployees(params?: {
    departmentId?: string;
    searchQuery?: string;
  }): Promise<EmployeeWithRelations[]> {
    if (!isSupabaseConfigured()) {
      return [];
    }

    let query = supabase
      .from('employees')
      .select('*, departments(*), positions(*)')
      .eq('status', 'active')
      .order('full_name', { ascending: true });

    if (params?.departmentId) {
      query = query.eq('department_id', params.departmentId);
    }

    if (params?.searchQuery) {
      query = query.ilike('full_name', `%${params.searchQuery}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.warn('EmployeeService.getEmployees error:', error.message);
      return [];
    }

    return ((data as unknown) as EmployeeWithRelations[]) || [];
  }

  /**
   * List all master departments.
   */
  async getDepartments(): Promise<DepartmentRow[]> {
    if (!isSupabaseConfigured()) {
      return [];
    }

    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      console.warn('EmployeeService.getDepartments error:', error.message);
      return [];
    }

    return data || [];
  }

  /**
   * List all master positions.
   */
  async getPositions(): Promise<PositionRow[]> {
    if (!isSupabaseConfigured()) {
      return [];
    }

    const { data, error } = await supabase
      .from('positions')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      console.warn('EmployeeService.getPositions error:', error.message);
      return [];
    }

    return data || [];
  }
}

export const employeeService = new EmployeeService();
