"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CameraView, { type CameraViewHandle } from "@/components/CameraView";
import ShutterButton from "@/components/ShutterButton";
import { PHOTO_LIMIT, WEDDING_TITLE } from "@/lib/constants";
import { getDeviceId, getGuestName } from "@/lib/device";
import type { GuestStatus, UploadResult } from "@/types";

export default function CapturePage() {
  const router = useRouter();
  const cameraRef = useRef<CameraViewHandle>(null);

  const [status, setStatus] = useState<GuestStatus | null>(null);
  const [lastPhotoUrl, setLastPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const remaining = status?.remaining ?? PHOTO_LIMIT;
  const canCapture = remaining > 0 && !uploading;

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

  async function uploadPhoto(blob: Blob) {
    if (!canCapture) {
      return;
    }

    setUploading(true);
    setMessage(null);

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

      setLastPhotoUrl(data.public_url);
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
      setMessage(
        uploadError instanceof Error
          ? uploadError.message
          : "Gagal mengunggah foto.",
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleShutter() {
    const blob = await cameraRef.current?.capture();

    if (blob) {
      await uploadPhoto(blob);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <p className="text-sm text-white/60">Membuka kamera...</p>
      </div>
    );
  }

  return (
    <main className="relative flex min-h-screen flex-col bg-black text-white">
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
              void uploadPhoto(blob);
            }
          }}
        />

        <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-8">
          <p className="text-center font-serif text-2xl leading-snug text-white/85 drop-shadow-lg">
            tiap orang cuman bisa foto {PHOTO_LIMIT} kali biar niat ✨✨
          </p>
        </div>
      </div>

      <footer className="relative z-20 bg-gradient-to-t from-black via-black/95 to-transparent px-4 pb-8 pt-10">
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
            loading={uploading}
          />

          <div className="flex w-16 justify-end">
            {lastPhotoUrl ? (
              <img
                src={lastPhotoUrl}
                alt="Foto terakhir"
                className="h-14 w-14 rounded-xl border border-white/20 object-cover"
              />
            ) : (
              <div className="h-14 w-14 rounded-xl border border-dashed border-white/20" />
            )}
          </div>
        </div>

        <div className="mx-auto mt-4 flex max-w-md items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => cameraRef.current?.flipCamera()}
            disabled={uploading}
            className="rounded-full border border-white/20 px-4 py-2 text-xs text-white/80 disabled:opacity-50"
          >
            Balik Kamera
          </button>

          {message ? (
            <p className="text-right text-xs text-white/70">{message}</p>
          ) : (
            <p className="text-right text-xs text-white/45">
              {remaining} foto tersisa
            </p>
          )}
        </div>
      </footer>
    </main>
  );
}
