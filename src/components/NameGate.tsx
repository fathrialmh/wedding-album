"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getDeviceId, getGuestName, setGuestName } from "@/lib/device";
import { PHOTO_LIMIT, WEDDING_SUBTITLE, WEDDING_TITLE } from "@/lib/constants";

export default function NameGate() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setName(getGuestName() ?? "");
      setHydrated(true);
    });

    return () => cancelAnimationFrame(frame);
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = name.trim();

    if (!trimmedName) {
      setError("Masukkan nama Anda terlebih dahulu.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/guest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          device_id: getDeviceId(),
        }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Gagal mendaftar tamu.");
      }

      setGuestName(trimmedName);
      router.push("/capture");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Terjadi kesalahan. Coba lagi.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <p className="text-sm text-white/60">Memuat...</p>
      </div>
    );
  }

  return (
    <main className="relative flex min-h-screen flex-col bg-black text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_55%)]" />

      <div className="relative z-10 flex flex-1 flex-col px-6 pb-10 pt-16">
        <div className="mx-auto w-full max-w-md flex-1">
          <p className="mb-3 text-center text-xs uppercase tracking-[0.35em] text-white/45">
            Wedding Album
          </p>
          <h1 className="font-serif text-center text-4xl leading-tight text-white">
            {WEDDING_TITLE}
          </h1>
          <p className="mt-4 text-center text-sm leading-relaxed text-white/65">
            {WEDDING_SUBTITLE}
          </p>

          <div className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
            <p className="text-center text-sm text-white/70">
              Tiap tamu hanya bisa foto{" "}
              <span className="font-semibold text-white">{PHOTO_LIMIT} kali</span>{" "}
              biar niat ✨
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm text-white/70">
                  Nama Anda
                </span>
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Contoh: Budi"
                  autoComplete="name"
                  className="w-full rounded-2xl border border-white/15 bg-black/40 px-4 py-3 text-white outline-none transition focus:border-white/40"
                />
              </label>

              {error ? (
                <p className="text-sm text-rose-300">{error}</p>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Menyimpan..." : "Mulai Ambil Foto"}
              </button>
            </form>
          </div>
        </div>

        <div className="mx-auto mt-8 w-full max-w-md">
          <Link
            href="/gallery"
            className="flex w-full items-center justify-center rounded-2xl border border-white/15 px-4 py-3 text-sm text-white/80 transition hover:border-white/30 hover:text-white"
          >
            Lihat Album Bersama
          </Link>
        </div>
      </div>
    </main>
  );
}
