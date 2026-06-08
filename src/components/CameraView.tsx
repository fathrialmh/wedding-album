"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

export type CameraViewHandle = {
  capture: () => Promise<Blob | null>;
  flipCamera: () => void;
};

type CameraViewProps = {
  onCapture?: (blob: Blob) => void;
  disabled?: boolean;
};

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function isMobileDevice(): boolean {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

const CameraView = forwardRef<CameraViewHandle, CameraViewProps>(
  function CameraView({ onCapture, disabled = false }, ref) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const sessionRef = useRef(0);

    const [facingMode, setFacingMode] = useState<"environment" | "user">(
      () => (isMobileDevice() ? "environment" : "user"),
    );
    const [error, setError] = useState<string | null>(null);
    const [ready, setReady] = useState(false);
    const [useFallback, setUseFallback] = useState(false);

    const stopStream = useCallback(() => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }, []);

    const startCamera = useCallback(async () => {
      const session = ++sessionRef.current;
      const isCurrentSession = () => sessionRef.current === session;

      stopStream();
      setReady(false);
      setError(null);
      setUseFallback(false);

      if (!navigator.mediaDevices?.getUserMedia) {
        setUseFallback(true);
        setError("Kamera tidak tersedia. Gunakan tombol unggah di bawah.");
        return;
      }

      const videoConstraints: MediaTrackConstraints[] = [
        {
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        {
          facingMode: facingMode === "environment" ? "user" : "environment",
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        true,
      ];

      try {
        let stream: MediaStream | null = null;

        for (const video of videoConstraints) {
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video,
              audio: false,
            });
            break;
          } catch (constraintError) {
            if (video === videoConstraints[videoConstraints.length - 1]) {
              throw constraintError;
            }
          }
        }

        if (!stream || !isCurrentSession()) {
          stream?.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          try {
            await video.play();
          } catch (playError) {
            if (!isCurrentSession() || isAbortError(playError)) {
              return;
            }
            throw playError;
          }
        }

        if (!isCurrentSession()) {
          return;
        }

        setReady(true);
        setUseFallback(false);
      } catch (cameraError) {
        if (!isCurrentSession() || isAbortError(cameraError)) {
          return;
        }

        console.error(cameraError);
        setUseFallback(true);
        setError(
          "Izin kamera ditolak atau tidak tersedia. Gunakan unggah foto.",
        );
      }
    }, [facingMode, stopStream]);

    useEffect(() => {
      void startCamera();

      return () => {
        sessionRef.current += 1;
        stopStream();
      };
    }, [startCamera, stopStream]);

    const captureFrame = useCallback(async (): Promise<Blob | null> => {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (!video || !canvas || !ready) {
        return null;
      }

      const width = video.videoWidth;
      const height = video.videoHeight;

      if (!width || !height) {
        return null;
      }

      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext("2d");

      if (!context) {
        return null;
      }

      context.drawImage(video, 0, 0, width, height);

      return new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.92);
      });
    }, [ready]);

    useImperativeHandle(
      ref,
      () => ({
        capture: captureFrame,
        flipCamera: () => {
          setFacingMode((current) =>
            current === "environment" ? "user" : "environment",
          );
        },
      }),
      [captureFrame],
    );

    async function handleFileChange(
      event: React.ChangeEvent<HTMLInputElement>,
    ) {
      const file = event.target.files?.[0];

      if (!file || disabled) {
        return;
      }

      onCapture?.(file);
      event.target.value = "";
    }

    return (
      <div className="relative h-full w-full overflow-hidden bg-black">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`h-full w-full object-cover ${useFallback ? "hidden" : ""}`}
        />

        {useFallback ? (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 px-6 text-center">
            <p className="text-sm text-white/70">{error}</p>
          </div>
        ) : null}

        <canvas ref={canvasRef} className="hidden" />

        {useFallback ? (
          <div className="absolute inset-x-0 bottom-6 flex justify-center">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              className="rounded-full bg-white px-5 py-2 text-sm font-medium text-black disabled:opacity-50"
            >
              Unggah Foto
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        ) : null}
      </div>
    );
  },
);

export default CameraView;
