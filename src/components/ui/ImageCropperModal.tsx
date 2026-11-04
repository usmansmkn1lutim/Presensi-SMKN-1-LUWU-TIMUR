import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  Move,
  Check,
  RotateCcw,
  Crop,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react';
import { Button } from './Button';

interface ImageCropperModalProps {
  isOpen: boolean;
  imageFile: File | null;
  onClose: () => void;
  onCropComplete: (croppedFile: File) => Promise<void> | void;
  title?: string;
}

const CROP_SIZE = 280; // Viewport size in pixels inside modal

export const ImageCropperModal: React.FC<ImageCropperModalProps> = ({
  isOpen,
  imageFile,
  onClose,
  onCropComplete,
  title = 'Potong Foto Profil',
}) => {
  const [stage, setStage] = useState<'crop' | 'preview'>('crop');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [naturalDimensions, setNaturalDimensions] = useState<{ width: number; height: number } | null>(null);
  
  // Cropper interactive state
  const [userZoom, setUserZoom] = useState<number>(1.0); // 1.0x to 3.0x
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Preview stage state
  const [croppedPreviewUrl, setCroppedPreviewUrl] = useState<string | null>(null);
  const [croppedFile, setCroppedFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const imageRef = useRef<HTMLImageElement>(null);

  // Load file and create ObjectURL
  useEffect(() => {
    if (isOpen && imageFile) {
      const url = URL.createObjectURL(imageFile);
      setImageUrl(url);
      setStage('crop');
      setUserZoom(1.0);
      setPan({ x: 0, y: 0 });
      setCroppedPreviewUrl(null);
      setCroppedFile(null);
      setErrorMsg(null);

      const img = new Image();
      img.onload = () => {
        setNaturalDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.src = url;

      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [isOpen, imageFile]);

  // Cleanup cropped preview URL on unmount or close
  useEffect(() => {
    return () => {
      if (croppedPreviewUrl) {
        URL.revokeObjectURL(croppedPreviewUrl);
      }
    };
  }, [croppedPreviewUrl]);

  if (!isOpen || !imageFile || !imageUrl) return null;

  // Calculate scales and bounds
  const naturalWidth = naturalDimensions?.width || 1000;
  const naturalHeight = naturalDimensions?.height || 1000;
  
  // Base fit scale so image fills the CROP_SIZE square completely
  const baseFitScale = Math.max(CROP_SIZE / naturalWidth, CROP_SIZE / naturalHeight);
  const currentScale = baseFitScale * userZoom;

  const renderedWidth = naturalWidth * currentScale;
  const renderedHeight = naturalHeight * currentScale;

  const maxPanX = Math.max(0, (renderedWidth - CROP_SIZE) / 2);
  const maxPanY = Math.max(0, (renderedHeight - CROP_SIZE) / 2);

  const clampPan = (x: number, y: number) => {
    return {
      x: Math.min(maxPanX, Math.max(-maxPanX, x)),
      y: Math.min(maxPanY, Math.max(-maxPanY, y)),
    };
  };

  // Adjust zoom while keeping pan within bounds
  const handleZoomChange = (newZoom: number) => {
    const clampedZoom = Math.min(3.0, Math.max(1.0, newZoom));
    setUserZoom(clampedZoom);

    // Recalculate max pan for new zoom
    const newScale = baseFitScale * clampedZoom;
    const newRenderedW = naturalWidth * newScale;
    const newRenderedH = naturalHeight * newScale;
    const newMaxX = Math.max(0, (newRenderedW - CROP_SIZE) / 2);
    const newMaxY = Math.max(0, (newRenderedH - CROP_SIZE) / 2);

    setPan((prev) => ({
      x: Math.min(newMaxX, Math.max(-newMaxX, prev.x)),
      y: Math.min(newMaxY, Math.max(-newMaxY, prev.y)),
    }));
  };

  // Drag / Pan Mouse handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setPanStart({ ...pan });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    setPan(clampPan(panStart.x + deltaX, panStart.y + deltaY));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Drag / Pan Touch handlers for Mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
      setPanStart({ ...pan });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const deltaX = e.touches[0].clientX - dragStart.x;
    const deltaY = e.touches[0].clientY - dragStart.y;
    setPan(clampPan(panStart.x + deltaX, panStart.y + deltaY));
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleResetPosition = () => {
    setUserZoom(1.0);
    setPan({ x: 0, y: 0 });
  };

  // Export cropped 1:1 square canvas to file
  const generateCroppedFile = (): Promise<{ file: File; previewUrl: string }> => {
    return new Promise((resolve, reject) => {
      if (!imageRef.current) {
        reject(new Error('Elemen gambar tidak ditemukan.'));
        return;
      }

      const OUTPUT_SIZE = 512;
      const canvas = document.createElement('canvas');
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Gagal menginisialisasi konteks canvas 2D.'));
        return;
      }

      // Calculate source crop box in natural image coordinates
      const srcW = CROP_SIZE / currentScale;
      const srcH = CROP_SIZE / currentScale;
      const srcX = naturalWidth / 2 - pan.x / currentScale - srcW / 2;
      const srcY = naturalHeight / 2 - pan.y / currentScale - srcH / 2;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(
        imageRef.current,
        srcX,
        srcY,
        srcW,
        srcH,
        0,
        0,
        OUTPUT_SIZE,
        OUTPUT_SIZE
      );

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Gagal memproses hasil pemotongan foto.'));
            return;
          }
          const croppedFileName = imageFile.name.replace(/\.[^/.]+$/, '') + '-cropped.png';
          const file = new File([blob], croppedFileName, {
            type: 'image/png',
            lastModified: Date.now(),
          });
          const previewUrl = URL.createObjectURL(blob);
          resolve({ file, previewUrl });
        },
        'image/png',
        1.0
      );
    });
  };

  const handleProceedToPreview = async () => {
    try {
      setErrorMsg(null);
      const { file, previewUrl } = await generateCroppedFile();
      setCroppedFile(file);
      setCroppedPreviewUrl(previewUrl);
      setStage('preview');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan saat memotong foto.';
      setErrorMsg(msg);
    }
  };

  const handleSaveCroppedPhoto = async () => {
    if (!croppedFile) return;
    setIsSaving(true);
    setErrorMsg(null);
    try {
      await onCropComplete(croppedFile);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan foto profil.';
      setErrorMsg(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col my-auto">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#E5E7EB] flex items-center justify-between shrink-0 bg-gray-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#FFF7ED] border border-orange-200 text-[#F97316] flex items-center justify-center">
              <Crop className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#111827]">{title}</h3>
              <p className="text-[11px] text-[#6B7280]">
                {stage === 'crop'
                  ? 'Langkah 1 dari 2: Atur Posisi & Skala Foto'
                  : 'Langkah 2 dari 2: Pratinjau & Konfirmasi Foto'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#111827] hover:bg-[#F3F4F6] transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mx-5 mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
            {errorMsg}
          </div>
        )}

        {/* Content Body */}
        <div className="p-5 flex flex-col items-center justify-center space-y-4">
          {stage === 'crop' ? (
            <>
              {/* Cropper Viewport Container */}
              <div className="relative flex flex-col items-center justify-center select-none">
                <div
                  className="relative overflow-hidden rounded-2xl bg-gray-950 border-2 border-gray-300 shadow-inner cursor-grab active:cursor-grabbing touch-none"
                  style={{ width: `${CROP_SIZE}px`, height: `${CROP_SIZE}px` }}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                >
                  {/* Draggable Image */}
                  <img
                    ref={imageRef}
                    src={imageUrl}
                    alt="To Crop"
                    draggable={false}
                    className="absolute max-w-none origin-center transition-transform duration-75"
                    style={{
                      width: `${renderedWidth}px`,
                      height: `${renderedHeight}px`,
                      left: `${CROP_SIZE / 2 - renderedWidth / 2 + pan.x}px`,
                      top: `${CROP_SIZE / 2 - renderedHeight / 2 + pan.y}px`,
                    }}
                  />

                  {/* Circular Overlay Visual Guide */}
                  <svg
                    className="absolute inset-0 w-full h-full pointer-events-none z-10"
                    viewBox={`0 0 ${CROP_SIZE} ${CROP_SIZE}`}
                  >
                    <defs>
                      <mask id="circle-cutout-mask">
                        <rect x="0" y="0" width={CROP_SIZE} height={CROP_SIZE} fill="white" />
                        <circle cx={CROP_SIZE / 2} cy={CROP_SIZE / 2} r={CROP_SIZE / 2 - 12} fill="black" />
                      </mask>
                    </defs>
                    {/* Darkened mask outside circle */}
                    <rect
                      x="0"
                      y="0"
                      width={CROP_SIZE}
                      height={CROP_SIZE}
                      fill="rgba(0, 0, 0, 0.55)"
                      mask="url(#circle-cutout-mask)"
                    />
                    {/* Crisp circular ring border */}
                    <circle
                      cx={CROP_SIZE / 2}
                      cy={CROP_SIZE / 2}
                      r={CROP_SIZE / 2 - 12}
                      fill="none"
                      stroke="#F97316"
                      strokeWidth="2"
                      strokeDasharray="6 4"
                      className="opacity-80"
                    />
                    <circle
                      cx={CROP_SIZE / 2}
                      cy={CROP_SIZE / 2}
                      r={CROP_SIZE / 2 - 12}
                      fill="none"
                      stroke="#FFFFFF"
                      strokeWidth="1.5"
                    />
                  </svg>
                </div>

                <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-[#6B7280]">
                  <Move className="w-3.5 h-3.5 text-[#F97316]" />
                  <span>Geser foto untuk menyesuaikan posisi wajah</span>
                </div>
              </div>

              {/* Interactive Zoom Controls */}
              <div className="w-full max-w-xs space-y-2 pt-1 border-t border-[#E5E7EB]">
                <div className="flex items-center justify-between text-xs text-[#374151]">
                  <span className="font-semibold flex items-center gap-1">
                    <ZoomIn className="w-3.5 h-3.5 text-[#F97316]" /> Perbesar / Zoom
                  </span>
                  <span className="font-mono text-[11px] text-[#6B7280]">
                    {userZoom.toFixed(1)}x
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleZoomChange(userZoom - 0.2)}
                    disabled={userZoom <= 1.0}
                    className="p-1.5 rounded-lg border border-[#E5E7EB] hover:bg-gray-100 disabled:opacity-40 text-gray-700 cursor-pointer"
                    title="Perkecil"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>

                  <input
                    type="range"
                    min="1.0"
                    max="3.0"
                    step="0.05"
                    value={userZoom}
                    onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
                    className="w-full accent-[#F97316] h-1.5 bg-gray-200 rounded-lg cursor-pointer"
                  />

                  <button
                    type="button"
                    onClick={() => handleZoomChange(userZoom + 0.2)}
                    disabled={userZoom >= 3.0}
                    className="p-1.5 rounded-lg border border-[#E5E7EB] hover:bg-gray-100 disabled:opacity-40 text-gray-700 cursor-pointer"
                    title="Perbesar"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={handleResetPosition}
                    className="p-1.5 rounded-lg border border-[#E5E7EB] hover:bg-orange-50 text-orange-600 cursor-pointer ml-1"
                    title="Riset Posisi"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* Stage 2: Preview Stage */
            <div className="w-full space-y-4 text-center">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-center gap-2 text-xs text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Pratinjau hasil potong. Foto siap disimpan ke sistem.</span>
              </div>

              {/* Side by Side Preview (Square vs Circular Avatar) */}
              <div className="flex items-center justify-center gap-6 py-2">
                {/* 1:1 Square File Preview */}
                <div className="flex flex-col items-center gap-2">
                  <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-xl border border-gray-300 shadow-xs overflow-hidden bg-gray-100">
                    {croppedPreviewUrl && (
                      <img
                        src={croppedPreviewUrl}
                        alt="Hasil Potong Persegi"
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <span className="text-[11px] font-semibold text-[#6B7280]">
                    File Persegi 1:1
                  </span>
                </div>

                {/* Circular Avatar Preview */}
                <div className="flex flex-col items-center gap-2">
                  <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full border-2 border-[#F97316] shadow-sm overflow-hidden bg-[#FFF7ED]">
                    {croppedPreviewUrl && (
                      <img
                        src={croppedPreviewUrl}
                        alt="Hasil Avatar Profil"
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <span className="text-[11px] font-semibold text-[#6B7280]">
                    Avatar Profil
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-[#E5E7EB] flex items-center justify-between shrink-0 bg-gray-50/50">
          {stage === 'crop' ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
              >
                Batal
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleProceedToPreview}
              >
                Lanjutkan
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setStage('crop')}
                disabled={isSaving}
                leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
              >
                Kembali
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleSaveCroppedPhoto}
                isLoading={isSaving}
                leftIcon={<Check className="w-3.5 h-3.5" />}
              >
                Simpan Foto
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
