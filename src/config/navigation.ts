import { NavItem } from '../types/navigation';
import { UserRole } from '../types/auth';

export const NAVIGATION_ITEMS: NavItem[] = [
  // SECTION: UTAMA (Main)
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard',
    iconName: 'Home',
    allowedRoles: ['super_admin', 'admin', 'headmaster', 'employee'],
    section: 'main',
    description: 'Ringkasan presensi & status harian',
  },
  {
    id: 'attendance',
    label: 'Presensi',
    path: '/attendance',
    iconName: 'QrCode',
    allowedRoles: ['super_admin', 'admin', 'headmaster', 'employee'],
    section: 'main',
    description: 'Catat kehadiran masuk & pulang',
  },
  {
    id: 'history',
    label: 'Riwayat',
    path: '/history',
    iconName: 'CalendarCheck',
    allowedRoles: ['super_admin', 'employee'],
    section: 'main',
    description: 'Daftar riwayat presensi pribadi',
  },
  {
    id: 'requests',
    label: 'Pengajuan',
    path: '/requests',
    iconName: 'FileText',
    allowedRoles: ['super_admin', 'admin', 'headmaster', 'employee'],
    section: 'main',
    description: 'Pengajuan izin, sakit, dinas luar, cuti',
  },
  {
    id: 'notifications',
    label: 'Notifikasi',
    path: '/notifications',
    iconName: 'Bell',
    allowedRoles: ['super_admin', 'admin', 'headmaster', 'employee'],
    section: 'main',
    description: 'Pemberitahuan & pengumuman sekolah',
  },
  {
    id: 'profile',
    label: 'Profil Saya',
    path: '/profile',
    iconName: 'User',
    allowedRoles: ['super_admin', 'admin', 'headmaster', 'employee'],
    section: 'main',
    description: 'Data akun & kepegawaian',
  },

  // SECTION: MANAJEMEN SEKOLAH (Management)
  {
    id: 'employees',
    label: 'Data Pegawai',
    path: '/employees',
    iconName: 'Users',
    allowedRoles: ['super_admin', 'admin', 'headmaster'],
    section: 'management',
    description: 'Manajemen guru & staf sekolah',
  },
  {
    id: 'schedules',
    label: 'Jadwal Kerja',
    path: '/schedules',
    iconName: 'Clock',
    allowedRoles: ['super_admin', 'admin'],
    section: 'management',
    description: 'Pengaturan jam kerja & shift guru',
  },
  {
    id: 'locations',
    label: 'Lokasi',
    path: '/locations',
    iconName: 'MapPin',
    allowedRoles: ['super_admin', 'admin', 'headmaster'],
    section: 'management',
    description: 'Kelola titik koordinat dan radius presensi',
  },
  {
    id: 'holidays',
    label: 'Hari Libur',
    path: '/holidays',
    iconName: 'CalendarOff',
    allowedRoles: ['super_admin', 'admin'],
    section: 'management',
    description: 'Kalender libur nasional & akademik',
  },
  {
    id: 'reports',
    label: 'Rekap & Laporan',
    path: '/reports',
    iconName: 'BarChart3',
    allowedRoles: ['super_admin', 'admin', 'headmaster'],
    section: 'management',
    description: 'Ekspor rekapitulasi kehadiran bulanan',
  },

  // SECTION: SISTEM (System)
  {
    id: 'users',
    label: 'Manajemen Pengguna',
    path: '/users',
    iconName: 'UserCheck',
    allowedRoles: ['super_admin', 'admin'],
    section: 'system',
    description: 'Kelola akun, peran, dan status pengguna',
  },
  {
    id: 'audit-logs',
    label: 'Audit Log',
    path: '/audit-logs',
    iconName: 'ShieldAlert',
    allowedRoles: ['super_admin', 'admin'],
    section: 'system',
    description: 'Catatan aktivitas & perubahan data',
  },
  {
    id: 'settings',
    label: 'Pengaturan',
    path: '/settings',
    iconName: 'Settings',
    allowedRoles: ['super_admin', 'admin'],
    section: 'system',
    description: 'Konfigurasi sistem presensi',
  },
];

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  employee: [
    '/dashboard',
    '/attendance',
    '/history',
    '/requests',
    '/notifications',
    '/profile',
  ],
  headmaster: [
    '/dashboard',
    '/attendance',
    '/employees',
    '/locations',
    '/requests',
    '/reports',
    '/notifications',
    '/profile',
  ],
  admin: [
    '/dashboard',
    '/attendance',
    '/employees',
    '/requests',
    '/schedules',
    '/locations',
    '/holidays',
    '/reports',
    '/users',
    '/audit-logs',
    '/settings',
    '/notifications',
    '/profile',
  ],
  super_admin: [
    '/dashboard',
    '/attendance',
    '/history',
    '/requests',
    '/notifications',
    '/profile',
    '/employees',
    '/schedules',
    '/locations',
    '/holidays',
    '/reports',
    '/users',
    '/audit-logs',
    '/settings',
  ],
};

export const getNavItemsForRole = (role: UserRole): NavItem[] => {
  const allowedPaths = ROLE_PERMISSIONS[role] || [];
  return NAVIGATION_ITEMS.filter((item) => allowedPaths.includes(item.path));
};

export const canUserAccessPath = (role: UserRole, path: string): boolean => {
  const allowedPaths = ROLE_PERMISSIONS[role] || [];
  if (allowedPaths.includes(path)) return true;
  if (path.startsWith('/employees/')) {
    return allowedPaths.includes('/employees');
  }
  return false;
};
