'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type MlConnectionStatus = 'checking' | 'online' | 'offline';

interface UseGestureCameraOptions {
  onError?: (message: string) => void;
}

/**
 * Manages webcam stream with video/canvas refs always mounted in the DOM.
 * Fixes "Start Camera does nothing" when <video> was conditionally rendered.
 */
export function useGestureCamera(options: UseGestureCameraOptions = {}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [cameraError, setCameraError] = useState('');

  const reportError = useCallback(
    (message: string) => {
      setCameraError(message);
      options.onError?.(message);
    },
    [options]
  );

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setCameraStarting(false);
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError('');

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      reportError(
        'Camera is not available. Use HTTPS or open the app at http://localhost:3000 (not a LAN IP without SSL).'
      );
      return false;
    }

    setCameraStarting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
      });
      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) {
        reportError('Camera element not ready. Please try again.');
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        return false;
      }

      video.srcObject = stream;
      await video.play();
      setCameraActive(true);
      return true;
    } catch (err: unknown) {
      const name = err instanceof DOMException ? err.name : '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        reportError('Camera permission denied. Allow camera access in your browser settings.');
      } else if (name === 'NotFoundError') {
        reportError('No camera found on this device.');
      } else {
        reportError('Could not start camera. Check permissions and try again.');
      }
      console.error('startCamera failed:', err);
      return false;
    } finally {
      setCameraStarting(false);
    }
  }, [reportError]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const captureFrameBase64 = useCallback((): string | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return null;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.8);
  }, []);

  return {
    videoRef,
    canvasRef,
    cameraActive,
    cameraStarting,
    cameraError,
    startCamera,
    stopCamera,
    captureFrameBase64,
    clearCameraError: () => setCameraError(''),
  };
}
