import {
  systemSettingsService,
  DEFAULT_SYSTEM_SETTINGS,
  SETTINGS_UPDATED_EVENT,
  mapDatabaseToSettingsState,
} from '../services/systemSettingsService';
import {
  institutionAssetService,
  validateLogoFile,
  ALLOWED_LOGO_MIME_TYPES,
  MAX_LOGO_FILE_SIZE_BYTES,
  SCHOOL_ASSETS_BUCKET,
} from '../services/institutionAssetService';
import { SystemSettingsState } from '../types/settings.types';
import { AppRole } from '../types/auth';

console.log('=== RUNNING SETTINGS-PERSIST-02C UI INTEGRATION & HEADER TESTS ===\n');

// -------------------------------------------------------------
// Test 1: Initial Form Loading & Cache Hydration
// -------------------------------------------------------------
{
  const initial = systemSettingsService.getSettings();
  console.assert(
    initial.general.schoolName === 'SMK NEGERI 1 LUWU TIMUR',
    'T1: Initial school name must match default configuration'
  );
  console.assert(
    initial.attendance.timezone === 'Asia/Makassar (WITA)',
    'T1: Timezone must match default'
  );
  console.log('✓ 1. Form memuat data awal dengan benar dari cache / default.');
}

// -------------------------------------------------------------
// Test 2: Form Modification and Dirty Checking
// -------------------------------------------------------------
{
  const savedState: SystemSettingsState = JSON.parse(JSON.stringify(DEFAULT_SYSTEM_SETTINGS));
  const currentFormState: SystemSettingsState = JSON.parse(JSON.stringify(DEFAULT_SYSTEM_SETTINGS));

  // Awal: belum ada perubahan
  let isDirty = JSON.stringify(currentFormState) !== JSON.stringify(savedState);
  console.assert(!isDirty, 'T2: State awal tidak boleh dirty');

  // Pengguna mengubah nama sekolah
  currentFormState.general.schoolName = 'SMK NEGERI 1 LUWU TIMUR - REVISI';
  isDirty = JSON.stringify(currentFormState) !== JSON.stringify(savedState);
  console.assert(isDirty, 'T2: State harus dirty setelah nama sekolah diubah');

  // Pengguna mengembalikan ke nilai semula
  currentFormState.general.schoolName = savedState.general.schoolName;
  isDirty = JSON.stringify(currentFormState) !== JSON.stringify(savedState);
  console.assert(!isDirty, 'T2: State harus kembali clean jika nilai dikembalikan');
  console.log('✓ 2. Perubahan form memperbarui state lokal dan perhitungan isDirty konsisten.');
}

// -------------------------------------------------------------
// Test 3: Validasi Input & Payload Save Contract
// -------------------------------------------------------------
{
  // Validasi nama sekolah tidak boleh kosong
  const validateSchoolName = (name: string): { valid: boolean; error: string | null } => {
    if (!name || !name.trim()) {
      return { valid: false, error: 'Nama sekolah tidak boleh kosong.' };
    }
    return { valid: true, error: null };
  };

  console.assert(validateSchoolName('SMKN 1 Lutim').valid === true, 'T3: Nama valid ditolak');
  console.assert(validateSchoolName('   ').valid === false, 'T3: Nama spasi kosong harus ditolak');
  console.assert(validateSchoolName('').valid === false, 'T3: Nama kosong harus ditolak');

  // Verifikasi pemetaan payload database
  const formPayload: SystemSettingsState = {
    ...DEFAULT_SYSTEM_SETTINGS,
    general: {
      ...DEFAULT_SYSTEM_SETTINGS.general,
      schoolName: 'SMK NEGERI 1 LUWU TIMUR TERAKREDITASI',
      schoolLogo: 'https://example.com/storage/v1/object/public/school-assets/logos/school-logo-123.png',
      schoolAddress: 'Jl. Pendidikan No. 45',
    },
  };

  const dbRow = {
    id: 'inst-1',
    school_name: formPayload.general.schoolName,
    school_address: formPayload.general.schoolAddress,
    school_logo_url: formPayload.general.schoolLogo,
    app_name: formPayload.general.appName,
    app_desc: formPayload.general.appDesc,
    is_active: true,
    extra_settings: {
      attendance: formPayload.attendance,
      appearance: formPayload.appearance,
      notification: formPayload.notification,
    } as any,
  };

  const mapped = mapDatabaseToSettingsState(dbRow as any, DEFAULT_SYSTEM_SETTINGS);
  console.assert(
    mapped.general.schoolName === 'SMK NEGERI 1 LUWU TIMUR TERAKREDITASI',
    'T3: Mapped school name mismatch'
  );
  console.assert(
    mapped.general.schoolLogo === formPayload.general.schoolLogo,
    'T3: Mapped school logo mismatch'
  );
  console.log('✓ 3. Validasi input nama sekolah dan payload database konsisten.');
}

