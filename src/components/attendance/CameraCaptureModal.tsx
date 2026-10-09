import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera,
  RotateCcw,
  Check,
  X,
  Loader2,
  VideoOff,
  RefreshCw,
  Info,
} from 'lucide-react';
import { Button } from '../ui/Button';

export interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (blob: Blob) => void;
  title?: string;
  description?: string;
}

type CameraStatus = 'idle' | 'requesting' | 'streaming' | 'captured' | 'error';

const MAX_SELFIE_SIZE_BYTES = 1572864; // 1.5 MB strict limit (1024 * 1024 * 1.5)

/**
 * Helper to encode an HTMLCanvasElement into a JPEG Blob with a specific quality
 */
const canvasToJpegBlob = (
  canvas: HTMLCanvasElement,
  quality: number
): Promise<Blob | null> => {
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        resolve(blob);
      },
      'image/jpeg',
      quality
    );
  });
};

/**
 * Rescales from a single master source canvas to a target dimension
 */
const scaleCanvasFromSource = (
  sourceCanvas: HTMLCanvasElement,
  maxDimension: number
): HTMLCanvasElement | null => {
  const sWidth = sourceCanvas.width;
  const sHeight = sourceCanvas.height;

  if (!sWidth || !sHeight) {
    return null;
  }

  let tWidth = sWidth;
  let tHeight = sHeight;

  if (tWidth > maxDimension || tHeight > maxDimension) {
    if (tWidth >= tHeight) {
      tHeight = Math.round((tHeight / tWidth) * maxDimension);
      tWidth = maxDimension;
    } else {
      tWidth = Math.round((tWidth / tHeight) * maxDimension);
      tHeight = maxDimension;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = tWidth;
  canvas.height = tHeight;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return null;
  }

  ctx.drawImage(sourceCanvas, 0, 0, tWidth, tHeight);
  return canvas;
};

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onCapture,
  title = 'Ambil Foto Selfie Presensi',
  description = 'Posisikan wajah Anda tepat di dalam area panduan foto',
}) => {
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  // Lifecycle & Race condition guards
  const isMountedRef = useRef<boolean>(true);
  const isOpenRef = useRef<boolean>(isOpen);
  const requestIdRef = useRef<number>(0);
  const isStartingRef = useRef<boolean>(false);
  const isFallbackAttemptedRef = useRef<boolean>(false);

  // Sync isOpenRef on every render
  isOpenRef.current = isOpen;

  /**
   * Safely stops tracks of a specific stream and detaches it from the video element
   * ONLY if the video element is still bound to this specific stream.
   */
  const stopAndDetachStream = useCallback((targetStream: MediaStream | null) => {
    if (!targetStream) return;

    try {
      targetStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // Silent track stop safeguard
        }
      });
    } catch {
      // Silent enumeration safeguard
    }

    if (videoRef.current && videoRef.current.srcObject === targetStream) {
      videoRef.current.srcObject = null;
    }
  }, []);

  /**
   * Safely stops the currently owned stream and cleans up video element bindings
   */
  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      const current = streamRef.current;
      streamRef.current = null;
      stopAndDetachStream(current);
    } else if (videoRef.current && videoRef.current.srcObject) {
      const orphaned = videoRef.current.srcObject as MediaStream;
      if (orphaned && typeof orphaned.getTracks === 'function') {
        stopAndDetachStream(orphaned);
      } else {
        videoRef.current.srcObject = null;
      }
    }
  }, [stopAndDetachStream]);

  /**
   * Immediately revokes any active preview object URL to prevent memory leaks
   */
  const clearPreviewUrl = useCallback(() => {
    if (previewUrlRef.current) {
      try {
        URL.revokeObjectURL(previewUrlRef.current);
      } catch {
        // Silent revocation safeguard
      }
      previewUrlRef.current = null;
    }
    if (isMountedRef.current) {
      setPreviewUrl(null);
    }
  }, []);

  /**
   * Requests camera stream with explicit ownership registration,
   * synchronous in-flight lock, and safe video attachment.
   */
  const startCamera = useCallback(
    async (isFallback = false) => {
      // Synchronous in-flight lock: prevent parallel requests
      if (isStartingRef.current && !isFallback) {
        return;
      }

      if (!isOpenRef.current || !isMountedRef.current) {
        return;
      }

      // Check Secure Context & MediaDevices API Support
      if (typeof window === 'undefined' || !window.isSecureContext) {
        setCameraStatus('error');
        setErrorMessage(
          'Akses kamera memerlukan koneksi aman (HTTPS). Pastikan situs diakses melalui protokol HTTPS yang valid.'
        );
        return;
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraStatus('error');
        setErrorMessage(
          'Peramban atau perangkat Anda tidak mendukung API kamera web (MediaDevices).'
        );
        return;
      }

      // Lock acquisition & Request ID generation
      isStartingRef.current = true;
      const currentRequestId = ++requestIdRef.current;

      setCameraStatus('requesting');
      setErrorMessage(null);

      // Stop any existing stream before requesting a new one
      stopCameraStream();

      const constraints: MediaStreamConstraints = isFallback
        ? { video: true, audio: false }
        : {
            video: {
              facingMode: 'user',
              width: { ideal: 1280 },
              height: { ideal: 960 },
            },
            audio: false,
          };

      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);

        // Lifecycle check 1: If modal closed, unmounted, or superseded by a newer request
        if (
          !isMountedRef.current ||
          !isOpenRef.current ||
          requestIdRef.current !== currentRequestId
        ) {
          stopAndDetachStream(stream);
          return;
        }

        const videoEl = videoRef.current;
        if (!videoEl) {
          stopAndDetachStream(stream);
          setCameraStatus('error');
          setErrorMessage('Elemen pemutar video tidak tersedia.');
          return;
        }

        // 1. REGISTER STREAM OWNERSHIP BEFORE WAITING FOR video.play()
        if (streamRef.current && streamRef.current !== stream) {
          stopAndDetachStream(streamRef.current);
        }
        streamRef.current = stream;
        videoEl.srcObject = stream;

        // 2. Await video.play() to ensure playback readiness
        try {
          await videoEl.play();
        } catch {
          // Playback rejected or interrupted: stop stream and detach safely
          stopAndDetachStream(stream);
          if (streamRef.current === stream) {
            streamRef.current = null;
          }

          if (
            isMountedRef.current &&
            isOpenRef.current &&
            requestIdRef.current === currentRequestId
          ) {
            setCameraStatus('error');
            setErrorMessage(
              'Gagal memulai pemutaran pratinjau kamera pada perangkat Anda. Silakan coba kembali.'
            );
          }
          return;
        }

        // Lifecycle check 2: Post video.play() verification
        if (
          !isMountedRef.current ||
          !isOpenRef.current ||
          requestIdRef.current !== currentRequestId
        ) {
          stopAndDetachStream(stream);
          if (streamRef.current === stream) {
            streamRef.current = null;
          }
          return;
        }

        setCameraStatus('streaming');
      } catch (err: unknown) {
        // If request was superseded or cancelled, discard error silently
        if (
          !isMountedRef.current ||
          !isOpenRef.current ||
          requestIdRef.current !== currentRequestId
        ) {
          return;
        }

        // Check for OverconstrainedError: attempt limited single fallback
        if (
          err instanceof DOMException &&
          err.name === 'OverconstrainedError' &&
          !isFallback &&
          !isFallbackAttemptedRef.current
        ) {
          isFallbackAttemptedRef.current = true;
          // Release lock before recursive fallback call
          isStartingRef.current = false;
          await startCamera(true);
          return;
        }

        stopCameraStream();
        setCameraStatus('error');

        if (err instanceof DOMException) {
          switch (err.name) {
            case 'NotAllowedError':
            case 'PermissionDeniedError':
              setErrorMessage(
                'Izin akses kamera ditolak. Mohon izinkan akses kamera pada setelan peramban Anda untuk melakukan presensi.'
              );
              break;
            case 'NotFoundError':
            case 'DevicesNotFoundError':
              setErrorMessage(
                'Perangkat kamera tidak ditemukan. Pastikan kamera terpasang dan berfungsi dengan baik.'
              );
              break;
            case 'NotReadableError':
            case 'TrackStartError':
              setErrorMessage(
                'Kamera sedang digunakan oleh aplikasi lain atau mengalami kendala perangkat keras. Tutup aplikasi lain dan coba lagi.'
              );
              break;
            case 'OverconstrainedError':
              setErrorMessage(
                'Konfigurasi resolusi kamera tidak didukung oleh perangkat keras Anda.'
              );
              break;
            default:
              setErrorMessage(
                `Gagal mengaktifkan kamera (${err.name || 'Kesalahan Sistem'}). Silakan muat ulang atau periksa izin perangkat.`
              );
              break;
          }
        } else {
          setErrorMessage('Terjadi kendala saat membuka kamera perangkat.');
        }
      } finally {
        isStartingRef.current = false;
      }
    },
    [stopCameraStream, stopAndDetachStream]
  );

  /**
   * Synchronizes camera state with modal open/close lifecycle
   */
  useEffect(() => {
    isMountedRef.current = true;

    if (isOpen) {
      isFallbackAttemptedRef.current = false;
      setCapturedBlob(null);
      clearPreviewUrl();
      startCamera(false);
    } else {
      // Invalidate in-flight requests and stop hardware
      isStartingRef.current = false;
      requestIdRef.current += 1;
      stopCameraStream();
      clearPreviewUrl();
      setCameraStatus('idle');
      setErrorMessage(null);
      setCapturedBlob(null);
    }

    return () => {
      // Invalidate in-flight requests
      isStartingRef.current = false;
      requestIdRef.current += 1;
      stopCameraStream();
      clearPreviewUrl();
    };
  }, [isOpen, startCamera, stopCameraStream, clearPreviewUrl]);

  /**
   * Component unmount cleanup
   */
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      isStartingRef.current = false;
      requestIdRef.current += 1;
      stopCameraStream();
      if (previewUrlRef.current) {
        try {
          URL.revokeObjectURL(previewUrlRef.current);
        } catch {
          // Silent unmount cleanup safeguard
        }
        previewUrlRef.current = null;
      }
    };
  }, [stopCameraStream]);

  /**
   * Captures a SINGLE video frame as the source of truth,
   * then applies progressive multi-tier compression (1080/0.85 -> 900/0.65 -> 720/0.50)
   * on the exact same frame until a valid Blob <= 1.5 MB is obtained.
   */
  const handleCaptureFrame = async () => {
    const video = videoRef.current;
    if (!video || cameraStatus !== 'streaming') return;

    const sourceWidth = video.videoWidth;
    const sourceHeight = video.videoHeight;

    if (!sourceWidth || !sourceHeight) {
      setErrorMessage('Frame kamera belum siap. Tunggu beberapa saat dan coba kembali.');
      return;
    }

    // Invalidate any camera start requests during capture
    const captureRequestId = ++requestIdRef.current;

    // STEP 1: Freeze EXACTLY ONE master frame from the active video stream
    const masterCanvas = document.createElement('canvas');
    masterCanvas.width = sourceWidth;
    masterCanvas.height = sourceHeight;
    const masterCtx = masterCanvas.getContext('2d');

    if (!masterCtx) {
      setErrorMessage('Gagal menginisialisasi kanvas render citra.');
      return;
    }

    // Mirror context horizontally to match mirrored live preview
    masterCtx.save();
    masterCtx.translate(masterCanvas.width, 0);
    masterCtx.scale(-1, 1);
    masterCtx.drawImage(video, 0, 0, masterCanvas.width, masterCanvas.height);
    masterCtx.restore();

    // STEP 2: Multi-tier compression from the SINGLE master frame
    const compressionTiers = [
      { maxDimension: 1080, quality: 0.85 },
      { maxDimension: 900, quality: 0.65 },
      { maxDimension: 720, quality: 0.50 },
    ];

    let validatedBlob: Blob | null = null;

    for (const tier of compressionTiers) {
      const scaledCanvas = scaleCanvasFromSource(masterCanvas, tier.maxDimension);
      if (!scaledCanvas) continue;

      const candidateBlob = await canvasToJpegBlob(scaledCanvas, tier.quality);

      // Verify criteria: not null, size > 0, type image/jpeg, size <= 1,572,864 bytes
      if (
        candidateBlob &&
        candidateBlob.size > 0 &&
        candidateBlob.type === 'image/jpeg' &&
        candidateBlob.size <= MAX_SELFIE_SIZE_BYTES
      ) {
        validatedBlob = candidateBlob;
        break; // Stop iterations immediately upon finding first conforming Blob
      }
    }

    // Check cancellation or unmount before committing state
    if (
      !isMountedRef.current ||
      !isOpenRef.current ||
      requestIdRef.current !== captureRequestId
    ) {
      return;
    }

    // STEP 3: Handle encoding failure or size overflow
    if (!validatedBlob) {
      setErrorMessage(
        'Ukuran berkas foto selfie melebihi batas maksimum 1.5 MB setelah seluruh upaya kompresi. Silakan coba kembali.'
      );
      return;
    }

    // Stop hardware camera stream upon successful frame acceptance
    stopCameraStream();

    // Safely create and track new preview URL
    clearPreviewUrl();
    const url = URL.createObjectURL(validatedBlob);
    previewUrlRef.current = url;
    setPreviewUrl(url);
    setCapturedBlob(validatedBlob);
    setCameraStatus('captured');
  };

  /**
   * Safe retry handler preventing concurrent camera requests
   */
  const handleRetry = () => {
    if (isStartingRef.current || cameraStatus === 'requesting') return;
    startCamera(false);
  };

  /**
   * Resets capture state and restarts camera stream for retake
   */
  const handleRetake = () => {
    clearPreviewUrl();
    setCapturedBlob(null);
    startCamera(false);
  };

  /**
   * Emits the strictly validated Blob to caller without uploading or calling RPC
   */
  const handleConfirmUse = () => {
    if (
      !capturedBlob ||
      capturedBlob.size === 0 ||
      capturedBlob.type !== 'image/jpeg' ||
      capturedBlob.size > MAX_SELFIE_SIZE_BYTES
    ) {
      return;
    }
    onCapture(capturedBlob);
    stopCameraStream();
    clearPreviewUrl();
  };

  /**
   * Handles user cancellation or closing modal
   */
  const handleCancel = () => {
    isStartingRef.current = false;
    requestIdRef.current += 1;
    stopCameraStream();
    clearPreviewUrl();
    onClose();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4">
      <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#E5E7EB] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FFF7ED] border border-orange-200 text-[#F97316] flex items-center justify-center shrink-0">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-[#111827] leading-tight">
                {title}
              </h3>
              <p className="text-xs text-[#6B7280] mt-0.5">{description}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            aria-label="Tutup modal kamera"
            className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#111827] hover:bg-[#F3F4F6] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport Area */}
        <div className="p-4 sm:p-5 space-y-3">
          <div className="relative w-full aspect-3/4 sm:aspect-4/5 bg-gray-950 rounded-xl overflow-hidden flex items-center justify-center shadow-inner">
            {/* Live Streaming Video Element */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{ transform: 'scaleX(-1)' }}
              className={`w-full h-full object-cover transition-opacity duration-200 ${
                cameraStatus === 'streaming' ? 'opacity-100' : 'opacity-0 absolute'
              }`}
            />

            {/* Static Face Position Guide Overlay (Shown during live streaming) */}
            {cameraStatus === 'streaming' && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-4">
                {/* Oval guide */}
                <div className="w-48 h-64 sm:w-56 sm:h-72 border-2 border-dashed border-white/70 rounded-[50%] shadow-[0_0_0_9999px_rgba(0,0,0,0.30)] transition-all" />
                <span className="mt-3 px-3 py-1 rounded-full bg-black/60 backdrop-blur-xs text-[11px] font-medium text-white/90 text-center select-none">
                  Posisikan wajah Anda di dalam area panduan
                </span>
              </div>
            )}

            {/* Captured Still Preview Image */}
            {cameraStatus === 'captured' && previewUrl && (
              <div className="w-full h-full relative">
                <img
                  src={previewUrl}
                  alt="Pratinjau Foto Selfie"
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-3 left-3 right-3 py-1.5 px-3 rounded-lg bg-black/60 backdrop-blur-xs text-[11px] font-medium text-white text-center">
                  Pratinjau Hasil Foto
                </div>
              </div>
            )}

            {/* Loading / Requesting Spinner */}
            {cameraStatus === 'requesting' && (
              <div className="text-center p-6 space-y-2 text-white">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#F97316]" />
                <p className="text-xs font-medium text-gray-300">
                  Mengakses kamera perangkat...
                </p>
                <p className="text-[11px] text-gray-400">
                  Mohon izinkan akses kamera jika muncul permintaan izin pada browser
                </p>
              </div>
            )}

            {/* Error Display */}
            {cameraStatus === 'error' && (
              <div className="text-center p-6 space-y-3 text-white max-w-xs">
                <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mx-auto">
                  <VideoOff className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-red-200">Kamera Tidak Tersedia</p>
                  <p className="text-[11px] text-gray-300 leading-relaxed">
                    {errorMessage || 'Tidak dapat memuat aliran kamera perangkat.'}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRetry}
                  className="text-xs text-white border-white/30 hover:bg-white/10"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  Coba Lagi
                </Button>
              </div>
            )}
          </div>

          {/* Micro-copy information banner */}
          <div className="p-2.5 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] flex items-start gap-2 text-[11px] text-[#6B7280]">
            <Info className="w-4 h-4 text-[#F97316] shrink-0 mt-0.5" />
            <p>
              Pastikan pencahayaan cukup dan wajah terlihat jelas tanpa mengenakan masker tebal atau kacamata hitam.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-[#E5E7EB] bg-gray-50 flex items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={handleCancel}
            className="text-xs"
          >
            Batal
          </Button>

          {/* Streaming State: Capture Button */}
          {cameraStatus === 'streaming' && (
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={handleCaptureFrame}
              className="text-xs font-semibold"
            >
              <Camera className="w-4 h-4 mr-1.5" />
              Ambil Foto
            </Button>
          )}

          {/* Captured State: Retake and Confirm Buttons */}
          {cameraStatus === 'captured' && (
            <>
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={handleRetake}
                className="text-xs font-medium"
              >
                <RotateCcw className="w-4 h-4 mr-1.5" />
                Foto Ulang
              </Button>
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={handleConfirmUse}
                className="text-xs font-semibold"
              >
                <Check className="w-4 h-4 mr-1.5" />
                Gunakan Foto
              </Button>
            </>
          )}

          {/* Requesting State: Disabled Loading Button */}
          {cameraStatus === 'requesting' && (
            <Button
              type="button"
              variant="primary"
              size="md"
              disabled
              isLoading
              className="text-xs"
            >
              Memuat Kamera
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
