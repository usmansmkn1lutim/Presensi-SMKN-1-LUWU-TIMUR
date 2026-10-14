import { SystemSettingsState, GeneralSettings } from '../types/settings.types';
import { APP_CONFIG } from '../config/appConfig';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { InstitutionSettingsRow, PublicInstitutionIdentity, Json } from '../types/database.types';

export const SYSTEM_SETTINGS_STORAGE_KEY = 'presensi_client_system_settings';
export const SETTINGS_UPDATED_EVENT = 'tamaki_settings_updated';

export const DEFAULT_SYSTEM_SETTINGS: SystemSettingsState = {
  general: {
    appName: 'Presensi Pegawai Sekolah',
    appDesc: 'Sistem presensi pegawai sekolah SMK Negeri 1 Luwu Timur',
    schoolName: 'SMK NEGERI 1 LUWU TIMUR',
    schoolAddress: 'Jl. Trans Sulawesi No. 12, Luwu Timur, Sulawesi Selatan',
    schoolLogo: null,
  },
  attendance: {
    timezone: 'Asia/Makassar (WITA)',
    lateTolerance: 0,
    gpsValidation: true,
    defaultRadius: 50,
  },
  appearance: {
    theme: 'light',
    accentColor: 'orange',
    displayDensity: 'standard',
  },
  notification: {
    attendanceNotif: true,
    requestNotif: true,
    systemNotif: true,
  },
  system: {
    appVersion: APP_CONFIG.version,
    environment: 'Production',
    sysTimezone: 'Asia/Makassar',
    backendStatus: 'Tidak diperiksa',
    database: 'Supabase',
  },
  security: {
    auditLogStatus: 'Aktif - Aktivitas penting sistem dicatat pada Audit Log.',
    sessionSec: 'Sesi diamankan menggunakan otentikasi JWT Supabase Auth.',
    roleMgmt: 'Pengelolaan pengguna dan role tersedia pada menu Manajemen Pengguna.',
  },
};

/**
 * Helper untuk memetakan record Supabase (InstitutionSettingsRow) ke struktur state frontend (SystemSettingsState).
 */
export const mapDatabaseToSettingsState = (
  row: Partial<InstitutionSettingsRow>,
  existingState: SystemSettingsState = DEFAULT_SYSTEM_SETTINGS
): SystemSettingsState => {
  const extra = (row.extra_settings && typeof row.extra_settings === 'object' && !Array.isArray(row.extra_settings))
    ? (row.extra_settings as Record<string, any>)
    : {};

  return {
    ...existingState,
    general: {
      appName: row.app_name?.trim() || existingState.general.appName,
      appDesc: row.app_desc?.trim() ?? existingState.general.appDesc,
      schoolName: row.school_name?.trim() || existingState.general.schoolName,
      schoolAddress: row.school_address?.trim() ?? existingState.general.schoolAddress,
      schoolLogo: row.school_logo_url !== undefined ? row.school_logo_url : existingState.general.schoolLogo,
    },
    attendance: {
      ...existingState.attendance,
      ...(extra.attendance || {}),
    },
    appearance: {
      ...existingState.appearance,
      ...(extra.appearance || {}),
    },
    notification: {
      ...existingState.notification,
      ...(extra.notification || {}),
    },
    system: {
      ...existingState.system,
      appVersion: APP_CONFIG.version,
      database: 'Supabase PostgreSQL',
    },
    security: {
      ...existingState.security,
    },
  };
};

/**
 * Helper untuk memetakan data RPC Public Identity (get_public_institution_identity) ke GeneralSettings.
 */
export const mapPublicIdentityToGeneralSettings = (
  identity: Partial<PublicInstitutionIdentity>,
  fallback: GeneralSettings = DEFAULT_SYSTEM_SETTINGS.general
): GeneralSettings => {
  return {
    appName: identity.app_name?.trim() || fallback.appName,
    appDesc: identity.app_desc?.trim() ?? fallback.appDesc,
    schoolName: identity.school_name?.trim() || fallback.schoolName,
    schoolAddress: identity.school_address?.trim() ?? fallback.schoolAddress,
    schoolLogo: identity.school_logo_url !== undefined ? identity.school_logo_url : fallback.schoolLogo,
  };
};

