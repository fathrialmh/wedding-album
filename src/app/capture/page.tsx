"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CameraView, { type CameraViewHandle } from "@/components/CameraView";
import ShutterButton from "@/components/ShutterButton";
import { PHOTO_LIMIT, WEDDING_TITLE } from "@/lib/constants";
import { getDeviceId, getGuestName } from "@/lib/device";
import type { GuestStatus, UploadResult } from "@/types";

type RecentCapture = {
  id: string;
  previewUrl: string;
  status: "pending" | "saved" | "failed";
};

const MAX_RECENT_CAPTURES = 5;

export default function CapturePage() {
  const router = useRouter();
  const cameraRef = useRef<CameraViewHandle>(null);
  const previewUrlsRef = useRef<Set<string>>(new Set());

  const [status, setStatus] = useState<GuestStatus | null>(null);
  const [recentCaptures, setRecentCaptures] = useState<RecentCapture[]>([]);
  const [pendingUploads, setPendingUploads] = useState(0);
  const [previewCapture, setPreviewCapture] = useState<RecentCapture | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const remaining = status?.remaining ?? PHOTO_LIMIT;
  const canCapture = remaining > 0;

  useEffect(() => {
    let active = true;

    async function loadGuestStatus() {
      const deviceId = getDeviceId();
      const guestName = getGuestName();

      if (!guestName) {
        router.replace("/");
        return;
      }

      const response = await fetch(`/api/guest?device_id=${deviceId}`);
      const data = (await response.json()) as GuestStatus & {
        registered?: boolean;
        error?: string;
      };

      if (!active) {
        return;
      }

      if (!response.ok || !data.registered) {
        router.replace("/");
        return;
      }

      setStatus({
        name: data.name,
        photo_count: data.photo_count,
        remaining: data.remaining,
        photo_limit: data.photo_limit,
      });
      setLoading(false);
    }

    void loadGuestStatus();

    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach((url) => {
        URL.revokeObjectURL(url);
      });
      previewUrlsRef.current.clear();
    };
  }, []);

  function updateRecentCaptureStatus(
    captureId: string,
    nextStatus: RecentCapture["status"],
  ) {
    setRecentCaptures((current) =>
      current.map((capture) =>
        capture.id === captureId ? { ...capture, status: nextStatus } : capture,
      ),
    );
  }

  function pushRecentCapture(blob: Blob): string {
    const captureId = crypto.randomUUID();
    const previewUrl = URL.createObjectURL(blob);
    previewUrlsRef.current.add(previewUrl);

    setRecentCaptures((current) => {
      const next = [
        { id: captureId, previewUrl, status: "pending" as const },
        ...current,
      ].slice(0, MAX_RECENT_CAPTURES);
      const keptIds = new Set(next.map((capture) => capture.id));

      current.forEach((capture) => {
        if (keptIds.has(capture.id)) {
          return;
        }

        URL.revokeObjectURL(capture.previewUrl);
        previewUrlsRef.current.delete(capture.previewUrl);
      });

      return next;
    });

    return captureId;
  }

  function queueUpload(blob: Blob) {
    if (!canCapture) {
      return;
    }

    const captureId = pushRecentCapture(blob);
    setPendingUploads((current) => current + 1);
    setStatus((current) =>
      current
        ? {
            ...current,
            photo_count: current.photo_count + 1,
            remaining: Math.max(current.remaining - 1, 0),
          }
        : current,
    );
    setMessage(null);

    void (async () => {
      try {
        const formData = new FormData();
        formData.append("photo", blob, `photo-${Date.now()}.jpg`);
        formData.append("device_id", getDeviceId());

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const data = (await response.json()) as UploadResult & { error?: string };

        if (!response.ok) {
          throw new Error(data.error ?? "Gagal mengunggah foto.");
        }

        updateRecentCaptureStatus(captureId, "saved");
        setStatus((current) =>
          current
            ? {
                ...current,
                photo_count: data.photo_count,
                remaining: data.remaining,
              }
            : current,
        );
        setMessage(
          data.remaining > 0
            ? `Foto tersimpan. ${data.remaining} foto tersisa.`
            : "Foto terakhir tersimpan. Kuota habis!",
        );
      } catch (uploadError) {
        updateRecentCaptureStatus(captureId, "failed");
        setStatus((current) =>
          current
            ? {
                ...current,
                photo_count: Math.max(current.photo_count - 1, 0),
                remaining: Math.min(current.remaining + 1, PHOTO_LIMIT),
              }
            : current,
        );
        setMessage(
          uploadError instanceof Error
            ? uploadError.message
            : "Gagal mengunggah foto.",
        );
      } finally {
        setPendingUploads((current) => Math.max(current - 1, 0));
      }
    })();
  }

  async function handleShutter() {
    const blob = await cameraRef.current?.capture();

    if (blob) {
      queueUpload(blob);
    }
  }

  function handleOpenRecentOrAlbum() {
    const latestCapture = recentCaptures[0];

    if (latestCapture) {
      setPreviewCapture(latestCapture);
      return;
    }

    router.push("/gallery");
  }

  if (loading) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-black text-white">
        <p className="text-sm text-white/60">Membuka kamera...</p>
      </div>
    );
  }

  return (
    <main className="relative flex h-[100dvh] flex-col overflow-hidden bg-black text-white">
      <header className="absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-black/80 to-transparent px-4 pb-8 pt-6">
        <div className="flex items-start justify-between gap-3">
          <Link
            href="/"
            className="rounded-full border border-white/20 px-3 py-1 text-xs text-white/80"
          >
            Kembali
          </Link>
          <div className="text-center">
            <h1 className="font-serif text-lg">{WEDDING_TITLE}</h1>
            <p className="mt-1 text-xs text-white/60">
              Halo, {status?.name}
            </p>
          </div>
          <Link
            href="/gallery"
            className="rounded-full border border-white/20 px-3 py-1 text-xs text-white/80"
          >
            Album
          </Link>
        </div>
      </header>

      <div className="relative flex-1">
        <CameraView
          ref={cameraRef}
          disabled={!canCapture}
          onCapture={(blob) => {
            if (canCapture) {
              queueUpload(blob);
            }
          }}
        />

        <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-8">
          <p className="text-center font-serif text-2xl leading-snug text-white/85 drop-shadow-lg">
            tiap orang cuman bisa foto {PHOTO_LIMIT} kali biar niat ✨✨
          </p>
        </div>
      </div>

      <footer className="relative z-20 bg-gradient-to-t from-black via-black/95 to-transparent px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-6">
        {recentCaptures.length > 0 ? (
          <div className="mx-auto mb-3 flex max-w-md gap-2 overflow-x-auto pb-1">
            {recentCaptures.map((capture) => (
              <div
                key={capture.id}
                className={`relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border ${
                  capture.status === "failed"
                    ? "border-rose-300/80"
                    : capture.status === "saved"
                      ? "border-white/35"
                      : "border-white/20"
                }`}
              >
                <img
                  src={capture.previewUrl}
                  alt="Capture terbaru"
                  className={`h-full w-full object-cover ${
                    capture.status === "failed" ? "opacity-50" : ""
                  }`}
                />
                {capture.status === "pending" ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/35">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-white/90" />
                  </div>
                ) : null}
                {capture.status === "failed" ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-rose-900/35 text-[10px] font-semibold text-rose-100">
                    Gagal
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        <div className="mx-auto flex max-w-md items-center justify-between">
          <div className="flex w-16 flex-col items-center">
            <span className="text-xs text-white/40">{remaining + 1}</span>
            <span className="text-3xl font-semibold">{remaining}</span>
            <span className="text-xs text-white/40">
              {Math.max(remaining - 1, 0)}
            </span>
            <span className="mt-1 text-[10px] uppercase tracking-widest text-white/45">
              tersisa
            </span>
          </div>

          <ShutterButton
            onClick={() => {
              void handleShutter();
            }}
            disabled={!canCapture}
            loading={pendingUploads > 0}
          />

          <div className="flex w-16 justify-end">
            <button
              type="button"
              onClick={handleOpenRecentOrAlbum}
              aria-label={
                recentCaptures[0]
                  ? "Lihat capture terbaru"
                  : "Buka album foto"
              }
              className="h-14 w-14 overflow-hidden rounded-xl border border-white/20"
            >
              {recentCaptures[0] ? (
                <img
                  src={recentCaptures[0].previewUrl}
                  alt="Capture terakhir"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-[10px] uppercase tracking-wider text-white/65">
                  Album
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="mx-auto mt-4 flex max-w-md items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => cameraRef.current?.flipCamera()}
            className="rounded-full border border-white/20 px-4 py-2 text-xs text-white/80 disabled:opacity-50"
          >
            Balik Kamera
          </button>

          {message ? (
            <p className="max-w-[16rem] text-right text-xs text-white/70">
              {message}
            </p>
          ) : (
            <p className="max-w-[16rem] text-right text-xs text-white/45">
              {pendingUploads > 0
                ? `${pendingUploads} foto sedang disimpan...`
                : `${remaining} foto tersisa`}
            </p>
          )}
        </div>
      </footer>

      {previewCapture ? (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/85 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-white/20 bg-black/90 p-3">
            <img
              src={previewCapture.previewUrl}
              alt="Preview capture terbaru"
              className="h-auto w-full rounded-xl object-cover"
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setPreviewCapture(null)}
                className="rounded-full border border-white/20 px-4 py-2 text-xs text-white/80"
              >
                Tutup
              </button>
              <Link
                href="/gallery"
                className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-black"
              >
                Buka Album
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
