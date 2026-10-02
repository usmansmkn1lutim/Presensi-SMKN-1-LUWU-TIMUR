import { User, UserRole, LoginCredentials, AuthSession } from '../types/auth';

const STORAGE_KEY_USER = 'presensi_smk_user';
const STORAGE_KEY_TOKEN = 'presensi_smk_token';
const STORAGE_KEY_REMEMBER = 'presensi_smk_remember';

export const MOCK_USERS: Record<string, User> = {
  'usman@smkn1luwutimur.sch.id': {
    id: 'usr_emp_001',
    name: 'Usman, S.Pd., M.Pd.',
    email: 'usman@smkn1luwutimur.sch.id',
    role: 'employee',
    nip: '19850712 201001 1 014',
    position: 'Guru Produktif RPL',
    department: 'Teknik Komputer & Informatika',
    schoolName: 'SMK Negeri 1 Luwu Timur',
    status: 'active',
    joinedDate: '2010-01-01',
    phoneNumber: '+62 812-3456-7890',
  },
  'admin@smkn1luwutimur.sch.id': {
    id: 'usr_adm_002',
    name: 'Siti Rahmawati, S.Kom.',
    email: 'admin@smkn1luwutimur.sch.id',
    role: 'admin',
    nip: '19890315 201502 2 006',
    position: 'Administrator SIM Presensi',
    department: 'Bagian Tata Usaha & IT',
    schoolName: 'SMK Negeri 1 Luwu Timur',
    status: 'active',
    joinedDate: '2015-02-01',
    phoneNumber: '+62 821-9876-5432',
  },
  'kepala@smkn1luwutimur.sch.id': {
    id: 'usr_hdm_003',
    name: 'Drs. H. Baharuddin, M.M.',
    email: 'kepala@smkn1luwutimur.sch.id',
    role: 'headmaster',
    nip: '19680410 199412 1 002',
    position: 'Kepala Sekolah',
    department: 'Pimpinan Satuan Pendidikan',
    schoolName: 'SMK Negeri 1 Luwu Timur',
    status: 'active',
    joinedDate: '1994-12-01',
    phoneNumber: '+62 811-4567-8901',
  },
  'verifikator@smkn1luwutimur.sch.id': {
    id: 'usr_ver_004',
    name: 'Hj. Nurjannah, S.E.',
    email: 'verifikator@smkn1luwutimur.sch.id',
    role: 'verifier',
    nip: '19760822 200501 2 008',
    position: 'Verifikator Presensi & Izin',
    department: 'Kepegawaian & Tata Usaha',
    schoolName: 'SMK Negeri 1 Luwu Timur',
    status: 'active',
    joinedDate: '2005-01-01',
    phoneNumber: '+62 813-5566-7788',
  },
  'superadmin@smkn1luwutimur.sch.id': {
    id: 'usr_sup_005',
    name: 'Super Admin Sistem',
    email: 'superadmin@smkn1luwutimur.sch.id',
    role: 'super_admin',
    nip: '19900101 201801 1 001',
    position: 'Super Administrator',
    department: 'Dinas Pendidikan & IT Pusat',
    schoolName: 'SMK Negeri 1 Luwu Timur',
    status: 'active',
    joinedDate: '2018-01-01',
    phoneNumber: '+62 852-1122-3344',
  },
};

type AuthListener = (user: User | null) => void;

class AuthService {
  private listeners: Set<AuthListener> = new Set();
  private currentUser: User | null = null;
  private currentToken: string | null = null;

  constructor() {
    this.restoreSession();
  }

  private restoreSession(): void {
    try {
      const isRemembered = localStorage.getItem(STORAGE_KEY_REMEMBER) === 'true';
      const storage = isRemembered ? localStorage : sessionStorage;

      const rawUser = storage.getItem(STORAGE_KEY_USER);
      const rawToken = storage.getItem(STORAGE_KEY_TOKEN);

      if (rawUser && rawToken) {
        this.currentUser = JSON.parse(rawUser) as User;
        this.currentToken = rawToken;
      }
    } catch {
      this.currentUser = null;
      this.currentToken = null;
    }
  }

