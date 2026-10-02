import { UserRole } from './auth';

export type NavSection = 'main' | 'management' | 'system';

export interface NavItem {
  id: string;
  label: string;
  path: string;
  iconName: string;
  allowedRoles: UserRole[];
  section: NavSection;
  badge?: string;
  description?: string;
}
