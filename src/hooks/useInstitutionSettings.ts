import { useState, useEffect } from 'react';
import {
  systemSettingsService,
  SETTINGS_UPDATED_EVENT,
} from '../services/systemSettingsService';
import { GeneralSettings } from '../types/settings.types';

/**
 * Hook untuk membaca identitas instansi (nama sekolah, logo, dsb) secara reaktif.
 * Terhubung langsung dengan konfigurasi di menu Settings -> Pengaturan Umum Instansi.
 */
export const useInstitutionSettings = (): GeneralSettings => {
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings>(() => {
    return systemSettingsService.getGeneralSettings();
  });

  useEffect(() => {
    const handleUpdate = () => {
      setGeneralSettings(systemSettingsService.getGeneralSettings());
    };

    window.addEventListener(SETTINGS_UPDATED_EVENT, handleUpdate);
    window.addEventListener('storage', handleUpdate);

    // Sinkronisasi data remote di latar belakang saat hook pertama kali dimuat
    systemSettingsService.fetchSettingsFromRemote().catch((err) => {
      console.debug('useInstitutionSettings: Background sync error:', err);
    });

    return () => {
      window.removeEventListener(SETTINGS_UPDATED_EVENT, handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  return generalSettings;
};
