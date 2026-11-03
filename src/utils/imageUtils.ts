/**
 * Image Utility for WebP conversion, resizing, and validation.
 */

export interface ProcessedImageResult {
  blob: Blob;
  file: File;
  width: number;
  height: number;
  size: number;
}

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB
const MAX_DIMENSION = 512;
const TARGET_QUALITY = 0.82;

export async function processImageToWebP(inputFiles: File | FileList): Promise<ProcessedImageResult> {
  const file = inputFiles instanceof FileList ? inputFiles[0] : inputFiles;
  if (!file) {
    throw new Error('Tidak ada file gambar yang dipilih.');
  }

  // 1. Validate MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error('Format file tidak didukung. Harap unggah gambar berformat JPEG, PNG, atau WebP.');
  }

  // 2. Validate file size (max 2 MB)
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('Ukuran file terlalu besar. Maksimal ukuran file adalah 2 MB.');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          let width = img.width;
          let height = img.height;

          // Resize maintaining aspect ratio if exceeding MAX_DIMENSION (512x512)
          if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
            if (width > height) {
              height = Math.round((height * MAX_DIMENSION) / width);
              width = MAX_DIMENSION;
            } else {
              width = Math.round((width * MAX_DIMENSION) / height);
              height = MAX_DIMENSION;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Gagal menginisialisasi konteks canvas gambar.'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Gagal mengonversi gambar ke format WebP.'));
                return;
              }

              const webpFileName = `${crypto.randomUUID()}.webp`;
              const processedFile = new File([blob], webpFileName, {
                type: 'image/webp',
                lastModified: Date.now(),
              });

              resolve({
                blob,
                file: processedFile,
                width,
                height,
                size: blob.size,
              });
            },
            'image/webp',
            TARGET_QUALITY
          );
        } catch (err) {
          reject(new Error('Terjadi kesalahan saat memproses gambar.'));
        }
      };

      img.onerror = () => {
        reject(new Error('Gagal memuat file gambar. File mungkin rusak atau tidak valid.'));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Gagal membaca file gambar.'));
    };

    reader.readAsDataURL(file);
  });
}
