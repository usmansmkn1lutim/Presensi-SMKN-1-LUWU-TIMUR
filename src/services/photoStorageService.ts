/**
 * Photo Storage Service for Supabase private bucket `profile-photos`.
 * Handles uploads, signed URL generation with in-memory cache, and object deletion.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface CachedSignedUrl {
  url: string;
  expiresAt: number;
}

const signedUrlCache = new Map<string, CachedSignedUrl>();
const SIGNED_URL_TTL_SECONDS = 300; // 5 minutes
const TTL_BUFFER_SECONDS = 60; // refresh 60s before expiry
const UUID_PATTERN = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';
const UUID_REGEX = `^${UUID_PATTERN}$`;

/**
 * Validates storage path matches:
 * - profiles/{uuid}/{uuid}.webp
 * - employees/{uuid}/{uuid}.webp
 */
export function validateStoragePath(path: string | null | undefined): boolean {
  if (!path || typeof path !== 'string') return false;

  const segments = path.split('/');
  if (segments.length !== 3) return false;

  const [folder, entityId, fileName] = segments;

  if (folder !== 'profiles' && folder !== 'employees') return false;

  const uuidRegex = new RegExp(UUID_REGEX);
  if (!uuidRegex.test(entityId)) return false;

  const fileNameRegex = new RegExp(`^${UUID_PATTERN}\\.webp$`);
  if (!fileNameRegex.test(fileName)) return false;

  return true;
}

/**
 * Upload profile photo to profiles/{userId}/{uuid}.webp
 */
export async function uploadProfilePhoto(userId: string, file: File): Promise<string> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase configuration is missing.');
  }

  const uuidRegex = new RegExp(UUID_REGEX);
  if (!uuidRegex.test(userId)) {
    throw new Error('User ID tidak valid.');
  }

  const photoId = crypto.randomUUID();
  const path = `profiles/${userId}/${photoId}.webp`;

  const { error } = await supabase.storage
    .from('profile-photos')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: 'image/webp',
    });

  if (error) {
    throw new Error(`Gagal mengunggah foto profil: ${error.message}`);
  }

  return path;
}

/**
 * Upload employee photo to employees/{employeeId}/{uuid}.webp
 */
export async function uploadEmployeePhoto(employeeId: string, file: File): Promise<string> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase configuration is missing.');
  }

  const uuidRegex = new RegExp(UUID_REGEX);
  if (!uuidRegex.test(employeeId)) {
    throw new Error('Employee ID tidak valid.');
  }

  const photoId = crypto.randomUUID();
  const path = `employees/${employeeId}/${photoId}.webp`;

  const { error } = await supabase.storage
    .from('profile-photos')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: 'image/webp',
    });

  if (error) {
    throw new Error(`Gagal mengunggah foto GTK: ${error.message}`);
  }

  return path;
}

/**
 * Get private photo signed URL with in-memory caching.
 */
export async function getPrivatePhotoSignedUrl(path: string | null | undefined): Promise<string | null> {
  if (!path || !isSupabaseConfigured()) {
    return null;
  }

  if (!validateStoragePath(path)) {
    // If path is an external http URL (legacy or fallback), return as is
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    return null;
  }

  const cached = signedUrlCache.get(path);
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    return cached.url;
  }

  try {
    const { data, error } = await supabase.storage
      .from('profile-photos')
      .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

    if (error || !data?.signedUrl) {
      console.warn('Failed to create signed URL for path:', path, error?.message);
      return null;
    }

    const signedUrl = data.signedUrl;
    const expiresAt = now + (SIGNED_URL_TTL_SECONDS - TTL_BUFFER_SECONDS) * 1000;
    signedUrlCache.set(path, { url: signedUrl, expiresAt });

    return signedUrl;
  } catch (err) {
    console.warn('Error generating signed URL:', err);
    return null;
  }
}

/**
 * Delete photo object from storage after verification.
 */
export async function deletePhotoObject(path: string | null | undefined): Promise<void> {
  if (!path || !isSupabaseConfigured()) return;

  if (!validateStoragePath(path)) {
    return;
  }

  try {
    const { error } = await supabase.storage
      .from('profile-photos')
      .remove([path]);

    if (error) {
      console.warn('Failed to delete storage object:', error.message);
    } else {
      signedUrlCache.delete(path);
    }
  } catch (err) {
    console.warn('Error deleting photo object:', err);
  }
}