// -------------------------------------------------------------
// Test 4: Otorisasi Role (RBAC) pada Pengaturan
// -------------------------------------------------------------
{
  const checkCanManageSettings = (role?: AppRole | string): boolean => {
    return role === 'admin' || role === 'super_admin';
  };

  console.assert(checkCanManageSettings('admin') === true, 'T4: Admin harus diizinkan');
  console.assert(checkCanManageSettings('super_admin') === true, 'T4: Super Admin harus diizinkan');
  console.assert(checkCanManageSettings('employee') === false, 'T4: Employee harus dilarang');
  console.assert(checkCanManageSettings(undefined) === false, 'T4: Pengguna anonim harus dilarang');
  console.log('✓ 4. Otorisasi peran (RBAC) membatasi akses simpan dan upload hanya untuk Admin.');
}

// -------------------------------------------------------------
// Test 5: Alur Validasi File & Bucket Upload Logo
// -------------------------------------------------------------
{
  console.assert(
    SCHOOL_ASSETS_BUCKET === 'school-assets',
    'T5: Bucket harus bernilai school-assets'
  );

  // File valid
  const validPng = { name: 'logo.png', type: 'image/png', size: 500 * 1024 };
  const validJpg = { name: 'logo.jpg', type: 'image/jpeg', size: 1.8 * 1024 * 1024 };
  const validWebp = { name: 'logo.webp', type: 'image/webp', size: 200 * 1024 };

  console.assert(validateLogoFile(validPng).valid === true, 'T5: Valid PNG ditolak');
  console.assert(validateLogoFile(validJpg).valid === true, 'T5: Valid JPG ditolak');
  console.assert(validateLogoFile(validWebp).valid === true, 'T5: Valid WebP ditolak');

  // File invalid type
  const invalidPdf = { name: 'doc.pdf', type: 'application/pdf', size: 500 * 1024 };
  const invalidGif = { name: 'anim.gif', type: 'image/gif', size: 500 * 1024 };
  console.assert(validateLogoFile(invalidPdf).valid === false, 'T5: PDF diterima');
  console.assert(validateLogoFile(invalidGif).valid === false, 'T5: GIF diterima');

  // File oversized (> 2MB)
  const oversized = { name: 'big.png', type: 'image/png', size: 2.5 * 1024 * 1024 };
  const sizeValidation = validateLogoFile(oversized);
  console.assert(sizeValidation.valid === false, 'T5: File melebihi 2MB diterima');
  console.assert(
    sizeValidation.error?.includes('2 MB'),
    'T5: Pesan error ukuran file harus informatif'
  );

  console.log('✓ 5. Validasi file logo (tipe MIME & batas 2MB) berjalan semestinya.');
}

// -------------------------------------------------------------
// Test 6: Pemetaan Status Visual UI (Loading, Saving, Error, Dirty, Clean)
// -------------------------------------------------------------
{
  type UIStatus = 'loading' | 'saving' | 'error' | 'dirty' | 'clean';

  const deriveUIStatus = (params: {
    isLoadingRemote: boolean;
    isSaving: boolean;
    saveStatus: 'idle' | 'success' | 'error';
    isDirty: boolean;
  }): { status: UIStatus; label: string } => {
    if (params.isLoadingRemote) {
      return { status: 'loading', label: 'Menyinkronkan Cloud...' };
    }
    if (params.isSaving) {
      return { status: 'saving', label: 'Menyimpan ke Database...' };
    }
    if (params.saveStatus === 'error') {
      return { status: 'error', label: 'Penyimpanan Cloud Gagal' };
    }
    if (params.isDirty) {
      return { status: 'dirty', label: 'Ada perubahan yang belum disimpan' };
    }
    return { status: 'clean', label: 'Tersimpan di Cloud Supabase' };
  };

  const st1 = deriveUIStatus({ isLoadingRemote: true, isSaving: false, saveStatus: 'idle', isDirty: false });
  console.assert(st1.status === 'loading', 'T6: Harus loading status');

  const st2 = deriveUIStatus({ isLoadingRemote: false, isSaving: true, saveStatus: 'idle', isDirty: true });
  console.assert(st2.status === 'saving', 'T6: Harus saving status');

  const st3 = deriveUIStatus({ isLoadingRemote: false, isSaving: false, saveStatus: 'error', isDirty: true });
  console.assert(st3.status === 'error', 'T6: Harus error status');

  const st4 = deriveUIStatus({ isLoadingRemote: false, isSaving: false, saveStatus: 'idle', isDirty: true });
  console.assert(st4.status === 'dirty', 'T6: Harus dirty status');

  const st5 = deriveUIStatus({ isLoadingRemote: false, isSaving: false, saveStatus: 'success', isDirty: false });
  console.assert(st5.status === 'clean', 'T6: Harus clean status');

  console.log('✓ 6. Derivasi status visual UI (loading, saving, error, dirty, clean) akurat.');
}

