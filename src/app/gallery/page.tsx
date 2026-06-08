"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Lightbox from "@/components/Lightbox";
import PhotoGrid from "@/components/PhotoGrid";
import { WEDDING_TITLE } from "@/lib/constants";
import { getDeviceId } from "@/lib/device";
import { mapPhotos, updatePhotoLike } from "@/lib/photos";
import { createBrowserClient } from "@/lib/supabase/client";
import type { LikeResult, Photo } from "@/types";

export default function GalleryPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [likingPhotoId, setLikingPhotoId] = useState<string | null>(null);

  useEffect(() => {
    async function loadPhotos() {
      try {
        const supabase = createBrowserClient();
        const deviceId = getDeviceId();

        const [photosResult, likesResult] = await Promise.all([
          supabase
            .from("photos")
            .select("*, photo_likes(count)")
            .order("created_at", { ascending: false }),
          supabase
            .from("photo_likes")
            .select("photo_id")
            .eq("device_id", deviceId),
        ]);

        if (photosResult.error) {
          throw photosResult.error;
        }

        if (likesResult.error) {
          throw likesResult.error;
        }

        const likedPhotoIds = new Set(
          (likesResult.data ?? []).map((like) => like.photo_id),
        );

        setPhotos(mapPhotos(photosResult.data ?? [], likedPhotoIds));
      } catch (loadError) {
        console.error(loadError);
        setError("Gagal memuat album.");
      } finally {
        setLoading(false);
      }
    }

    void loadPhotos();
  }, []);

  const handleLike = useCallback(async (photoId: string) => {
    if (likingPhotoId) {
      return;
    }

    setLikingPhotoId(photoId);

    const currentPhoto = photos.find((photo) => photo.id === photoId);
    if (!currentPhoto) {
      setLikingPhotoId(null);
      return;
    }

    const optimisticLiked = !currentPhoto.liked_by_me;
    const optimisticCount = Math.max(
      currentPhoto.like_count + (optimisticLiked ? 1 : -1),
      0,
    );

    setPhotos((current) =>
      updatePhotoLike(current, photoId, optimisticLiked, optimisticCount),
    );
    setSelectedPhoto((current) =>
      current?.id === photoId
        ? {
            ...current,
            liked_by_me: optimisticLiked,
            like_count: optimisticCount,
          }
        : current,
    );

    try {
      const response = await fetch("/api/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photo_id: photoId,
          device_id: getDeviceId(),
        }),
      });

      const data = (await response.json()) as LikeResult & { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Gagal memperbarui suka.");
      }

      setPhotos((current) =>
        updatePhotoLike(current, photoId, data.liked, data.like_count),
      );
      setSelectedPhoto((current) =>
        current?.id === photoId
          ? {
              ...current,
              liked_by_me: data.liked,
              like_count: data.like_count,
            }
          : current,
      );
    } catch (likeError) {
      console.error(likeError);
      setPhotos((current) =>
        updatePhotoLike(
          current,
          photoId,
          currentPhoto.liked_by_me,
          currentPhoto.like_count,
        ),
      );
      setSelectedPhoto((current) =>
        current?.id === photoId ? currentPhoto : current,
      );
    } finally {
      setLikingPhotoId(null);
    }
  }, [likingPhotoId, photos]);

  const totalLikes = photos.reduce((sum, photo) => sum + photo.like_count, 0);

  return (
    <main className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-black/90 px-4 py-5 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/45">
              Album Bersama
            </p>
            <h1 className="font-serif text-2xl">{WEDDING_TITLE}</h1>
            <p className="mt-1 text-sm text-white/60">
              {photos.length} momen · {totalLikes} suka
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/capture"
              className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-black"
            >
              Ambil Foto
            </Link>
            <Link
              href="/"
              className="rounded-full border border-white/20 px-4 py-2 text-xs text-white/80"
            >
              Beranda
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 py-6">
        {loading ? (
          <p className="text-sm text-white/60">Memuat album...</p>
        ) : error ? (
          <p className="text-sm text-rose-300">{error}</p>
        ) : photos.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/15 px-6 py-16 text-center">
            <p className="font-serif text-xl">Belum ada foto</p>
            <p className="mt-2 text-sm text-white/60">
              Jadilah tamu pertama yang mengabadikan momen.
            </p>
            <Link
              href="/capture"
              className="mt-6 inline-flex rounded-full bg-white px-5 py-2 text-sm font-semibold text-black"
            >
              Mulai Ambil Foto
            </Link>
          </div>
        ) : (
          <PhotoGrid
            photos={photos}
            likingPhotoId={likingPhotoId}
            onSelect={setSelectedPhoto}
            onLike={(photoId) => {
              void handleLike(photoId);
            }}
          />
        )}
      </section>

      {selectedPhoto ? (
        <Lightbox
          photo={selectedPhoto}
          liking={likingPhotoId === selectedPhoto.id}
          onClose={() => setSelectedPhoto(null)}
          onLike={() => {
            void handleLike(selectedPhoto.id);
          }}
        />
      ) : null}
    </main>
  );
}
