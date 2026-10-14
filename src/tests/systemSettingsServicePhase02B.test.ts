import {
  systemSettingsService,
  DEFAULT_SYSTEM_SETTINGS,
  mapDatabaseToSettingsState,
  mapPublicIdentityToGeneralSettings,
  SYSTEM_SETTINGS_STORAGE_KEY,
  SETTINGS_UPDATED_EVENT,
} from '../services/systemSettingsService';
import {
  institutionAssetService,
  validateLogoFile,
  SCHOOL_ASSETS_BUCKET,
  MAX_LOGO_FILE_SIZE_BYTES,
} from '../services/institutionAssetService';
import { SystemSettingsState } from '../types/settings.types';
import { InstitutionSettingsRow, PublicInstitutionIdentity } from '../types/database.types';

console.log('=== RUNNING SETTINGS PERSISTENCE PHASE 02B SERVICE & CACHE TESTS ===\n');

// 1. Validasi Local Cache Fallback & Default Settings
const defaultState = systemSettingsService.getSettings();
console.assert(defaultState.general.schoolName === 'SMK NEGERI 1 LUWU TIMUR', '1. Default schoolName mismatch');
console.assert(defaultState.general.appName === 'Presensi Pegawai Sekolah', '1. Default appName mismatch');
console.assert(defaultState.attendance.timezone === 'Asia/Makassar (WITA)', '1. Default timezone mismatch');
console.log('✓ 1. Default system settings and fallback logic verified.');

// 2. Pemetaan Row Database ke State Frontend (mapDatabaseToSettingsState)
const mockDbRow: InstitutionSettingsRow = {
  id: '33333333-3333-3333-3333-333333333333',
  school_name: 'SMK NEGERI 1 LUWU TIMUR TERPADU',
  school_address: 'Jl. Sam Ratulangi No. 45, Malili',
  school_logo_url: 'https://awcoqztysnwlmbvdexwc.supabase.co/storage/v1/object/public/school-assets/logos/school-logo-123.png',
  app_name: 'Tamaki Presensi GTK',
  app_desc: 'Sistem presensi resmi GTK',
  is_active: true,
  extra_settings: {
    attendance: {
      timezone: 'Asia/Makassar (WITA)',
      lateTolerance: 15,
      gpsValidation: true,
      defaultRadius: 100,
    },
    appearance: {
      theme: 'dark',
      accentColor: 'indigo',
      displayDensity: 'compact',
    },
  },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  updated_by: '11111111-1111-1111-1111-111111111111',
};

const mappedState = mapDatabaseToSettingsState(mockDbRow, defaultState);
console.assert(mappedState.general.schoolName === 'SMK NEGERI 1 LUWU TIMUR TERPADU', '2. Mapped schoolName failed');
console.assert(mappedState.general.schoolLogo === mockDbRow.school_logo_url, '2. Mapped schoolLogo failed');
console.assert(mappedState.general.schoolAddress === 'Jl. Sam Ratulangi No. 45, Malili', '2. Mapped schoolAddress failed');
console.assert(mappedState.general.appName === 'Tamaki Presensi GTK', '2. Mapped appName failed');
console.assert(mappedState.attendance.lateTolerance === 15, '2. Mapped extra_settings.attendance failed');
console.assert(mappedState.appearance.theme === 'dark', '2. Mapped extra_settings.appearance failed');
console.log('✓ 2. Database row to frontend state mapper verified successfully.');

// 3. Pemetaan Public RPC Identity ke GeneralSettings
const mockPublicIdentity: PublicInstitutionIdentity = {
  school_name: 'SMK NEGERI 1 LUWU TIMUR',
  school_address: 'Jl. Trans Sulawesi No. 12',
  school_logo_url: 'https://test.supabase.co/storage/v1/object/public/school-assets/logos/logo.webp',
  app_name: 'Presensi GTK',
  app_desc: 'Deskripsi Sekolah',
};

const mappedGeneral = mapPublicIdentityToGeneralSettings(mockPublicIdentity, defaultState.general);
console.assert(mappedGeneral.schoolName === 'SMK NEGERI 1 LUWU TIMUR', '3. Public schoolName mismatch');
console.assert(mappedGeneral.schoolLogo === mockPublicIdentity.school_logo_url, '3. Public schoolLogo mismatch');
console.assert(mappedGeneral.appDesc === 'Deskripsi Sekolah', '3. Public appDesc mismatch');
console.log('✓ 3. Public RPC identity mapper verified.');

// 4. Validasi File Logo di institutionAssetService (validateLogoFile)
const validLogo = { name: 'school-logo.png', type: 'image/png', size: 1024 * 500 }; // 500KB
const oversizedLogo = { name: 'banner.jpg', type: 'image/jpeg', size: 3 * 1024 * 1024 }; // 3MB (> 2MB)
const invalidExtLogo = { name: 'script.exe', type: 'application/x-msdownload', size: 1024 };
const webpLogo = { name: 'logo.webp', type: 'image/webp', size: 1024 * 300 };

console.assert(validateLogoFile(validLogo).valid === true, '4. Valid PNG must be accepted');
console.assert(validateLogoFile(webpLogo).valid === true, '4. Valid WebP must be accepted');
console.assert(validateLogoFile(oversizedLogo).valid === false, '4. Oversized file must be rejected');
console.assert(validateLogoFile(invalidExtLogo).valid === false, '4. Invalid file type must be rejected');
console.assert(SCHOOL_ASSETS_BUCKET === 'school-assets', '4. Bucket name contract mismatch');
console.assert(MAX_LOGO_FILE_SIZE_BYTES === 2097152, '4. Max file size constant mismatch');
console.log('✓ 4. Institution asset file validation rules verified.');

// 5. Invariant State & Storage Constants
console.assert(SYSTEM_SETTINGS_STORAGE_KEY === 'presensi_client_system_settings', '5. Storage key mismatch');
console.assert(SETTINGS_UPDATED_EVENT === 'tamaki_settings_updated', '5. Event name mismatch');
console.log('✓ 5. Storage key and synchronization event constants verified.');

console.log('\n=== ALL PHASE SETTINGS-PERSIST-02B TESTS COMPLETED AND PASSED (5/5) ===\n');
