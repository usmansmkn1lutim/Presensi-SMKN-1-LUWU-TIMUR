import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Settings,
  Save,
  Shield,
  Palette,
  Bell,
  Cpu,
  Clock,
  Info,
  Upload,
  Trash2,
  Check,
  RefreshCw,
  AlertTriangle,
  Building2,
  Globe,
  Sliders,
  X
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { SystemSettingsState, SettingsCategory } from '../../types/settings.types';
import { APP_CONFIG } from '../../config/appConfig';
import { supabase } from '../../lib/supabase';

// Default initial state matching official configs
const DEFAULT_SETTINGS: SystemSettingsState = {
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
    appVersion: APP_CONFIG.version, // Unified single source of truth
    environment: 'Production',
    sysTimezone: 'Asia/Makassar',
    backendStatus: 'Tidak diperiksa',
    database: 'Supabase',
  },
  security: {
    auditLogStatus: 'Aktif - Aktivitas penting sistem dicatat pada Audit Log.',
    sessionSec: 'Sesi diamankan menggunakan otentikasi JWT Supabase Auth.',
    roleMgmt: 'Pengelolaan pengguna dan role tersedia pada menu Manajemen Pengguna.',
  }
};

const LOCAL_STORAGE_KEY = 'presensi_client_system_settings';

