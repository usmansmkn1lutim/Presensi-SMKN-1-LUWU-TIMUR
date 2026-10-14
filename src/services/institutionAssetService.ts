import { supabase, isSupabaseConfigured } from '../lib/supabase';

export const SCHOOL_ASSETS_BUCKET = 'school-assets';
export const ALLOWED_LOGO_MIME_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'] as const;
export const MAX_LOGO_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

export type AllowedLogoMimeType = typeof ALLOWED_LOGO_MIME_TYPES[number];

export interface LogoValidationResult {
  valid: boolean;
  error: string | null;
}

export interface UploadLogoResult {
  success: boolean;
  publicUrl: string | null;
  path: string | null;
  error: string | null;
}

/**
 * Validasi client-side terhadap format dan ukuran file logo sebelum diunggah.
 * Format yang diizinkan: image/png, image/jpeg, image/jpg, image/webp.
 * Ukuran maksimal: 2MB (2,097,152 bytes).
 */
export const validateLogoFile = (file: { name?: string; type: string; size: number }): LogoValidationResult => {
  if (!file) {
    return { valid: false, error: 'File tidak ditemukan.' };
  }

  const normalizedType = file.type.toLowerCase().trim();
  const isMimeAllowed = (ALLOWED_LOGO_MIME_TYPES as readonly string[]).includes(normalizedType);

  // Periksa ekstensi file jika type kosong dari browser
  const ext = file.name ? file.name.split('.').pop()?.toLowerCase() : '';
  const isExtAllowed = ['png', 'jpg', 'jpeg', 'webp'].includes(ext || '');

  if (!isMimeAllowed && !isExtAllowed) {
    return {
      valid: false,
      error: 'Format file tidak didukung. Harap unggah file PNG, JPG, JPEG, atau WebP.',
    };
  }

  if (file.size > MAX_LOGO_FILE_SIZE_BYTES) {
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      error: `Ukuran file (${sizeInMB} MB) melebihi batas maksimal 2 MB.`,
    };
  }

  return { valid: true, error: null };
};

/**
 * Helper Service untuk mengunggah logo instansi ke bucket Supabase Storage 'school-assets'.
 */
export const institutionAssetService = {
  /**
   * Mengunggah file logo ke bucket `school-assets` path `logos/school-logo-[timestamp].[ext]`.
   * Menghasilkan Public URL permanen dari Supabase Storage.
   */
  async uploadSchoolLogo(file: File): Promise<UploadLogoResult> {
    // 1. Validasi awal
    const validation = validateLogoFile(file);
    if (!validation.valid) {
      return {
        success: false,
        publicUrl: null,
        path: null,
        error: validation.error,
      };
    }

    if (!isSupabaseConfigured()) {
      return {
        success: false,
        publicUrl: null,
        path: null,
        error: 'Supabase client belum terkonfigurasi. Tidak dapat mengunggah ke penyimpanan cloud.',
      };
    }

    try {
      // 2. Tentukan nama file yang aman (mencegah path traversal dan nama acak bentrok)
      const rawExt = file.name ? file.name.split('.').pop()?.toLowerCase() : 'png';
      const cleanExt = ['png', 'jpg', 'jpeg', 'webp'].includes(rawExt || '') ? rawExt : 'png';
      const timestamp = Date.now();
      const filePath = `logos/school-logo-${timestamp}.${cleanExt}`;

      // 3. Eksekusi upload ke bucket 'school-assets'
      const { data, error: uploadError } = await supabase.storage
        .from(SCHOOL_ASSETS_BUCKET)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type || `image/${cleanExt}`,
        });

      if (uploadError) {
        console.error('institutionAssetService: Upload logo gagal:', uploadError);
        return {
          success: false,
          publicUrl: null,
          path: null,
          error: uploadError.message || 'Gagal mengunggah logo ke Supabase Storage.',
        };
      }

      // 4. Dapatkan public URL dari bucket publik
      const { data: urlData } = supabase.storage
        .from(SCHOOL_ASSETS_BUCKET)
        .getPublicUrl(data?.path || filePath);

      return {
        success: true,
        publicUrl: urlData.publicUrl,
        path: data?.path || filePath,
        error: null,
      };
    } catch (err: any) {
      console.error('institutionAssetService: Terjadi kesalahan upload tak terduga:', err);
      return {
        success: false,
        publicUrl: null,
        path: null,
        error: err.message || 'Terjadi kesalahan sistem saat mengunggah file logo.',
      };
    }
  },

  /**
   * Menghapus file aset dari bucket jika diperlukan (misal rollback).
   */
  async removeAsset(filePath: string): Promise<boolean> {
    if (!isSupabaseConfigured() || !filePath) return false;

    try {
      const { error } = await supabase.storage
        .from(SCHOOL_ASSETS_BUCKET)
        .remove([filePath]);

      if (error) {
        console.warn('institutionAssetService: Gagal menghapus file aset lama:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('institutionAssetService: Kesalahan saat memanggil remove asset:', err);
      return false;
    }
  },
};
