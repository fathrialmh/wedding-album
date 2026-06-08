import type { Photo } from "@/types";

type PhotoRow = {
  id: string;
  guest_id: string;
  guest_name: string;
  storage_path: string;
  public_url: string;
  created_at: string;
  photo_likes: { count: number }[];
};

export function mapPhotos(
  rows: PhotoRow[],
  likedPhotoIds: Set<string>,
): Photo[] {
  return rows.map((row) => ({
    id: row.id,
    guest_id: row.guest_id,
    guest_name: row.guest_name,
    storage_path: row.storage_path,
    public_url: row.public_url,
    created_at: row.created_at,
    like_count: row.photo_likes[0]?.count ?? 0,
    liked_by_me: likedPhotoIds.has(row.id),
  }));
}

export function updatePhotoLike(
  photos: Photo[],
  photoId: string,
  liked: boolean,
  likeCount: number,
): Photo[] {
  return photos.map((photo) =>
    photo.id === photoId
      ? { ...photo, liked_by_me: liked, like_count: likeCount }
      : photo,
  );
}
