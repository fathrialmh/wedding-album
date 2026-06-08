"use client";

import { useEffect } from "react";
import LikeButton from "@/components/LikeButton";
import type { Photo } from "@/types";

type LightboxProps = {
  photo: Photo;
  liking?: boolean;
  onClose: () => void;
  onLike: () => void;
};

export default function Lightbox({
  photo,
  liking = false,
  onClose,
  onLike,
}: LightboxProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4"
      onClick={onClose}
    >
      <div
        className="relative max-h-full w-full max-w-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-0 top-0 z-10 rounded-full bg-black/60 px-3 py-1 text-sm text-white"
        >
          Tutup
        </button>

        <img
          src={photo.public_url}
          alt={`Foto oleh ${photo.guest_name}`}
          className="max-h-[75vh] w-full rounded-2xl object-contain"
        />

        <div className="mt-4 flex items-center justify-between gap-4">
          <div>
            <p className="font-medium">{photo.guest_name}</p>
            <p className="text-sm text-white/60">
              {new Date(photo.created_at).toLocaleString("id-ID")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <LikeButton
              liked={photo.liked_by_me}
              count={photo.like_count}
              loading={liking}
              onToggle={onLike}
            />
            <a
              href={photo.public_url}
              download={`wedding-${photo.id}.jpg`}
              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black"
            >
              Unduh
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
