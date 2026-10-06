export interface GeneralSettings {
  appName: string;
  appDesc: string;
  schoolName: string;
  schoolAddress: string;
  schoolLogo: string | null; // object URL or base64 data url for preview
}

export interface AttendanceSettings {
  timezone: string; // Asia/Makassar (WITA)
  lateTolerance: number; // in minutes
  gpsValidation: boolean;
  defaultRadius: number; // in meters
}

export interface AppearanceSettings {
  theme: 'system' | 'light' | 'dark';
  accentColor: 'orange' | 'blue' | 'emerald' | 'indigo';
  displayDensity: 'comfortable' | 'standard' | 'compact';
}

export interface NotificationSettings {
  attendanceNotif: boolean;
  requestNotif: boolean;
  systemNotif: boolean;
}

export interface SystemInfo {
  appVersion: string;
  environment: string;
  sysTimezone: string;
  backendStatus: string;
  database: string;
}

export interface SecurityInfo {
  auditLogStatus: string;
  sessionSec: string;
  roleMgmt: string;
}

export interface SystemSettingsState {
  general: GeneralSettings;
  attendance: AttendanceSettings;
  appearance: AppearanceSettings;
  notification: NotificationSettings;
  system: SystemInfo;
  security: SecurityInfo;
}

export type SettingsCategory = 'umum' | 'presensi' | 'tampilan' | 'notifikasi' | 'sistem' | 'keamanan';