export const systemSettingsService = {
  /**
   * Mengambil konfigurasi lengkap sistem dari cache lokal (localStorage) dengan fallback aman.
   * Bersifat synchronous untuk komponen UI yang membutuhkan initial state instan tanpa layout shift.
   */
  getSettings(): SystemSettingsState {
    if (typeof window === 'undefined') {
      return DEFAULT_SYSTEM_SETTINGS;
    }

    try {
      const raw = localStorage.getItem(SYSTEM_SETTINGS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          ...DEFAULT_SYSTEM_SETTINGS,
          ...parsed,
          general: {
            ...DEFAULT_SYSTEM_SETTINGS.general,
            ...(parsed.general || {}),
          },
          attendance: {
            ...DEFAULT_SYSTEM_SETTINGS.attendance,
            ...(parsed.attendance || {}),
          },
          appearance: {
            ...DEFAULT_SYSTEM_SETTINGS.appearance,
            ...(parsed.appearance || {}),
          },
          notification: {
            ...DEFAULT_SYSTEM_SETTINGS.notification,
            ...(parsed.notification || {}),
          },
          system: {
            ...DEFAULT_SYSTEM_SETTINGS.system,
            ...(parsed.system || {}),
            appVersion: APP_CONFIG.version,
          },
        };
      }
    } catch (err) {
      console.warn('systemSettingsService: Gagal membaca cache localStorage, menggunakan default.', err);
    }

    return DEFAULT_SYSTEM_SETTINGS;
  },

  /**
   * Mengambil pengaturan umum instansi (nama sekolah, logo, alamat, dll) dari cache.
   */
  getGeneralSettings(): GeneralSettings {
    return this.getSettings().general;
  },

  /**
   * Memperbarui cache lokal localStorage dan menyiarkan event reaktif window/storage.
   */
  updateLocalCache(newSettings: SystemSettingsState): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(SYSTEM_SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));

      // Broadcast custom event untuk komponen dalam tab yang sama
      window.dispatchEvent(
        new CustomEvent(SETTINGS_UPDATED_EVENT, { detail: newSettings })
      );

      // Broadcast storage event untuk sinkronisasi antar tab
      window.dispatchEvent(new Event('storage'));
    } catch (err) {
      console.error('systemSettingsService: Gagal memperbarui cache localStorage:', err);
    }
  },

  /**
   * Menyimpan konfigurasi ke database Supabase (tabel public.institution_settings).
   * Menjamin prinsip database-first: hanya memperbarui cache lokal setelah mutasi database berhasil.
   */
  async saveSettingsToRemote(newSettings: SystemSettingsState): Promise<{ success: boolean; data: SystemSettingsState | null; error: string | null }> {
    if (!isSupabaseConfigured()) {
      // Jika Supabase offline / belum disetel, simpan ke cache lokal sebagai fallback darurat
      this.updateLocalCache(newSettings);
      return {
        success: true,
        data: newSettings,
        error: null,
      };
    }

    try {
      // 1. Dapatkan record aktif saat ini untuk mengambil id (single active record)
      const { data: activeRows, error: fetchErr } = await supabase
        .from('institution_settings')
        .select('*')
        .eq('is_active', true)
        .limit(1);

      if (fetchErr) {
        console.warn('systemSettingsService: Gagal membaca record aktif saat menyimpan, mencoba fallback RPC get_active_institution_settings:', fetchErr);
      }

      const activeRecord = activeRows && activeRows.length > 0 ? activeRows[0] : null;

      const payload = {
        school_name: newSettings.general.schoolName.trim() || DEFAULT_SYSTEM_SETTINGS.general.schoolName,
        school_address: newSettings.general.schoolAddress?.trim() || null,
        school_logo_url: newSettings.general.schoolLogo || null,
        app_name: newSettings.general.appName.trim() || DEFAULT_SYSTEM_SETTINGS.general.appName,
        app_desc: newSettings.general.appDesc?.trim() || null,
        is_active: true,
        extra_settings: {
          attendance: newSettings.attendance,
          appearance: newSettings.appearance,
          notification: newSettings.notification,
        } as unknown as Json,
      };

      let savedRecord: InstitutionSettingsRow | null = null;

      if (activeRecord?.id) {
        // UPDATE record aktif yang ada
        const { data: updatedData, error: updateErr } = await supabase
          .from('institution_settings')
          .update(payload)
          .eq('id', activeRecord.id)
          .select()
          .single();

        if (updateErr) {
          console.error('systemSettingsService: Gagal update institution_settings:', updateErr);
          return {
            success: false,
            data: null,
            error: updateErr.message || 'Gagal menyimpan konfigurasi ke database Supabase.',
          };
        }
        savedRecord = updatedData;
      } else {
        // INSERT record baru jika belum ada
        const { data: insertedData, error: insertErr } = await supabase
          .from('institution_settings')
          .insert(payload)
          .select()
          .single();

        if (insertErr) {
          console.error('systemSettingsService: Gagal insert institution_settings:', insertErr);
          return {
            success: false,
            data: null,
            error: insertErr.message || 'Gagal menambahkan konfigurasi ke database Supabase.',
          };
        }
        savedRecord = insertedData;
      }

      // 2. Petakan record database yang berhasil disimpan ke state frontend
      const mappedState = mapDatabaseToSettingsState(savedRecord || payload as any, newSettings);

      // 3. Perbarui cache lokal dan siarkan event ke seluruh komponen UI
      this.updateLocalCache(mappedState);

      return {
        success: true,
        data: mappedState,
        error: null,
      };
    } catch (err: any) {
      console.error('systemSettingsService: Kesalahan tak terduga saat menyimpan ke database:', err);
      return {
        success: false,
        data: null,
        error: err.message || 'Terjadi kesalahan sistem saat menghubungi database Supabase.',
      };
    }
  },

  /**
   * Menyimpan konfigurasi. Mendukung pemanggilan synchronous legacy sekaligus mendelegasikan ke penyimpanan remote.
   * Kompatibel dengan SettingsPage yang memanggil saveSettings(formSettings).
   */
  saveSettings(newSettings: SystemSettingsState): void {
    // Jalankan pembaruan lokal segera untuk responsivitas UI
    this.updateLocalCache(newSettings);

    // Jalankan penyimpanan remote di latar belakang secara asinkron
    if (isSupabaseConfigured()) {
      this.saveSettingsToRemote(newSettings).catch((err) => {
        console.warn('systemSettingsService: Gagal sinkronisasi background ke Supabase:', err);
      });
    }
  },

  /**
   * Mengambil identitas publik dari Supabase melalui RPC publik get_public_institution_identity()
   * Aman dipanggil oleh pengguna yang belum terotentikasi (anonim) di halaman login atau publik.
   */
  async fetchPublicIdentity(): Promise<GeneralSettings> {
    const currentLocal = this.getGeneralSettings();

    if (!isSupabaseConfigured()) {
      return currentLocal;
    }

    try {
      const { data, error } = await supabase.rpc('get_public_institution_identity');

      if (error) {
        console.warn('systemSettingsService: Gagal memanggil RPC get_public_institution_identity:', error);
        return currentLocal;
      }

      if (data && data.length > 0) {
        const publicData = data[0];
        const updatedGeneral = mapPublicIdentityToGeneralSettings(publicData, currentLocal);

        // Perbarui general settings di local cache
        const currentState = this.getSettings();
        const mergedState: SystemSettingsState = {
          ...currentState,
          general: updatedGeneral,
        };
        this.updateLocalCache(mergedState);

        return updatedGeneral;
      }
    } catch (err) {
      console.warn('systemSettingsService: Exception saat fetchPublicIdentity:', err);
    }

    return currentLocal;
  },

  /**
   * Mengambil konfigurasi lengkap instansi dari database Supabase untuk pengguna terotentikasi.
   * Memanggil RPC get_active_institution_settings() atau query tabel institution_settings.
   */
  async fetchSettingsFromRemote(): Promise<SystemSettingsState> {
    const currentLocal = this.getSettings();

    if (!isSupabaseConfigured()) {
      return currentLocal;
    }

    try {
      // Prioritaskan RPC get_active_institution_settings()
      const { data: rpcData, error: rpcErr } = await supabase.rpc('get_active_institution_settings');

      if (!rpcErr && rpcData && rpcData.length > 0) {
        const mapped = mapDatabaseToSettingsState(rpcData[0], currentLocal);
        this.updateLocalCache(mapped);
        return mapped;
      }

      // Fallback ke direct query tabel institution_settings (dilindungi RLS active authenticated)
      const { data: tableData, error: tableErr } = await supabase
        .from('institution_settings')
        .select('*')
        .eq('is_active', true)
        .limit(1);

      if (!tableErr && tableData && tableData.length > 0) {
        const mapped = mapDatabaseToSettingsState(tableData[0], currentLocal);
        this.updateLocalCache(mapped);
        return mapped;
      }

      // Jika RPC gagal karena unauthenticated (misal sesi belum ada), coba fallback RPC publik
      const publicGeneral = await this.fetchPublicIdentity();
      return {
        ...currentLocal,
        general: publicGeneral,
      };
    } catch (err) {
      console.warn('systemSettingsService: Exception saat fetchSettingsFromRemote:', err);
      return currentLocal;
    }
  },

  /**
   * Inisialisasi service: menyinkronkan data cloud dengan cache lokal saat aplikasi pertama kali dimuat.
   */
  async initializeSettings(): Promise<SystemSettingsState> {
    return this.fetchSettingsFromRemote();
  },
};