export const SettingsPage: React.FC = () => {
  // Navigation & Category States
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>('umum');
  const [pendingCategory, setPendingCategory] = useState<SettingsCategory | null>(null);

  // Core Form States
  const [savedSettings, setSavedSettings] = useState<SystemSettingsState>(DEFAULT_SETTINGS);
  const [formSettings, setFormSettings] = useState<SystemSettingsState>(DEFAULT_SETTINGS);

  // File Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoError, setLogoError] = useState<string | null>(null);

  // Toast / Feedback State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Unsaved Warning Dialog State
  const [isGuardOpen, setIsUnsavedGuardOpen] = useState<boolean>(false);

  // Connectivity Checking State
  const [connStatus, setConnStatus] = useState<'checking' | 'connected' | 'disconnected' | 'unavailable'>('checking');

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // 1. Load settings from LocalStorage or session on Mount
  useEffect(() => {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        // Force AppVersion to match official source even if cached state was outdated
        parsed.system = {
          ...parsed.system,
          appVersion: APP_CONFIG.version
        };
        setSavedSettings(parsed);
        setFormSettings(parsed);
      } catch (err) {
        console.warn('Failed to parse cached settings, defaulting.', err);
        setSavedSettings(DEFAULT_SETTINGS);
        setFormSettings(DEFAULT_SETTINGS);
      }
    } else {
      setSavedSettings(DEFAULT_SETTINGS);
      setFormSettings(DEFAULT_SETTINGS);
    }
  }, []);

  // 2. Connectivity check (lightweight read-only probe)
  const checkConnectivity = useCallback(async () => {
    setConnStatus('checking');
    try {
      const { error } = await supabase.from('profiles').select('id').limit(1);
      if (error && error.message && (error.message.toLowerCase().includes('fetch') || error.message.toLowerCase().includes('network'))) {
        setConnStatus('disconnected');
      } else {
        // Any response or even standard auth errors confirm connectivity
        setConnStatus('connected');
      }
    } catch (err) {
      setConnStatus('disconnected');
    }
  }, []);

  // Run connectivity probe on mount
  useEffect(() => {
    checkConnectivity();
  }, [checkConnectivity]);

  // 3. Check if form is dirty compared to saved state
  const isDirty = JSON.stringify(formSettings) !== JSON.stringify(savedSettings);

  // 4. Handle Category Transitions with Unsaved Changes Guard
  const handleCategoryClick = (cat: SettingsCategory) => {
    if (cat === activeCategory) return;
    if (isDirty) {
      setPendingCategory(cat);
      setIsUnsavedGuardOpen(true);
    } else {
      setActiveCategory(cat);
    }
  };

  // Confirm navigating and discarding changes
  const handleConfirmDiscard = () => {
    if (pendingCategory) {
      // Revert form state back to last saved state before moving
      setFormSettings(savedSettings);
      setActiveCategory(pendingCategory);
      setPendingCategory(null);
    }
    setIsUnsavedGuardOpen(false);
  };

  // 5. Save form settings to client-side localStorage
  const handleSaveSettings = () => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(formSettings));
      setSavedSettings(formSettings);
      showToast('Perubahan diterapkan pada sesi ini.');
    } catch (err) {
      showToast('Gagal menyimpan konfigurasi sesi.');
    }
  };

  // 6. Reset changes in form state
  const handleResetSettings = () => {
    setFormSettings(savedSettings);
    setLogoError(null);
    showToast('Konformasi isian berhasil di-reset.');
  };

  // 7. Handle File/Logo Upload Preview (Local Only)
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setLogoError(null);
    if (!file) return;

    // Validate type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setLogoError('Format file tidak valid. Gunakan PNG, JPG, atau WebP.');
      return;
    }

    // Validate size (2MB)
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      setLogoError('Ukuran gambar tidak boleh melebihi 2 MB.');
      return;
    }

    // Create safe Object URL
    const previewUrl = URL.createObjectURL(file);
    setFormSettings((prev) => ({
      ...prev,
      general: {
        ...prev.general,
        schoolLogo: previewUrl,
      },
    }));
  };

  const handleRemoveLogo = () => {
    if (formSettings.general.schoolLogo && formSettings.general.schoolLogo.startsWith('blob:')) {
      URL.revokeObjectURL(formSettings.general.schoolLogo);
    }
    setFormSettings((prev) => ({
      ...prev,
      general: {
        ...prev.general,
        schoolLogo: null,
      },
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Clean up Object URL to prevent memory leaks on unmount
  useEffect(() => {
    return () => {
      if (formSettings.general.schoolLogo && formSettings.general.schoolLogo.startsWith('blob:')) {
        URL.revokeObjectURL(formSettings.general.schoolLogo);
      }
    };
  }, [formSettings.general.schoolLogo]);

  // Categories metadata for sidebar
  const CATEGORIES = [
    { id: 'umum' as SettingsCategory, label: 'Umum', icon: Building2, desc: 'Profil sekolah dan metadata instansi' },
    { id: 'presensi' as SettingsCategory, label: 'Presensi', icon: Clock, desc: 'Verifikasi, toleransi waktu, dan geofencing' },
    { id: 'tampilan' as SettingsCategory, label: 'Tampilan', icon: Sliders, desc: 'Tema, warna aksen, dan kepadatan baris' },
    { id: 'notifikasi' as SettingsCategory, label: 'Notifikasi', icon: Bell, desc: 'Preferensi pengiriman alert dan update' },
    { id: 'sistem' as SettingsCategory, label: 'Sistem', icon: Cpu, desc: 'Informasi read-only arsitektur platform' },
    { id: 'keamanan' as SettingsCategory, label: 'Keamanan', icon: Shield, desc: 'Jejak log audit dan hak akses keamanan' },
  ];

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-[100] bg-[#1F2937] text-white px-4 py-3 rounded-xl shadow-lg border border-[#374151] flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <Check className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header Panel */}
      <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-5 sm:p-6 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#F97316]">
                Konfigurasi Sistem
              </span>
              <span className="w-1 h-1 rounded-full bg-slate-300" />
              {isDirty ? (
                <span className="inline-flex items-center gap-1.5 text-xs text-amber-600 font-semibold animate-pulse">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Ada perubahan yang belum disimpan
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
                  <Check className="w-3.5 h-3.5" />
                  Semua perubahan tersimpan
                </span>
              )}
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-[#111827] mt-1">
              Pengaturan Sistem
            </h2>
            <p className="text-xs text-[#6B7280] mt-1">
              Kelola konfigurasi dan preferensi aplikasi sekolah. <span className="font-semibold text-slate-500">Perubahan sementara pada sesi ini.</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetSettings}
              disabled={!isDirty}
              className="h-9"
            >
              Reset
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveSettings}
              disabled={!isDirty}
              className="h-9"
              leftIcon={<Save className="w-3.5 h-3.5" />}
            >
              Simpan Perubahan
            </Button>
          </div>
        </div>
      </div>

      {/* Outer Layout Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Navigation Categories Selection Area */}
        <div className="lg:col-span-3 space-y-3">
          
          {/* Desktop Left Sidebar Navigation */}
          <div className="hidden lg:block bg-white border border-[#E5E7EB] rounded-2xl p-4.5 shadow-2xs space-y-1">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-3 mb-3">
              Kategori Pengaturan
            </h3>
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleCategoryClick(cat.id)}
                  className={`w-full text-left px-3.5 py-3 rounded-xl transition-all duration-150 flex items-center gap-3 ${
                    isActive 
                      ? 'bg-orange-50 text-[#EA580C] font-semibold border border-orange-100 shadow-3xs' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#EA580C]' : 'text-slate-400'}`} />
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs truncate leading-normal">{cat.label}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Tablet Tab Bar (Visible on Tablet screen size) */}
          <div className="hidden sm:block lg:hidden bg-white border border-[#E5E7EB] rounded-2xl p-2.5 shadow-2xs">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleCategoryClick(cat.id)}
                    className={`whitespace-nowrap px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all ${
                      isActive 
                        ? 'bg-orange-50 text-[#EA580C] border-orange-100 shadow-3xs' 
                        : 'text-slate-600 hover:bg-slate-50 border-transparent'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mobile Select Dropdown Box (Visible on Phone screens) */}
          <div className="block sm:hidden bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-2xs">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Kategori Aktif</label>
            <select
              value={activeCategory}
              onChange={(e) => handleCategoryClick(e.target.value as SettingsCategory)}
              className="w-full h-11 text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 focus:outline-none focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316]"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Content Panel Area */}
        <div className="lg:col-span-9 bg-white border border-[#E5E7EB] rounded-2xl p-5 sm:p-6 shadow-2xs">
          
          {/* 1. Kategori UMUM */}
          {activeCategory === 'umum' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
                  Pengaturan Umum Instansi
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-normal">
                  Konfigurasikan nama instansi, deskripsi sistem, dan logo resmi sekolah.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Application Name */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">Nama Aplikasi</label>
                  <input
                    type="text"
                    value={formSettings.general.appName}
                    onChange={(e) => setFormSettings((prev) => ({
                      ...prev,
                      general: { ...prev.general, appName: e.target.value }
                    }))}
                    className="w-full h-11 text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 focus:outline-none focus:bg-white focus:ring-2 focus:ring-orange-500/10 focus:border-[#F97316] transition-colors"
                  />
                </div>

                {/* School Name */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">Nama Sekolah</label>
                  <input
                    type="text"
                    value={formSettings.general.schoolName}
                    onChange={(e) => setFormSettings((prev) => ({
                      ...prev,
                      general: { ...prev.general, schoolName: e.target.value }
                    }))}
                    className="w-full h-11 text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 focus:outline-none focus:bg-white focus:ring-2 focus:ring-orange-500/10 focus:border-[#F97316] transition-colors"
                  />
                </div>

                {/* Application Description */}
                <div className="col-span-1 md:col-span-2 space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">Deskripsi Aplikasi</label>
                  <textarea
                    rows={2}
                    value={formSettings.general.appDesc}
                    onChange={(e) => setFormSettings((prev) => ({
                      ...prev,
                      general: { ...prev.general, appDesc: e.target.value }
                    }))}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:bg-white focus:ring-2 focus:ring-orange-500/10 focus:border-[#F97316] transition-colors resize-none"
                  />
                </div>

                {/* School Address */}
                <div className="col-span-1 md:col-span-2 space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">Alamat Sekolah</label>
                  <textarea
                    rows={2}
                    value={formSettings.general.schoolAddress}
                    onChange={(e) => setFormSettings((prev) => ({
                      ...prev,
                      general: { ...prev.general, schoolAddress: e.target.value }
                    }))}
                    placeholder="Masukkan alamat sekolah secara lengkap..."
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:bg-white focus:ring-2 focus:ring-orange-500/10 focus:border-[#F97316] transition-colors resize-none"
                  />
                </div>

                {/* School Logo */}
                <div className="col-span-1 md:col-span-2 space-y-2">
                  <label className="block text-xs font-bold text-slate-700">Logo Sekolah (Preview Sesi)</label>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4.5 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="w-16 h-16 rounded-xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                      {formSettings.general.schoolLogo ? (
                        <img 
                          src={formSettings.general.schoolLogo} 
                          alt="School logo preview" 
                          className="w-full h-full object-contain"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <Building2 className="w-8 h-8 text-slate-300" />
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap gap-2">
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleLogoChange}
                          accept="image/png, image/jpeg, image/jpg, image/webp"
                          className="hidden"
                          id="settings-logo-upload"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="h-9 px-3 text-xs font-bold rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 bg-white flex items-center gap-1.5 shadow-3xs"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          Pilih Gambar
                        </button>
                        {formSettings.general.schoolLogo && (
                          <button
                            type="button"
                            onClick={handleRemoveLogo}
                            className="h-9 px-3 text-xs font-bold rounded-xl border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 flex items-center gap-1.5"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Hapus
                          </button>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500">
                        Mendukung format PNG, JPG, JPEG atau WebP. Maksimal ukuran file 2 MB.
                      </p>
                      {logoError && (
                        <p className="text-[11px] text-red-600 font-semibold mt-1">{logoError}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. Kategori PRESENSI */}
          {activeCategory === 'presensi' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
                  Kebijakan & Toleransi Presensi
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-normal">
                  Atur kepatuhan geolokasi, batas toleransi waktu, dan aturan jam kerja.
                </p>
              </div>

              <div className="space-y-5 text-xs">
                {/* Timezone (Read Only) */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 border-b border-slate-100 gap-2">
                  <div className="space-y-0.5 max-w-md">
                    <p className="font-bold text-slate-900">Zona Waktu Default</p>
                    <p className="text-slate-500 text-[11px]">Waktu default acuan sistem pencatatan database utama.</p>
                  </div>
                  <div className="bg-[#F3F4F6] border border-[#E5E7EB] text-[#4B5563] text-xs px-3.5 py-1.5 rounded-xl font-bold font-mono">
                    {formSettings.attendance.timezone}
                  </div>
                </div>

                {/* Late Tolerance (Minutes input) */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 border-b border-slate-100 gap-3">
                  <div className="space-y-0.5 max-w-md">
                    <p className="font-bold text-slate-900">Toleransi Keterlambatan</p>
                    <p className="text-slate-500 text-[11px] leading-relaxed">
                      Nilai toleransi kelonggaran jam masuk (dalam menit). <span className="font-medium text-slate-700">Nilai ini merupakan konfigurasi tampilan. Aturan presensi produksi tetap mengikuti Work Schedule.</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={120}
                      value={formSettings.attendance.lateTolerance}
                      onChange={(e) => setFormSettings((prev) => ({
                        ...prev,
                        attendance: { ...prev.attendance, lateTolerance: Math.max(0, parseInt(e.target.value) || 0) }
                      }))}
                      className="w-20 h-10 text-center text-sm font-semibold bg-slate-50 border border-slate-200 rounded-xl px-2 focus:outline-none focus:bg-white focus:border-[#F97316] font-mono"
                    />
                    <span className="font-semibold text-slate-600">menit</span>
                  </div>
                </div>

                {/* Location GPS Verification (Toggle) */}
                <div className="flex items-center justify-between py-3.5 border-b border-slate-100 gap-4">
                  <div className="space-y-0.5 max-w-md">
                    <p className="font-bold text-slate-900">Verifikasi Koordinat GPS & Lokasi</p>
                    <p className="text-slate-500 text-[11px] leading-relaxed">
                      Mewajibkan verifikasi jarak radius presensi pegawai. Pengaturan ini masih bersifat UI foundation dan belum mengubah logic backend.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormSettings((prev) => ({
                      ...prev,
                      attendance: { ...prev.attendance, gpsValidation: !prev.attendance.gpsValidation }
                    }))}
                    className={`relative inline-flex h-6.5 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      formSettings.attendance.gpsValidation ? 'bg-[#F97316]' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5.5 w-5.5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        formSettings.attendance.gpsValidation ? 'translate-x-4.5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Default radius (meters input) */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 gap-3">
                  <div className="space-y-0.5 max-w-md">
                    <p className="font-bold text-slate-900">Radius Validasi Default</p>
                    <p className="text-slate-500 text-[11px] leading-relaxed">
                      Jarak geofencing default dalam satuan meter. <span className="font-medium text-slate-700">Konfigurasi ini belum mengubah radius lokasi yang tersimpan pada database.</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={5}
                      max={1000}
                      value={formSettings.attendance.defaultRadius}
                      onChange={(e) => setFormSettings((prev) => ({
                        ...prev,
                        attendance: { ...prev.attendance, defaultRadius: Math.max(5, parseInt(e.target.value) || 5) }
                      }))}
                      className="w-24 h-10 text-center text-sm font-semibold bg-slate-50 border border-slate-200 rounded-xl px-2 focus:outline-none focus:bg-white focus:border-[#F97316] font-mono"
                    />
                    <span className="font-semibold text-slate-600">meter</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. Kategori TAMPILAN */}
          {activeCategory === 'tampilan' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
                  Preferensi Tampilan Aplikasi
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-normal">
                  Sesuaikan gaya visual antarmuka, kepadatan menu, dan tema palet warna.
                </p>
              </div>

              <div className="space-y-5 text-xs">
                {/* Theme Selector */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 border-b border-slate-100 gap-3">
                  <div className="space-y-0.5">
                    <p className="font-bold text-slate-900">Pilihan Tema</p>
                    <p className="text-slate-500 text-[11px]">Ganti mode gelap atau mode terang aplikasi.</p>
                  </div>
                  <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
                    {(['system', 'light', 'dark'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setFormSettings((prev) => ({
                          ...prev,
                          appearance: { ...prev.appearance, theme: t }
                        }))}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all uppercase tracking-wide ${
                          formSettings.appearance.theme === t 
                            ? 'bg-white text-slate-900 shadow-3xs' 
                            : 'text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        {t === 'system' ? 'Sistem' : t === 'light' ? 'Terang' : 'Gelap'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Accent Color Selector */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 border-b border-slate-100 gap-3">
                  <div className="space-y-0.5">
                    <p className="font-bold text-slate-900">Warna Aksen Brand</p>
                    <p className="text-slate-500 text-[11px]">Warna sorotan primer elemen tombol dan link aktif.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {[
                      { id: 'orange' as const, bg: 'bg-[#F97316]', label: 'Orange' },
                      { id: 'blue' as const, bg: 'bg-blue-600', label: 'Biru' },
                      { id: 'emerald' as const, bg: 'bg-emerald-600', label: 'Hijau' },
                      { id: 'indigo' as const, bg: 'bg-indigo-600', label: 'Indigo' },
                    ].map((col) => (
                      <button
                        key={col.id}
                        type="button"
                        onClick={() => setFormSettings((prev) => ({
                          ...prev,
                          appearance: { ...prev.appearance, accentColor: col.id }
                        }))}
                        title={col.label}
                        className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${col.bg} ${
                          formSettings.appearance.accentColor === col.id 
                            ? 'ring-3 ring-orange-100 border border-white scale-110 shadow-sm' 
                            : 'opacity-80 hover:opacity-100'
                        }`}
                      >
                        {formSettings.appearance.accentColor === col.id && (
                          <Check className="w-3.5 h-3.5 text-white" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Grid row density selector */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 gap-3">
                  <div className="space-y-0.5">
                    <p className="font-bold text-slate-900">Kepadatan Baris Tabel</p>
                    <p className="text-slate-500 text-[11px]">Kerapatan jarak spasi baris tabel rekapitulasi pegawai.</p>
                  </div>
                  <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
                    {(['comfortable', 'standard', 'compact'] as const).map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setFormSettings((prev) => ({
                          ...prev,
                          appearance: { ...prev.appearance, displayDensity: d }
                        }))}
                        className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all capitalize ${
                          formSettings.appearance.displayDensity === d 
                            ? 'bg-white text-slate-900 shadow-3xs' 
                            : 'text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        {d === 'comfortable' ? 'Nyaman' : d === 'standard' ? 'Standar' : 'Ringkas'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 4. Kategori NOTIFIKASI */}
          {activeCategory === 'notifikasi' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
                  Pengaturan Aliran Notifikasi
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-normal">
                  Kelola alert sistem, alert pengajuan, and pemberitahuan transaksi presensi.
                </p>
              </div>

              <div className="space-y-5 text-xs">
                {/* Attendance Alert Toggle */}
                <div className="flex items-center justify-between py-3.5 border-b border-slate-100 gap-4">
                  <div className="space-y-0.5 max-w-md">
                    <p className="font-bold text-slate-900">Notifikasi Transaksi Presensi</p>
                    <p className="text-slate-500 text-[11px] leading-relaxed">
                      Kirimkan alert instan setiap kali pegawai melakukan check-in atau check-out harian. <span className="font-medium text-slate-700">Pengaturan ini belum mengubah mekanisme notifikasi server pada fase ini.</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormSettings((prev) => ({
                      ...prev,
                      notification: { ...prev.notification, attendanceNotif: !prev.notification.attendanceNotif }
                    }))}
                    className={`relative inline-flex h-6.5 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      formSettings.notification.attendanceNotif ? 'bg-[#F97316]' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5.5 w-5.5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        formSettings.notification.attendanceNotif ? 'translate-x-4.5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Requests Alert Toggle */}
                <div className="flex items-center justify-between py-3.5 border-b border-slate-100 gap-4">
                  <div className="space-y-0.5 max-w-md">
                    <p className="font-bold text-slate-900">Notifikasi Pengajuan Cuti / Izin</p>
                    <p className="text-slate-500 text-[11px] leading-relaxed">
                      Beri tahu administrator mengenai adanya pengajuan izin baru dari staf pegawai. <span className="font-medium text-slate-700">Pengaturan ini belum mengubah mekanisme notifikasi server pada fase ini.</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormSettings((prev) => ({
                      ...prev,
                      notification: { ...prev.notification, requestNotif: !prev.notification.requestNotif }
                    }))}
                    className={`relative inline-flex h-6.5 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      formSettings.notification.requestNotif ? 'bg-[#F97316]' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5.5 w-5.5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        formSettings.notification.requestNotif ? 'translate-x-4.5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* System Alert Toggle */}
                <div className="flex items-center justify-between py-3.5 gap-4">
                  <div className="space-y-0.5 max-w-md">
                    <p className="font-bold text-slate-900">Notifikasi Sistem & Keamanan</p>
                    <p className="text-slate-500 text-[11px] leading-relaxed">
                      Kirim alert pengumuman libur nasional atau modifikasi parameter keamanan sistem. <span className="font-medium text-slate-700">Pengaturan ini belum mengubah mekanisme notifikasi server pada fase ini.</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormSettings((prev) => ({
                      ...prev,
                      notification: { ...prev.notification, systemNotif: !prev.notification.systemNotif }
                    }))}
                    className={`relative inline-flex h-6.5 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      formSettings.notification.systemNotif ? 'bg-[#F97316]' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5.5 w-5.5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        formSettings.notification.systemNotif ? 'translate-x-4.5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 5. Kategori SISTEM */}
          {activeCategory === 'sistem' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
                  Detail Teknis Platform (Read Only)
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-normal">
                  Informasi arsitektur platform aplikasi presensi dan status backend.
                </p>
              </div>

              <div className="space-y-4 text-xs font-mono">
                {/* App Version */}
                <div className="flex items-center justify-between py-3 border-b border-slate-100">
                  <span className="font-bold text-slate-700 uppercase tracking-tight">Versi Aplikasi</span>
                  <span className="text-slate-600 font-semibold">{APP_CONFIG.version}</span>
                </div>

                {/* Env Mode */}
                <div className="flex items-center justify-between py-3 border-b border-slate-100">
                  <span className="font-bold text-slate-700 uppercase tracking-tight">Lingkungan</span>
                  <Badge variant="primary" size="sm" className="font-bold font-mono">
                    {import.meta.env.MODE === 'production' ? 'Production' : 'Development'}
                  </Badge>
                </div>

                {/* Server Timezone */}
                <div className="flex items-center justify-between py-3 border-b border-slate-100">
                  <span className="font-bold text-slate-700 uppercase tracking-tight">Zona Waktu Sistem</span>
                  <span className="text-slate-600 font-semibold">{formSettings.system.sysTimezone}</span>
                </div>

                {/* Backend status with actual connectivity state and action trigger */}
                <div className="flex items-center justify-between py-3 border-b border-slate-100">
                  <span className="font-bold text-slate-700 uppercase tracking-tight">Status Konektivitas</span>
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    {connStatus === 'checking' && (
                      <div className="flex items-center gap-1.5 text-slate-500 font-semibold">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-400" />
                        <span>Memeriksa konektivitas...</span>
                      </div>
                    )}
                    {connStatus === 'connected' && (
                      <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Terhubung</span>
                      </div>
                    )}
                    {connStatus === 'disconnected' && (
                      <div className="flex items-center gap-1.5 text-red-700 font-bold">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        <span>Tidak terhubung</span>
                      </div>
                    )}
                    {connStatus === 'unavailable' && (
                      <div className="flex items-center gap-1.5 text-slate-500 font-semibold">
                        <span>Status tidak tersedia</span>
                      </div>
                    )}
                    
                    <button
                      type="button"
                      onClick={checkConnectivity}
                      disabled={connStatus === 'checking'}
                      className="text-xs font-bold text-[#F97316] hover:text-[#EA580C] underline cursor-pointer disabled:opacity-50 transition-colors ml-2"
                    >
                      Periksa kembali
                    </button>
                  </div>
                </div>

                {/* DB engine */}
                <div className="flex items-center justify-between py-3">
                  <span className="font-bold text-slate-700 uppercase tracking-tight">Mesin Database</span>
                  <span className="text-slate-600 font-bold">{formSettings.system.database}</span>
                </div>
              </div>
            </div>
          )}

          {/* 6. Kategori KEAMANAN */}
          {activeCategory === 'keamanan' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
                  Parameter Kepatuhan & Keamanan
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-normal">
                  Rincian otorisasi hak akses, enkripsi sesi, dan log audit keamanan.
                </p>
              </div>

              <div className="space-y-5 text-xs">
                {/* Audit Log Status */}
                <div className="flex flex-col py-3 border-b border-slate-100 gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">Pencatatan Audit Trail</span>
                    <Badge variant="success" size="sm" className="font-bold">Aktif</Badge>
                  </div>
                  <p className="text-slate-500 text-[11px] leading-relaxed">
                    Setiap mutasi data penting dicatat di tabel permanen. Aktivitas penting sistem dicatat pada Audit Log.
                  </p>
                </div>

                {/* Session Security info */}
                <div className="flex flex-col py-3 border-b border-slate-100 gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">Enkripsi Sesi Otoritas</span>
                    <Badge variant="success" size="sm" className="font-bold">Enkripsi Sesi Aktif</Badge>
                  </div>
                  <p className="text-slate-500 text-[11px] leading-relaxed">
                    {formSettings.security.sessionSec}
                  </p>
                </div>

                {/* User Role Mgmt redirect block */}
                <div className="flex flex-col py-3 gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">Manajemen Peran Pengguna</span>
                    <Badge variant="info" size="sm" className="font-bold">Otorisasi RBAC</Badge>
                  </div>
                  <p className="text-slate-500 text-[11px] leading-relaxed mb-1.5">
                    {formSettings.security.roleMgmt}
                  </p>
                  <a
                    href="/users"
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#F97316] hover:text-[#EA580C] transition-colors"
                  >
                    Buka Manajemen Pengguna &rarr;
                  </a>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Accessible Unsaved Changes Warning Dialog Modal */}
      {isGuardOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          {/* Scrim Overlay */}
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" 
            onClick={() => setIsUnsavedGuardOpen(false)} 
          />

          {/* Dialog Box */}
          <div className="relative bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-in zoom-in-95 duration-200 p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900">Perubahan Belum Disimpan</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Kategori pengaturan ini memiliki modifikasi isian yang belum disimpan. Jika Anda berpindah kategori sekarang, perubahan tersebut akan hilang.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsUnsavedGuardOpen(false);
                  setPendingCategory(null);
                }}
              >
                Tetap di Sini
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleConfirmDiscard}
              >
                Batal & Pindah
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