  public subscribe(listener: AuthListener): () => void {
    this.listeners.add(listener);
    // Immediately invoke with current state
    listener(this.currentUser);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener(this.currentUser));
  }

  public getCurrentUser(): User | null {
    return this.currentUser;
  }

  public getToken(): string | null {
    return this.currentToken;
  }

  public isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  public getSession(): AuthSession {
    return {
      user: this.currentUser,
      token: this.currentToken,
      isAuthenticated: this.isAuthenticated(),
    };
  }

  /**
   * Phase 1 Mock Login
   * Accepts credentials, verifies against mock accounts or generates demo employee
   */
  public async login(credentials: LoginCredentials): Promise<User> {
    const trimmedEmail = credentials.email.trim().toLowerCase();
    const { password, rememberMe = false } = credentials;

    // Simulate network delay for natural UI response
    await new Promise((resolve) => setTimeout(resolve, 600));

    if (!trimmedEmail) {
      throw new Error('Alamat email wajib diisi.');
    }

    if (!password) {
      throw new Error('Kata sandi wajib diisi.');
    }

    if (password.length < 6) {
      throw new Error('Kata sandi minimal 6 karakter.');
    }

    // Find mock user or allow registered test emails
    let matchedUser = MOCK_USERS[trimmedEmail];

    // If not in standard list, allow any valid email as a test employee
    if (!matchedUser) {
      if (!trimmedEmail.includes('@')) {
        throw new Error('Format email tidak valid.');
      }

      // Check if credentials match simple test pattern
      if (password === 'wrongpassword') {
        throw new Error('Email atau kata sandi tidak cocok.');
      }

      // Create guest employee for arbitrary test email
      const namePart = trimmedEmail.split('@')[0];
      const formattedName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
      matchedUser = {
        id: `usr_${Date.now()}`,
        name: formattedName,
        email: trimmedEmail,
        role: 'employee',
        nip: '19920101 202201 1 099',
        position: 'Guru Pengajar',
        department: 'Tenaga Pendidik',
        schoolName: 'SMK Negeri 1 Luwu Timur',
        status: 'active',
        joinedDate: '2022-01-01',
      };
    }

    const mockToken = `mock_jwt_token_${matchedUser.id}_${Date.now()}`;
    const storage = rememberMe ? localStorage : sessionStorage;

    if (rememberMe) {
      localStorage.setItem(STORAGE_KEY_REMEMBER, 'true');
    } else {
      localStorage.removeItem(STORAGE_KEY_REMEMBER);
      localStorage.removeItem(STORAGE_KEY_USER);
      localStorage.removeItem(STORAGE_KEY_TOKEN);
    }

    storage.setItem(STORAGE_KEY_USER, JSON.stringify(matchedUser));
    storage.setItem(STORAGE_KEY_TOKEN, mockToken);

    this.currentUser = matchedUser;
    this.currentToken = mockToken;
    this.notify();

    return matchedUser;
  }

  public async logout(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 200));

    localStorage.removeItem(STORAGE_KEY_USER);
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    localStorage.removeItem(STORAGE_KEY_REMEMBER);

    sessionStorage.removeItem(STORAGE_KEY_USER);
    sessionStorage.removeItem(STORAGE_KEY_TOKEN);

    this.currentUser = null;
    this.currentToken = null;
    this.notify();
  }

  /**
   * Helper to quickly switch roles during Phase 1 testing
   */
  public switchRole(role: UserRole): User {
    const targetUser = Object.values(MOCK_USERS).find((u) => u.role === role);
    if (!targetUser) {
      throw new Error(`Role ${role} tidak ditemukan.`);
    }

    const mockToken = `mock_jwt_token_${targetUser.id}_${Date.now()}`;
    const storage = localStorage.getItem(STORAGE_KEY_REMEMBER) === 'true' ? localStorage : sessionStorage;

    storage.setItem(STORAGE_KEY_USER, JSON.stringify(targetUser));
    storage.setItem(STORAGE_KEY_TOKEN, mockToken);

    this.currentUser = targetUser;
    this.currentToken = mockToken;
    this.notify();

    return targetUser;
  }
}

export const authService = new AuthService();