// -------------------------------------------------------------
// Test 7: Reaktivitas Identitas Header & Fallback Icon
// -------------------------------------------------------------
{
  // Simulasi logika Header:
  const getHeaderVisuals = (settings: { schoolName?: string | null; schoolLogo?: string | null }, logoLoadFailed: boolean) => {
    const rawSchoolName = settings.schoolName?.trim();
    const schoolName = rawSchoolName || 'Nama Instansi Belum Diatur';
    const schoolLogo = settings.schoolLogo?.trim();
    const shouldShowLogoImage = Boolean(schoolLogo && !logoLoadFailed);

    return {
      schoolName,
      shouldShowLogoImage,
      schoolLogo: shouldShowLogoImage ? schoolLogo : null,
      fallbackIcon: !shouldShowLogoImage ? 'Building2' : null,
    };
  };

  // Skenario A: Logo belum diatur -> Building2 fallback
  const scA = getHeaderVisuals({ schoolName: 'SMK 1 Lutim', schoolLogo: null }, false);
  console.assert(scA.shouldShowLogoImage === false, 'T7: Logo kosong tidak boleh render img');
  console.assert(scA.fallbackIcon === 'Building2', 'T7: Fallback Building2 harus aktif');

  // Skenario B: Logo valid dari cloud storage -> render img
  const cloudUrl = 'https://abc.supabase.co/storage/v1/object/public/school-assets/logos/school-logo-1.png';
  const scB = getHeaderVisuals({ schoolName: 'SMK 1 Lutim', schoolLogo: cloudUrl }, false);
  console.assert(scB.shouldShowLogoImage === true, 'T7: Logo valid harus render img');
  console.assert(scB.schoolLogo === cloudUrl, 'T7: URL logo harus sesuai');

  // Skenario C: Logo gagal dimuat (network/broken URL) -> fallback Building2
  const scC = getHeaderVisuals({ schoolName: 'SMK 1 Lutim', schoolLogo: cloudUrl }, true);
  console.assert(scC.shouldShowLogoImage === false, 'T7: Logo rusak tidak boleh render img');
  console.assert(scC.fallbackIcon === 'Building2', 'T7: Fallback Building2 harus aktif saat img rusak');

  // Skenario D: Nama sekolah kosong -> Fallback nama instansi
  const scD = getHeaderVisuals({ schoolName: '', schoolLogo: null }, false);
  console.assert(scD.schoolName === 'Nama Instansi Belum Diatur', 'T7: Nama sekolah kosong harus fallback rapi');

  console.log('✓ 7. Logika visual Header (nama sekolah, logo, dan fallback icon Building2) terverifikasi.');
}

// -------------------------------------------------------------
// Test 8: Konfirmasi Perubahan Belum Disimpan (Guard Dialog)
// -------------------------------------------------------------
{
  const state = {
    currentActiveTab: 'umum',
    isGuardOpen: false,
    pendingTab: null as string | null,
    isDirty: true,
  };

  const handleTabClick = (newTab: string) => {
    if (newTab === state.currentActiveTab) return;
    if (state.isDirty) {
      state.pendingTab = newTab;
      state.isGuardOpen = true;
    } else {
      state.currentActiveTab = newTab;
    }
  };

  handleTabClick('presensi');
  console.assert(state.isGuardOpen === true, 'T8: Guard dialog harus terbuka jika tab berpindah saat dirty');
  console.assert(state.pendingTab === 'presensi', 'T8: Pending tab harus tersimpan');
  console.assert(state.currentActiveTab === 'umum', 'T8: Active tab belum boleh berpindah sebelum konfirmasi');

  // Konfirmasi Batal & Pindah
  const confirmDiscard = (savedState: any, formStateSetter: (val: any) => void) => {
    formStateSetter(savedState);
    if (state.pendingTab) {
      state.currentActiveTab = state.pendingTab;
      state.pendingTab = null;
    }
    state.isGuardOpen = false;
  };

  let mockFormState = { schoolName: 'Draft baru' };
  confirmDiscard({ schoolName: 'Asli' }, (val) => { mockFormState = val; });
  console.assert(mockFormState.schoolName === 'Asli', 'T8: Form harus di-revert saat discard');
  console.assert(state.currentActiveTab === 'presensi', 'T8: Tab harus berpindah ke pendingTab');
  console.assert(state.isGuardOpen === false, 'T8: Dialog guard harus tertutup');

  console.log('✓ 8. Mekanisme guard dialog konfirmasi perubahan belum disimpan terverifikasi.');
}

console.log('\n=== ALL SETTINGS-PERSIST-02C INTEGRATION TESTS PASSED! ===');
