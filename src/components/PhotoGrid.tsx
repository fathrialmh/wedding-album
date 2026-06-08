"use client";

import LikeButton from "@/components/LikeButton";
import type { Photo } from "@/types";

type PhotoGridProps = {
  photos: Photo[];
  likingPhotoId: string | null;
  onSelect: (photo: Photo) => void;
  onLike: (photoId: string) => void;
};

export default function PhotoGrid({
  photos,
  likingPhotoId,
  onSelect,
  onLike,
}: PhotoGridProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
      {photos.map((photo) => (
        <div
          key={photo.id}
          role="button"
          tabIndex={0}
          onClick={() => onSelect(photo)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onSelect(photo);
            }
          }}
          className="group relative aspect-square cursor-pointer overflow-hidden rounded-2xl bg-zinc-900"
        >
          <img
            src={photo.public_url}
            alt={`Foto oleh ${photo.guest_name}`}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            loading="lazy"
          />

          <div className="absolute right-2 top-2">
            <LikeButton
              liked={photo.liked_by_me}
              count={photo.like_count}
              loading={likingPhotoId === photo.id}
              size="sm"
              onToggle={() => onLike(photo.id)}
            />
          </div>

          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 text-left">
            <p className="text-xs font-medium text-white">{photo.guest_name}</p>
            <p className="text-[10px] text-white/60">
              {new Date(photo.created_at).toLocaleString("id-ID", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
