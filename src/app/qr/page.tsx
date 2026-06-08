"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import { WEDDING_TITLE } from "@/lib/constants";

export default function QrPage() {
  const [qrState, setQrState] = useState<{
    url: string;
    dataUrl: string;
  } | null>(null);

  useEffect(() => {
    const url =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
      window.location.origin;

    void QRCode.toDataURL(url, {
      width: 320,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    }).then((dataUrl) => {
      setQrState({ url, dataUrl });
    });
  }, []);

  return (
    <main className="min-h-screen bg-white px-6 py-10 text-black">
      <div className="mx-auto max-w-md text-center">
        <p className="text-xs uppercase tracking-[0.35em] text-black/45">
          QR Code Acara
        </p>
        <h1 className="mt-3 font-serif text-3xl">{WEDDING_TITLE}</h1>
        <p className="mt-3 text-sm text-black/60">
          Cetak QR ini dan tempelkan di venue agar tamu bisa langsung membuka
          kamera dan berbagi momen.
        </p>

        <div className="mt-8 rounded-3xl border border-black/10 p-6 shadow-sm">
          {qrState ? (
            <img
              src={qrState.dataUrl}
              alt="QR code untuk wedding album"
              className="mx-auto h-80 w-80"
            />
          ) : (
            <div className="mx-auto flex h-80 w-80 items-center justify-center rounded-2xl bg-black/5">
              Membuat QR...
            </div>
          )}

          <p className="mt-4 break-all text-sm text-black/70">
            {qrState?.url ?? "..."}
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-2xl bg-black px-4 py-3 text-sm font-semibold text-white"
          >
            Cetak QR
          </button>
          <Link
            href="/"
            className="rounded-2xl border border-black/15 px-4 py-3 text-sm text-black/70"
          >
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    </main>
  );
}
